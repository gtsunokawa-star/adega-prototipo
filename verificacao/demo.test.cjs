const test = require('node:test');
const assert = require('node:assert/strict');
const { gzipSync } = require('node:zlib');
const Engine = require('../src/engine.js');
const Demo = require('../src/demo.js');

const now = new Date(2026, 8, 24, 15, 30);
const states = {};
const cents = value => Math.round(value * 100);
const sum = (rows, key) => rows.reduce((total, row) => total + (row[key] || 0), 0);
const salesOf = state => state.movements.filter(m => m.type === 'sale');
function getState(profile) {
  if (!states[profile]) states[profile] = Demo.generate(profile, now);
  return states[profile];
}

test('cada perfil tem catálogo completo, datas preservadas e geração determinística', () => {
  for (const profile of ['bairro', 'premium']) {
    const state = getState(profile);
    assert.equal(state.origin, 'demo');
    assert.equal(state.profile, profile);
    assert.equal(state.spirits.length, profile === 'bairro' ? 10 : 14);
    assert.equal(state.drinks.length, 5);
    assert.equal(state.combos.length, 3);
    assert.equal(state.suppliers.length, 3);
    assert.equal(state.settings.counters, profile === 'bairro' ? 2 : 1);
    assert.equal(state.generatedUntil, now.toISOString());
    assert.ok(+now - +new Date(state.baseDate) >= 364 * 86400000);
    assert.ok(state.movements.some(m => m.type === 'initial'));
    assert.ok(state.movements.some(m => m.type === 'purchase'));
    assert.equal(JSON.stringify(Demo.generate(profile, now)), JSON.stringify(state));
  }
});

test('vendas saem do motor, conciliam seus componentes e nunca deixam estoque negativo', () => {
  for (const profile of ['bairro', 'premium']) {
    const state = getState(profile);
    let previousTime = -Infinity;
    const physical = value => {
      if ('closed' in value) {
        assert.ok(value.closed >= 0);
        assert.ok(value.open >= -1e-7);
      } else if ('stock' in value) assert.ok(value.stock >= -1e-7);
    };
    for (const movement of state.movements) {
      const time = +new Date(movement.at);
      assert.ok(time <= +now, 'movimento futuro');
      assert.ok(time >= +new Date(state.baseDate));
      assert.ok(time >= previousTime, 'movimentos fora da ordem cronológica');
      previousTime = time;
      assert.equal(movement.opDate, Engine.opDate(movement.at));
      if (movement.type === 'sale') {
        assert.equal(cents(sum(movement.lines, 'revenue')), cents(movement.revenue));
        assert.equal(cents(sum(movement.lines, 'cost')), cents(movement.cost));
        assert.equal(cents(sum(movement.lines, 'fee')), cents(movement.fee));
        assert.equal(cents(movement.fee), cents(movement.revenue * (movement.payment === 'cartao' ? .035 : 0)));
        for (const line of movement.lines) {
          assert.equal(cents(sum(line.components, 'revenue')), cents(line.revenue));
          assert.equal(cents(sum(line.components, 'cost')), cents(line.cost));
          assert.equal(cents(sum(line.components, 'fee')), cents(line.fee));
          assert.ok(line.components.every(c => c.qty > 0 && c.unitCost >= 0));
        }
        movement.after.forEach(physical);
      } else if (movement.after) physical(movement.after);
      for (const entry of movement.entries || []) if (entry.after) physical(entry.after);
    }
    state.spirits.concat(state.supplies).forEach(physical);
  }
});

test('faturamento, sazonalidade, pagamentos, balcões e madrugada compõem uma demo plausível', () => {
  for (const profile of ['bairro', 'premium']) {
    const state = getState(profile), sales = salesOf(state), months = {}, weekdays = {}, payments = {}, days = new Set();
    let afterMidnight = 0;
    for (const sale of sales) {
      const month = sale.opDate.slice(0, 7);
      months[month] = (months[month] || 0) + sale.revenue;
      payments[sale.payment] = (payments[sale.payment] || 0) + 1;
      const weekday = new Date(sale.opDate + 'T12:00:00').getDay();
      if (!weekdays[weekday]) weekdays[weekday] = { revenue: 0, dates: new Set() };
      weekdays[weekday].revenue += sale.revenue;
      weekdays[weekday].dates.add(sale.opDate);
      days.add(sale.opDate);
      if (new Date(sale.at).getHours() < 6) afterMidnight++;
    }
    // Exclude the two partial edge months of a rolling twelve-month history.
    for (const month of Object.keys(months).sort().slice(1, -1)) {
      const min = profile === 'bairro' ? 25000 : 60000, max = profile === 'bairro' ? 60000 : 150000;
      assert.ok(months[month] >= min && months[month] <= max, `${profile} ${month}: R$ ${months[month]}`);
    }
    assert.ok(afterMidnight > 300);
    assert.ok(days.size >= 360);
    for (const [payment, target] of [['pix', .5], ['cartao', .35], ['dinheiro', .15]]) assert.ok(Math.abs(payments[payment] / sales.length - target) < .04);
    const weekdayAverage = [1, 2, 3, 4].reduce((v, d) => v + weekdays[d].revenue / weekdays[d].dates.size, 0) / 4;
    assert.ok(weekdays[5].revenue / weekdays[5].dates.size > weekdayAverage * 1.25);
    assert.ok(weekdays[6].revenue / weekdays[6].dates.size > weekdayAverage * 1.5);
    if (profile === 'bairro') assert.ok(Math.abs(sales.filter(s => s.counter === 1).length / sales.length - .65) < .04);
    else assert.ok(sales.every(s => s.counter === 1));
    assert.ok(months['2025-12'] > months['2026-02'] * 1.15);
  }
});

test('contagens semanais incluem insumos, faltas concentradas, sobra e item sem contagem', () => {
  for (const profile of ['bairro', 'premium']) {
    const state = getState(profile), counts = state.movements.filter(m => m.type === 'count');
    assert.ok(counts.length >= 51 && counts.length <= 53);
    for (const count of counts) {
      const spiritShortages = count.entries.filter(e => e.kind === 'spirit' && e.shortage > 0);
      assert.equal(spiritShortages.length, 3);
      for (const entry of spiritShortages) {
        const ratio = entry.shortage / entry.theoretical;
        assert.ok(ratio >= .029 && ratio <= .071, `${entry.id}: ${ratio}`);
      }
      assert.ok(count.entries.some(e => e.kind === 'supply' && e.shortage > 0));
      assert.ok(count.entries.some(e => e.surplus > 0));
    }
    assert.equal(counts.at(-1).entries.filter(e => e.skip).length, 1);
    assert.ok(state.spirits.some(s => s.closed < s.min));
    const recentStart = +now - 30 * 86400000, consumed = {};
    for (const sale of salesOf(state).filter(s => +new Date(s.at) >= recentStart)) {
      for (const line of sale.lines) for (const component of line.components) consumed[component.id] = (consumed[component.id] || 0) + component.qty;
    }
    const slow = state.spirits.filter(s => Engine.stock(s) > 0 && (!consumed[s.id] || Engine.stock(s) / (consumed[s.id] / 30) > 90));
    assert.ok(slow.length >= 2);
    const monthVolumes = {};
    for (const sale of salesOf(state).filter(s => s.opDate.startsWith('2026-09'))) {
      for (const line of sale.lines) for (const component of line.components) monthVolumes[component.id] = (monthVolumes[component.id] || 0) + component.qty;
    }
    const rank = state.spirits.map(s => ({ id: s.id, qty: monthVolumes[s.id] || 0 })).sort((a, b) => b.qty - a.qty);
    assert.equal(rank[0].id, 'vodka-clara');
    assert.equal(rank.at(-1).id, 'gin-floral');
    assert.ok(rank.at(-2).qty > 0);
  }
});

test('início de mês e madrugada não inventam movimentos futuros ou contagens no novo mês', () => {
  for (const edge of [new Date(2026, 9, 1, 5, 59), new Date(2026, 9, 1, 6, 0), new Date(2027, 0, 1, 2, 0)]) {
    const state = Demo.generate('bairro', edge);
    assert.ok(state.movements.every(m => +new Date(m.at) <= +edge));
    if (edge.getHours() === 6) {
      assert.equal(state.movements.filter(m => m.opDate === '2026-10-01').length, 0);
    }
  }
});

test('histórico anual é compacto após compressão e não se atualiza por leitura', () => {
  for (const profile of ['bairro', 'premium']) {
    const state = getState(profile), json = JSON.stringify(state), before = state.movements.length;
    const compressedBytes = gzipSync(json).length;
    assert.ok(compressedBytes < 2 * 1024 * 1024, `${profile}: ${compressedBytes} bytes comprimidos`);
    Engine.stock(state.spirits[0]);
    assert.equal(state.movements.length, before);
    assert.equal(state.generatedUntil, now.toISOString());
  }
});
