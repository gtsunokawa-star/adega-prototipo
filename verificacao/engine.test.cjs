const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../src/engine.js');

const at = (day, hour = 12, minute = 0, month = 8, year = 2026) => new Date(year, month, day, hour, minute);
const initialAt = at(1, 6, 0, 7);
const copy = value => JSON.parse(JSON.stringify(value));
const cents = value => Math.round(value * 100);
const close = (actual, expected, epsilon = 1e-7) => assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
const product = (state, id) => state.spirits.concat(state.supplies).find(p => p.id === id);
const physical = state => state.spirits.concat(state.supplies).map(p => ({ id: p.id, closed: p.closed, open: p.open, stock: p.stock, cost: p.cost, rev: p._rev }));

function fixture(overrides = {}) {
  const s = E.createEmpty('bairro', initialAt);
  E.upsert(s, 'suppliers', { id: 'fornecedor', name: 'Fornecedor de teste', active: true }, initialAt);
  const spirits = [
    { id: 'vodka', name: 'Vodka de teste', type: 'vodka', volume: 1000, cost: .04, dosePrice: 10, bottlePrice: 100, min: 1, closed: 3, open: 100 },
    { id: 'whisky', name: 'Whisky de teste', type: 'whisky', volume: 1000, cost: .06, dosePrice: 20, bottlePrice: 150, min: 1, closed: 3, open: 500 }
  ];
  spirits.forEach(p => E.upsert(s, 'spirits', { ...p, supplierId: 'fornecedor', color: '#aa8844', active: true, ...(overrides[p.id] || {}) }, initialAt));
  [
    { id: 'energy', name: 'Energético de teste', unit: 'un', cost: 4, price: 10, stock: 30, min: 5 },
    { id: 'ice', name: 'Gelo de teste', unit: 'kg', cost: 2, price: 5, stock: 10, min: 2 },
    { id: 'beer', name: 'Cerveja de teste', unit: 'un', cost: 3, price: 6, stock: 40, min: 5 }
  ].forEach(p => E.upsert(s, 'supplies', { ...p, supplierId: 'fornecedor', active: true, ...(overrides[p.id] || {}) }, initialAt));
  E.upsert(s, 'drinks', { id: 'copao', name: 'Copão de teste', price: 24, components: [{ id: 'vodka', qty: 100 }, { id: 'energy', qty: 1 }, { id: 'ice', qty: .15 }], active: true }, initialAt);
  E.upsert(s, 'combos', { id: 'kit', name: 'Kit de teste', price: 180, items: [{ type: 'garrafa', id: 'whisky', qty: 1 }, { type: 'unidade', id: 'energy', qty: 4 }, { type: 'unidade', id: 'ice', qty: 2 }], active: true }, initialAt);
  return s;
}
function assertConservation(report) {
  for (const key of ['revenue', 'cost', 'grossMargin', 'fee', 'marginAfterFees']) {
    assert.equal(cents(report.items.reduce((sum, row) => sum + row[key], 0)), cents(report.totals[key]), `itens/${key}`);
    assert.equal(cents(report.components.reduce((sum, row) => sum + row[key], 0)), cents(report.totals[key]), `componentes/${key}`);
  }
  assert.equal(cents(report.payments.reduce((sum, row) => sum + row.fee, 0)), cents(report.totals.fee));
}

test('saldo inicial e custo médio ponderado correspondem ao custo de fornecedor', () => {
  const s = fixture({ vodka: { closed: 2, open: 500, cost: .06 } });
  const initial = s.movements.find(m => m.type === 'initial' && m.entries[0].id === 'vodka');
  assert.equal(initial.entries[0].qty, 2500);
  assert.equal(initial.entries[0].cost, 150);
  assert.ok(s.movements.every(m => m.type === 'initial'));
  assert.equal(E.report(s, { period: 'year', now: at(2) }).totals.revenue, 0);
  const weighted = fixture({ vodka: { closed: 0, open: 500, cost: .04 } });
  E.purchase(weighted, { id: 'vodka', qty: 1, total: 60, supplierId: 'fornecedor' }, at(2));
  assert.equal(E.stock(product(weighted, 'vodka')), 1500);
  close(product(weighted, 'vodka').cost, 80 / 1500);
  const before = JSON.stringify(weighted);
  assert.throws(() => E.upsert(weighted, 'spirits', { id: 'vodka', closed: 2 }, at(3)), /estoque/i);
  assert.equal(JSON.stringify(weighted), before);
  assert.throws(() => E.upsert(weighted, 'supplies', { id: 'sem-custo', name: 'Sem custo', unit: 'un', stock: 2, cost: null, active: true }, at(3)), /custo/i);
});

test('comanda com kit e drinks baixa todos os componentes, atravessa garrafa e concilia', () => {
  const s = fixture();
  const sale = E.sell(s, [{ type: 'combo', id: 'kit', qty: 1 }, { type: 'drink', id: 'copao', qty: 2 }], 'cartao', 2, at(3));
  assert.equal(sale.revenue, 228);
  assert.equal(sale.cost, 96.6);
  assert.equal(sale.fee, 7.98);
  assert.equal(sale.counter, 2);
  assert.equal(product(s, 'whisky').closed, 2);
  assert.equal(product(s, 'whisky').open, 500);
  assert.equal(product(s, 'vodka').closed, 2);
  assert.equal(product(s, 'vodka').open, 900);
  assert.equal(product(s, 'energy').stock, 24);
  close(product(s, 'ice').stock, 7.7);
  assert.equal(sale.lines[0].discount, 20);
  assertConservation(E.report(s, { period: 'month', now: at(4) }));
});

test('ruptura de um componente rejeita atomicamente toda a comanda', () => {
  const s = fixture({ energy: { stock: 5 } }), before = JSON.stringify(s);
  assert.throws(() => E.sell(s, [{ type: 'combo', id: 'kit', qty: 1 }, { type: 'drink', id: 'copao', qty: 2 }], 'pix', 1, at(3)), /Energético/);
  assert.equal(JSON.stringify(s), before);
});

test('rateio com custos zero consolida componentes e distribui centavos sem misturar unidades', () => {
  const s = fixture({ vodka: { cost: 0 }, energy: { cost: 0 }, ice: { cost: 0 } });
  E.upsert(s, 'drinks', { id: 'copao', price: 1.01, components: [
    { id: 'vodka', qty: 25 }, { id: 'vodka', qty: 75 }, { id: 'energy', qty: 1 }, { id: 'ice', qty: .15 }
  ] }, at(2));
  const sale = E.sell(s, [{ type: 'drink', id: 'copao', qty: 1 }], 'cartao', 1, at(3));
  assert.equal(sale.cost, 0);
  assert.equal(sale.lines[0].components.length, 3);
  assert.equal(sale.lines[0].components.find(c => c.id === 'vodka').qty, 100);
  assert.deepEqual(sale.lines[0].components.map(c => cents(c.revenue)).sort(), [33, 34, 34]);
  assertConservation(E.report(s, { now: at(4) }));
  const unknown = fixture({ vodka: { cost: null, closed: 0, open: 0 } });
  assert.throws(() => E.quote(unknown, [{ type: 'drink', id: 'copao', qty: 1 }]), /Informe o custo/);
});

test('taxas configuradas para Pix e dinheiro também entram no relatório e no estorno', () => {
  const s = fixture();
  s.settings.fees.pix = 2.5;
  s.settings.fees.dinheiro = 1;
  const pix = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'pix', 1, at(3));
  const cash = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'dinheiro', 1, at(3, 13));
  assert.equal(pix.fee, 2.5);
  assert.equal(cash.fee, 1);
  assert.equal(E.report(s, { now: at(4) }).totals.fee, 3.5);
  E.cancel(s, pix.id, { reason: 'Taxa Pix devolvida', feeReturned: true }, at(4));
  const report = E.report(s, { now: at(5) });
  assert.equal(report.totals.fee, 1);
  assert.equal(report.payments.find(p => p.id === 'pix').returnedFees, 2.5);
  assertConservation(report);
});

test('reserva de garrafa fechada impede seu uso simultâneo em dose ou combo', () => {
  for (const combo of [false, true]) {
    const s = fixture({ whisky: { closed: 1, open: 0 } }), before = JSON.stringify(s);
    const item = combo ? { type: 'combo', id: 'kit', qty: 1 } : { type: 'garrafa', id: 'whisky', qty: 1 };
    assert.throws(() => E.sell(s, [item, { type: 'dose', id: 'whisky', qty: 1 }], 'pix', 1, at(3)), /estoque insuficiente/i);
    assert.equal(JSON.stringify(s), before);
  }
});

test('baixa preserva sobra, não abre garrafa antes da demanda e desfazer repõe o estado exato', () => {
  const s = fixture({ vodka: { closed: 2, open: 50 } });
  const first = E.sell(s, [{ type: 'dose', id: 'vodka', qty: 1 }], 'pix', 1, at(3));
  assert.equal(product(s, 'vodka').closed, 2);
  assert.equal(product(s, 'vodka').open, 0);
  E.undo(s, first.id, new Date(+at(3) + 5000));
  assert.equal(product(s, 'vodka').closed, 2);
  assert.equal(product(s, 'vodka').open, 50);
  const before = physical(s), instant = at(3, 13);
  const sale = E.sell(s, [{ type: 'dose', id: 'vodka', qty: 22 }], 'cartao', 1, instant);
  assert.equal(product(s, 'vodka').closed, 0);
  assert.equal(product(s, 'vodka').open, 950);
  E.undo(s, sale.id, new Date(+instant + 4999));
  assert.deepEqual(physical(s), before);
  assert.equal(E.report(s, { now: at(4) }).totals.revenue, 0);
  assert.throws(() => E.undo(s, sale.id, new Date(+instant + 4999)), /já foi/i);
  const late = E.sell(s, [{ type: 'dose', id: 'vodka', qty: 1 }], 'pix', 1, at(4));
  assert.throws(() => E.undo(s, late.id, new Date(+at(4) + 5001)), /5 segundos/i);
});

test('preços, dose, ficha, custo posterior e inativação não reescrevem snapshots', () => {
  const s = fixture(), sale = E.sell(s, [{ type: 'combo', id: 'kit', qty: 1 }, { type: 'drink', id: 'copao', qty: 1 }], 'cartao', 1, at(3));
  const saved = JSON.stringify(sale), oldReport = E.report(s, { now: at(3, 18) });
  E.upsert(s, 'spirits', { id: 'whisky', dosePrice: 31, bottlePrice: 250 }, at(4));
  E.upsert(s, 'supplies', { id: 'energy', price: 14 }, at(4));
  E.upsert(s, 'drinks', { id: 'copao', price: 40, components: [{ id: 'vodka', qty: 50 }] }, at(4));
  E.upsert(s, 'combos', { id: 'kit', price: 240, items: [{ type: 'garrafa', id: 'whisky', qty: 1 }] }, at(4));
  E.purchase(s, { id: 'whisky', qty: 1, total: 100, supplierId: 'fornecedor' }, at(4));
  s.settings.dose = 30;
  E.deactivate(s, 'combos', 'kit');
  assert.equal(JSON.stringify(s.movements.find(m => m.id === sale.id)), saved);
  const report = E.report(s, { now: at(4, 18) });
  assert.deepEqual(report.totals, oldReport.totals);
  assert.equal(report.items.find(i => i.id === 'kit').discount, 20);
  assert.equal(report.items.find(i => i.id === 'kit').qty, 1);
  assertConservation(report);
});

test('contagem separa falta/sobra, inclui insumos, preserva skip e recontagem zera diferenças', () => {
  const s = fixture(), count = E.count(s, [
    { id: 'vodka', closed: 3, open: 0, reason: 'quebra' },
    { id: 'whisky', skip: true },
    { id: 'energy', qty: 28 },
    { id: 'ice', qty: 11 }
  ], at(4));
  const vodka = count.entries.find(e => e.id === 'vodka');
  assert.equal(vodka.shortage, 100);
  assert.equal(vodka.cost, 4);
  assert.equal(vodka.potential, 20);
  assert.equal(E.stock(product(s, 'whisky')), 3500);
  assert.equal(count.entries.find(e => e.id === 'whisky').skip, true);
  assert.equal(count.entries.find(e => e.id === 'ice').surplus, 1);
  const beforeSnapshot = JSON.stringify(count);
  E.upsert(s, 'spirits', { id: 'vodka', dosePrice: 30 }, at(5));
  E.purchase(s, { id: 'vodka', qty: 1, total: 80, supplierId: 'fornecedor' }, at(5));
  s.settings.dose = 30;
  assert.equal(JSON.stringify(s.movements.find(m => m.id === count.id)), beforeSnapshot);
  const losses = E.report(s, { now: at(5, 18) }).losses;
  assert.equal(losses.potential, 20);
  assert.equal(losses.cost, 12);
  assert.equal(losses.spiritCost, 4);
  assert.equal(losses.supplyCost, 8);
  assert.equal(losses.surplusCost, 2);
  const again = E.count(s, [{ id: 'energy', qty: 28 }, { id: 'ice', qty: 11 }, { id: 'vodka', closed: product(s, 'vodka').closed, open: product(s, 'vodka').open }], at(5, 19));
  assert.ok(again.entries.every(e => e.difference === 0));
  assert.equal(E.report(s, { counter: 1, now: at(5, 20) }).losses.cost, E.report(s, { counter: 2, now: at(5, 20) }).losses.cost);
});

test('cancelamento sem reposição preserva baixa e histórico, estorna comercial e mantém a taxa uma vez', () => {
  const s = fixture(), sale = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'cartao', 2, at(3));
  const original = JSON.stringify(sale), afterSale = physical(s);
  const beforeFailure = JSON.stringify(s);
  assert.throws(() => E.cancel(s, sale.id, { reason: ' ' }, at(4)), /motivo/);
  assert.equal(JSON.stringify(s), beforeFailure);
  const cancelled = E.cancel(s, sale.id, { reason: 'Produto já consumido' }, at(4));
  assert.equal(cancelled.fee, 0);
  assert.equal(cancelled.consumedCost, 40);
  assert.deepEqual(physical(s), afterSale);
  assert.equal(JSON.stringify(s.movements.find(m => m.id === sale.id)), original);
  const report = E.report(s, { now: at(5) });
  assert.equal(report.totals.revenue, 0);
  assert.equal(report.totals.cost, 0);
  assert.equal(report.totals.grossMargin, 0);
  assert.equal(report.totals.fee, 3.5);
  assert.equal(report.totals.marginAfterFees, -3.5);
  assert.equal(report.totals.cancelledConsumedCost, 40);
  assert.equal(report.totals.sales, 1);
  assert.equal(report.totals.cancellations, 1);
  assert.equal(E.report(s, { counter: 1, now: at(5) }).totals.cancellations, 0);
  assert.equal(E.report(s, { counter: 2, now: at(5) }).totals.cancellations, 1);
  assert.equal(report.losses.cost, 0);
  assertConservation(report);
  assert.throws(() => E.cancel(s, sale.id, { reason: 'Outra tentativa' }, at(5)), /já foi/i);
});

test('taxa devolvida usa snapshot original e estorno em outro mês não reescreve o mês da venda', () => {
  for (const feeReturned of [false, true]) {
    const s = fixture();
    const soldAt = at(31, 23, 30, 7), cancelAt = at(2, 12, 0, 8);
    const sale = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'cartao', 1, soldAt);
    const previous = E.report(s, { period: 'month', now: at(1, 5, 59, 8) });
    s.settings.fees.cartao = 5;
    E.upsert(s, 'spirits', { id: 'vodka', bottlePrice: 140 }, at(1, 12));
    const cancelled = E.cancel(s, sale.id, { reason: 'Cancelamento posterior', feeReturned }, cancelAt);
    assert.equal(cancelled.fee, feeReturned ? -3.5 : 0);
    assert.equal(cancelled.feeRefund, feeReturned ? 3.5 : 0);
    assert.deepEqual(E.report(s, { period: 'month', now: at(1, 5, 59, 8) }).totals, previous.totals);
    const september = E.report(s, { period: 'month', now: at(3) });
    assert.equal(september.totals.revenue, -100);
    assert.equal(september.totals.cost, -40);
    assert.equal(september.totals.fee, feeReturned ? -3.5 : 0);
    assert.equal(september.totals.sales, 0);
    assert.equal(september.totals.cancellations, 1);
    assert.ok(september.payments.every(p => p.share === null));
    assertConservation(september);
    const together = E.report(s, { period: 'quarter', now: at(3) });
    assert.equal(together.totals.fee, feeReturned ? 0 : 3.5);
    assertConservation(together);
  }
});

test('reposições selecionadas preservam compras posteriores e usam o custo histórico', () => {
  const s = fixture();
  const sale = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'pix', 1, at(3));
  E.purchase(s, { id: 'vodka', qty: 1, total: 80, supplierId: 'fornecedor' }, at(4));
  const stockBefore = E.stock(product(s, 'vodka')), costBefore = product(s, 'vodka').cost;
  E.cancel(s, sale.id, { reason: 'Garrafa lacrada devolvida', returns: [{ id: 'vodka', qty: 1000, closed: 1 }] }, at(5));
  assert.equal(E.stock(product(s, 'vodka')), stockBefore + 1000);
  assert.equal(product(s, 'vodka').closed, 4);
  close(product(s, 'vodka').cost, (stockBefore * costBefore + 40) / (stockBefore + 1000));
  assert.equal(E.report(s, { now: at(6) }).totals.cancelledConsumedCost, 0);
});

test('cancelamento após contagem exige conferência e não repõe nem consome novamente o que já voltou', () => {
  const s = fixture();
  const sale = E.sell(s, [{ type: 'drink', id: 'copao', qty: 1 }], 'pix', 1, at(3));
  const count = E.count(s, [{ id: 'vodka', closed: 3, open: 100 }, { id: 'energy', qty: 30 }, { id: 'ice', qty: 10 }], at(4));
  const originalCount = JSON.stringify(count), before = JSON.stringify(s), quantities = physical(s);
  assert.throws(() => E.cancel(s, sale.id, { reason: 'Não preparado', returns: [{ id: 'vodka', qty: 100 }] }, at(5)), /Confira o saldo físico/);
  assert.equal(JSON.stringify(s), before);
  const cancellation = E.cancel(s, sale.id, { reason: 'Não preparado, conferido no estoque', returns: [
    { id: 'vodka', qty: 100, countedClosed: 3, countedOpen: 100 },
    { id: 'energy', qty: 1, countedQty: 30 },
    { id: 'ice', qty: .15, countedQty: 10 }
  ] }, at(5));
  assert.deepEqual(physical(s).map(({ rev, ...p }) => p), quantities.map(({ rev, ...p }) => p));
  assert.ok(cancellation.entries.every(e => e.newEntryQty === 0 && e.reflectedQty === e.recoveredQty && e.consumedQty === 0));
  assert.equal(cancellation.consumedCost, 0);
  assert.equal(JSON.stringify(s.movements.find(m => m.id === count.id)), originalCount);
  const stats = E.inventoryStats(s, at(6));
  for (const id of ['vodka', 'energy', 'ice']) assert.equal(stats.byId[id].consumed, 0);
  assert.equal(E.report(s, { now: at(6) }).totals.consumedMl, 0);
  assert.equal(E.report(s, { now: at(6) }).totals.cancelledConsumedCost, 0);
});

test('dia operacional e períodos viram às 6h, inclusive mês e ano', () => {
  assert.equal(E.opDate(at(1, 2)), '2026-08-31');
  assert.equal(E.opDate(at(1, 5, 59)), '2026-08-31');
  assert.equal(E.opDate(at(1, 6)), '2026-09-01');
  assert.equal(E.opDate(at(1, 2, 0, 0, 2026)), '2025-12-31');
  assert.equal(E.periodRange('month', at(1, 5, 59)).from, '2026-08-01');
  assert.equal(E.periodRange('month', at(1, 6)).from, '2026-09-01');
  assert.equal(E.periodRange('year', at(31, 12, 0, 2)).from, '2025-03-31');
  const s = fixture();
  for (const [hour, minute] of [[2, 0], [5, 59], [6, 0]]) E.sell(s, [{ type: 'dose', id: 'vodka', qty: 1 }], 'pix', 1, at(1, hour, minute));
  const august = E.report(s, { period: 'day', now: at(1, 5, 59) }), september = E.report(s, { period: 'day', now: at(1, 6) });
  assert.equal(august.totals.sales, 2);
  assert.equal(august.totals.revenue, 20);
  assert.equal(september.totals.sales, 1);
  assert.equal(september.totals.revenue, 10);
  assert.equal(august.series[0].date, '2026-08-31');
  assert.equal(september.series[0].date, '2026-09-01');
});

test('ranking de margem usa reais, e dinheiro parado exclui saldo zero e cadastro recente', () => {
  const s = fixture({ vodka: { closed: 0, open: 0 }, whisky: { closed: 0, open: 0 } });
  E.upsert(s, 'spirits', { id: 'vodka', cost: .7, dosePrice: 100 }, at(2));
  E.upsert(s, 'spirits', { id: 'whisky', cost: .5, dosePrice: 125 }, at(2));
  E.purchase(s, { id: 'vodka', qty: 1, total: 700, supplierId: 'fornecedor' }, at(2));
  E.purchase(s, { id: 'whisky', qty: 1, total: 500, supplierId: 'fornecedor' }, at(2));
  // 20 doses × 50 ml cost R$ 700, sold for R$ 1.000: R$ 300 and 30%.
  E.upsert(s, 'spirits', { id: 'vodka', dosePrice: 50 }, at(2));
  E.sell(s, [{ type: 'dose', id: 'vodka', qty: 20 }], 'pix', 1, at(3));
  // One dose costs R$ 25, sold for R$ 125: R$ 100 and 80%.
  E.sell(s, [{ type: 'dose', id: 'whisky', qty: 1 }], 'pix', 1, at(3));
  const report = E.report(s, { now: at(4) });
  assert.equal(report.rankings.margin[0].id, 'vodka');
  assert.equal(report.rankings.margin[0].grossMargin, 300);
  assert.equal(report.rankings.margin[0].marginPct, 30);
  assert.equal(report.rankings.margin[1].grossMargin, 100);
  assert.equal(report.rankings.margin[1].marginPct, 80);
  E.upsert(s, 'supplies', { id: 'novo', name: 'Recém-cadastrado', unit: 'un', stock: 100, cost: 3, price: 6, min: 1, active: true }, at(4));
  const stats = E.inventoryStats(s, at(5));
  assert.equal(stats.byId.vodka.dead, false);
  assert.equal(stats.byId.novo.dead, false);
  assert.equal(stats.byId.novo.coverage, null);
});

test('importação valida estrutura, referências, números, taxas e clonagem independente', () => {
  const s = fixture();
  E.sell(s, [{ type: 'drink', id: 'copao', qty: 1 }], 'cartao', 1, at(3));
  assert.equal(E.validateState(s), true);
  const imported = E.validateImport(s);
  assert.deepEqual(imported, s);
  imported.spirits[0].name = 'Nome alterado';
  assert.notEqual(imported.spirits[0].name, s.spirits[0].name);
  for (const mutate of [
    x => { x.version = 2; },
    x => { x.spirits[0].closed = -1; },
    x => { x.settings.dose = 0; },
    x => { x.settings.fees.cartao = 101; },
    x => { x.drinks[0].components[0].id = 'inexistente'; },
    x => { x.movements.find(m => m.type === 'sale').lines[0].components[0].revenue += 1; },
    x => { x.spirits[0].cost = Infinity; },
    x => { x.constructor = {}; }
  ]) {
    const malformed = copy(s); mutate(malformed);
    assert.throws(() => E.validateImport(malformed));
  }
});

test('importação rejeita total de taxa adulterado que diverge do snapshot das linhas', () => {
  const s = fixture();
  const sale = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'cartao', 1, at(3));
  assert.equal(sale.fee, 3.5);
  s.movements.find(m => m.id === sale.id).fee = 99;
  assert.throws(() => E.validateImport(s), /taxa|totais|inconsistente/i);
});

test('importação rejeita data operacional que contradiz o horário real', () => {
  const s = fixture();
  const sale = E.sell(s, [{ type: 'dose', id: 'vodka', qty: 1 }], 'pix', 1, at(1, 2));
  assert.equal(sale.opDate, '2026-08-31');
  s.movements.find(m => m.id === sale.id).opDate = '2026-09-01';
  assert.throws(() => E.validateImport(s), /data|operacional/i);
});

test('cancelar uma dose não servida aceita o saldo físico anterior à abertura automática', () => {
  const s = fixture({ vodka: { closed: 5, open: 30 } });
  const sale = E.sell(s, [{ type: 'dose', id: 'vodka', qty: 1 }], 'pix', 1, at(3));
  assert.equal(product(s, 'vodka').closed, 4);
  assert.equal(product(s, 'vodka').open, 980);
  const before = JSON.stringify(s);
  assert.throws(() => E.cancel(s, sale.id, {
    reason: 'Dose não servida', returns: [{ id: 'vodka', qty: 50, countedClosed: 5, countedOpen: 40 }]
  }, at(4)), /distribuição física/);
  assert.equal(JSON.stringify(s), before);
  const cancellation = E.cancel(s, sale.id, {
    reason: 'Dose registrada por engano, nada foi servido',
    returns: [{ id: 'vodka', qty: 50, countedClosed: 5, countedOpen: 30 }]
  }, at(4));
  assert.equal(product(s, 'vodka').closed, 5);
  assert.equal(product(s, 'vodka').open, 30);
  assert.equal(E.stock(product(s, 'vodka')), 5030);
  assert.equal(cancellation.entries[0].newEntryQty, 50);
  assert.equal(cancellation.entries[0].recoveredLiquid, 50);
  assert.equal(cancellation.entries[0].recoveredClosed, 0);
  assert.equal(cancellation.consumedCost, 0);
  assert.equal(E.report(s, { now: at(5) }).totals.consumedMl, 0);
  assert.equal(E.validateState(s), true);
});

test('conferência de cancelamento não classifica a própria reposição como sobra', () => {
  for (const unexplainedSurplus of [0, 50]) {
    const s = fixture();
    const sale = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'cartao', 1, at(3));
    const generalCount = E.count(s, [{ id: 'vodka', closed: 2, open: 100 }], at(4));
    E.purchase(s, { id: 'vodka', qty: 1, total: 80, supplierId: 'fornecedor' }, at(4, 13));
    const cancellation = E.cancel(s, sale.id, {
      reason: 'Garrafa lacrada devolvida depois da contagem',
      returns: [{ id: 'vodka', qty: 1000, closed: 1, countedClosed: 4, countedOpen: 100 + unexplainedSurplus }]
    }, at(5));
    const confirmation = s.movements.find(m => m.type === 'count' && m.cancelId === cancellation.id);
    const entry = confirmation.entries[0];
    assert.equal(entry.theoretical, 4100, 'a entrada conhecida deve preceder a conferência');
    assert.equal(entry.counted, 4100 + unexplainedSurplus);
    assert.equal(entry.surplus, unexplainedSurplus);
    assert.equal(entry.shortage, 0);
    assert.equal(cancellation.entries[0].newEntryQty, 1000);
    assert.equal(cancellation.entries[0].reflectedQty, 0);
    assert.equal(E.stock(product(s, 'vodka')), 4100 + unexplainedSurplus);
    close(product(s, 'vodka').cost, 204 / 4100);
    close(entry.unitCost, 204 / 4100);
    const loss = E.report(s, { now: at(6) }).losses;
    assert.equal(loss.surplusCost, E.money(unexplainedSurplus * 204 / 4100));
    assert.equal(loss.latest.id, generalCount.id);
    assert.equal(loss.latestAt, generalCount.at);
    assert.equal(loss.items.find(item => item.id === 'vodka').latest.at, generalCount.at);
    assert.equal(E.validateState(s), true);
  }
});

test('cancelamento de venda fora dos 30 dias não reduz o consumo das vendas recentes', () => {
  for (const recentMl of [750, 3000]) {
    const opening = recentMl + 1000;
    const s = fixture({ vodka: { closed: Math.floor(opening / 1000), open: opening % 1000 } });
    const oldSale = E.sell(s, [{ type: 'garrafa', id: 'vodka', qty: 1 }], 'pix', 1, at(15, 12, 0, 7));
    E.sell(s, [{ type: 'dose', id: 'vodka', qty: recentMl / 50 }], 'pix', 1, at(10));
    assert.equal(E.stock(product(s, 'vodka')), 0);
    assert.equal(E.inventoryStats(s, at(24)).byId.vodka.consumed, recentMl);
    E.cancel(s, oldSale.id, {
      reason: 'Devolução de venda antiga',
      returns: [{ id: 'vodka', qty: 1000, closed: 1, countedClosed: 1, countedOpen: 0 }]
    }, at(24));
    const stock = E.inventoryStats(s, at(24, 13)).byId.vodka;
    assert.equal(stock.consumed, recentMl);
    close(stock.dailyConsumption, recentMl / 30);
    close(stock.coverage, 1000 / (recentMl / 30));
    assert.equal(stock.dead, false);
    assert.equal(stock.suggested, recentMl === 3000 ? 1 : 0);
    assert.equal(stock.lastSaleAt, at(10).toISOString());
  }
});

test('consumo recente desconta somente a recuperação da própria venda e preserva consumo parcial', () => {
  const s = fixture();
  const sale = E.sell(s, [{ type: 'dose', id: 'vodka', qty: 4 }], 'pix', 1, at(10));
  E.sell(s, [{ type: 'dose', id: 'vodka', qty: 1 }], 'pix', 1, at(12));
  const before = product(s, 'vodka');
  E.cancel(s, sale.id, {
    reason: 'Só uma dose permaneceu disponível',
    returns: [{ id: 'vodka', qty: 50, countedClosed: before.closed, countedOpen: before.open + 50 }]
  }, at(24));
  assert.equal(E.inventoryStats(s, at(24, 13)).byId.vodka.consumed, 200);
  assert.equal(E.report(s, { now: at(24, 13) }).totals.cancelledConsumedCost, 6);
});
