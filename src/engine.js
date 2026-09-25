(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AdegaEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const EPS = 1e-8, DAY = 86400000;
  const kinds = ['spirits', 'supplies', 'drinks', 'combos', 'suppliers'];
  const batches = new WeakSet();
  const clone = value => JSON.parse(JSON.stringify(value));
  const money = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const precise = n => Math.round(Number(n) * 1e9) / 1e9;
  function fail(message, code) { const e = new Error(message); e.code = code || 'VALIDATION'; throw e; }
  function number(value, name, min = 0) {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value)) || Number(value) < min) fail(name + ' inválido.');
    return Number(value);
  }
  function positive(value, name) { const n = number(value, name); if (n <= EPS) fail(name + ' deve ser maior que zero.'); return n; }
  function integer(value, name) { const n = number(value, name); if (!Number.isInteger(n)) fail(name + ' deve ser inteiro.'); return n; }
  function date(value) { const d = value === undefined ? new Date() : new Date(value); if (!Number.isFinite(+d)) fail('Data inválida.'); return d; }
  function iso(value) { return date(value).toISOString(); }
  function localDay(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function operational(value) { const d = date(value); if (d.getHours() < 6) d.setDate(d.getDate() - 1); return d; }
  function opDate(value) { return localDay(operational(value)); }
  function periodRange(period = 'month', now) {
    const end = date(now), start = operational(end);
    start.setHours(6, 0, 0, 0);
    if (period === 'day') {}
    else if (period === 'month') start.setDate(1);
    else {
      const months = { quarter: 3, semester: 6, year: 12 }[period];
      if (!months) fail('Período inválido.');
      const day = start.getDate(); start.setDate(1); start.setMonth(start.getMonth() - months);
      const last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
      start.setDate(Math.min(day, last));
    }
    return { period, start: start.toISOString(), end: end.toISOString(), from: opDate(start), to: opDate(end) };
  }
  function createEmpty(profile = 'bairro', now) {
    return { version: 1, profile, origin: 'proprio', baseDate: iso(now), generatedUntil: null,
      settings: { dose: 50, counters: profile === 'premium' ? 1 : 2, fees: { pix: 0, dinheiro: 0, cartao: 3.5 }, pin: '1234' },
      spirits: [], supplies: [], drinks: [], combos: [], suppliers: [], movements: [], revision: 0, sequence: 0 };
  }
  function draft(state) {
    const next = Object.assign({}, state, { settings: clone(state.settings), movements: state.movements.slice() });
    kinds.forEach(k => { next[k] = clone(state[k]); });
    return next;
  }
  function transaction(state, fn) {
    if (batches.has(state)) { const result = fn(state); state.revision = (state.revision || 0) + 1; return result; }
    const next = draft(state), result = fn(next);
    next.revision = (state.revision || 0) + 1;
    Object.assign(state, next);
    return result;
  }
  function batch(state, fn) {
    return transaction(state, next => { batches.add(next); try { return fn(next); } finally { batches.delete(next); } });
  }
  function uid(state, prefix, now) { state.sequence = (state.sequence || 0) + 1; return prefix + '-' + date(now).getTime().toString(36) + '-' + state.sequence.toString(36); }
  function movement(state, type, now, fields) {
    const m = Object.assign({ id: uid(state, type, now), type, at: iso(now), opDate: opDate(now) }, fields);
    state.movements.push(m); return m;
  }
  function stock(item) { return item && item.volume !== undefined ? precise(item.closed * item.volume + item.open) : Number(item && item.stock || 0); }
  function findProduct(state, id) { return state.spirits.find(x => x.id === id) || state.supplies.find(x => x.id === id); }
  function product(state, id, active = false) {
    const p = findProduct(state, id); if (!p || (active && p.active === false)) fail('Produto indisponível: ' + id + '.', 'UNAVAILABLE'); return p;
  }
  function costKnown(p) { return p.cost !== null && p.cost !== undefined && p.cost !== '' && Number.isFinite(Number(p.cost)) && Number(p.cost) >= 0; }
  function physical(p) { return p.volume !== undefined ? { closed: p.closed, open: p.open, cost: p.cost, rev: p._rev || 0 } : { stock: p.stock, cost: p.cost, rev: p._rev || 0 }; }
  function touch(p) { p._rev = (p._rev || 0) + 1; }
  function restorePhysical(p, saved) {
    if (p.volume !== undefined) { p.closed = saved.closed; p.open = saved.open; } else p.stock = saved.stock;
    p.cost = saved.cost; p._rev = saved.rev;
  }
  function ensureCost(p) { if (!costKnown(p)) fail('Informe o custo de ' + p.name + '.', 'COST_REQUIRED'); }
  function validPhysical(p, closed, open, qty) {
    if (p.volume !== undefined) {
      closed = integer(closed, 'Garrafas fechadas'); open = number(open, 'Volume na aberta');
      if (open > p.volume + EPS) fail('O volume aberto excede uma garrafa de ' + p.name + '.');
      return { closed, open: precise(open), qty: precise(closed * p.volume + open) };
    }
    return { qty: precise(number(qty, 'Quantidade')) };
  }
  function setPhysical(p, values) { if (p.volume !== undefined) { p.closed = values.closed; p.open = values.open; } else p.stock = values.qty; touch(p); }
  function relevant(m, id) {
    return m.refId === id || (m.entries || []).some(e => e.id === id && !e.skip) || (m.lines || []).some(l => l.components.some(c => c.id === id));
  }
  function hasHistory(state, id) { return state.movements.some(m => relevant(m, id)); }
  function allocate(amount, rows, weight) {
    const cents = Math.round(Math.abs(amount) * 100), sign = amount < 0 ? -1 : 1;
    if (!rows.length) return [];
    let weights = rows.map((r, i) => Math.max(0, Number(weight(r, i)) || 0));
    let total = weights.reduce((a, b) => a + b, 0);
    if (total <= EPS) { weights = rows.map(() => 1); total = rows.length; }
    const parts = weights.map((w, i) => { const exact = cents * w / total; return { i, value: Math.floor(exact + EPS), remainder: exact - Math.floor(exact + EPS), key: String(rows[i].id || i) }; });
    let left = cents - parts.reduce((a, p) => a + p.value, 0);
    const order = parts.slice().sort((a, b) => b.remainder - a.remainder || a.key.localeCompare(b.key));
    for (let i = 0; i < left; i++) order[i % order.length].value++;
    return parts.map(p => sign * p.value / 100);
  }
  function lookup(state, type, id) {
    const kind = { dose: 'spirits', garrafa: 'spirits', unidade: 'supplies', drink: 'drinks', combo: 'combos' }[type];
    if (!kind) fail('Tipo de venda inválido.');
    const item = state[kind].find(x => x.id === id);
    if (!item || item.active === false) fail('Item indisponível: ' + id + '.', 'UNAVAILABLE');
    const price = type === 'dose' ? item.dosePrice : type === 'garrafa' ? item.bottlePrice : item.price;
    if (!(Number(price) > 0)) fail('Informe o preço avulso de ' + item.name + '.', 'PRICE_REQUIRED');
    return { item, price: Number(price) };
  }
  function expand(state, type, id, qty, map, channel) {
    const found = lookup(state, type, id), p = found.item;
    if (type === 'combo') {
      if (!(p.items || []).length) fail('O combo precisa ter pelo menos um item.');
      p.items.forEach(child => { if (child.type === 'combo') fail('Um combo não pode conter outro combo.'); expand(state, child.type, child.id, qty * positive(child.qty, 'Quantidade do combo'), map, 'combo'); });
    } else if (type === 'drink') {
      if (!(p.components || []).length) fail('O drink precisa ter pelo menos um ingrediente.');
      p.components.forEach(child => addComponent(product(state, child.id, true), qty * positive(child.qty, 'Quantidade do ingrediente'), 0, channel || 'drink', map));
    } else if (type === 'dose') addComponent(p, qty * positive(state.settings.dose, 'Dose'), 0, channel || 'dose', map);
    else if (type === 'garrafa') { if (!Number.isInteger(qty)) fail('Garrafas vendidas devem ser inteiras.'); addComponent(p, qty * p.volume, qty, channel || 'garrafa', map); }
    else addComponent(p, qty, 0, channel || 'unidade', map);
    return found;
  }
  function addComponent(p, qty, closedQty, channel, map) {
    ensureCost(p);
    if (!map[p.id]) map[p.id] = { id: p.id, name: p.name, kind: p.volume !== undefined ? 'spirit' : 'supply', unit: p.volume !== undefined ? 'ml' : p.unit, volume: p.volume || null,
      qty: 0, closedQty: 0, liquidQty: 0, unitCost: Number(p.cost), channels: {} };
    const c = map[p.id]; c.qty = precise(c.qty + qty); c.closedQty += closedQty;
    if (p.volume !== undefined) c.liquidQty = precise(c.liquidQty + qty - closedQty * p.volume);
    c.channels[channel] = precise((c.channels[channel] || 0) + qty);
  }
  function quote(state, cart) {
    if (!Array.isArray(cart) || !cart.length) fail('Adicione pelo menos um item à comanda.', 'EMPTY_CART');
    const demands = {}, lines = cart.map(entry => {
      const qty = positive(entry.qty, 'Quantidade'), map = {}, found = expand(state, entry.type, entry.id, qty, map);
      const components = Object.values(map), revenue = money(found.price * qty);
      const exactCost = components.reduce((sum, c) => sum + c.qty * c.unitCost, 0), cost = money(exactCost);
      const allocatedRevenue = allocate(revenue, components, c => c.qty * c.unitCost), allocatedCost = allocate(cost, components, c => c.qty * c.unitCost);
      components.forEach((c, i) => {
        c.cost = allocatedCost[i]; c.revenue = allocatedRevenue[i]; c.fee = 0;
        if (!demands[c.id]) demands[c.id] = { id: c.id, qty: 0, closedQty: 0, liquidQty: 0 };
        ['qty', 'closedQty', 'liquidQty'].forEach(k => { demands[c.id][k] = precise(demands[c.id][k] + c[k]); });
      });
      let separatePrice = found.price;
      if (entry.type === 'combo') separatePrice = found.item.items.reduce((sum, x) => sum + lookup(state, x.type, x.id).price * x.qty, 0);
      return { type: entry.type, id: entry.id, name: found.item.name, qty, unitPrice: found.price, revenue, cost, fee: 0,
        grossMargin: money(revenue - cost), separatePrice: money(separatePrice), discount: entry.type === 'combo' ? money(separatePrice * qty - revenue) : 0,
        dose: Number(state.settings.dose), components };
    });
    Object.values(demands).forEach(d => {
      const p = product(state, d.id, true);
      if (p.volume !== undefined) {
        if (d.closedQty > p.closed || d.liquidQty > p.open + (p.closed - d.closedQty) * p.volume + EPS) fail('Estoque insuficiente de ' + p.name + '.', 'STOCK_SHORTAGE');
      } else if (d.qty > p.stock + EPS) fail('Estoque insuficiente de ' + p.name + '.', 'STOCK_SHORTAGE');
    });
    const revenue = money(lines.reduce((s, l) => s + l.revenue, 0)), cost = money(lines.reduce((s, l) => s + l.cost, 0));
    return { lines, demands: Object.values(demands), revenue, cost, grossMargin: money(revenue - cost), marginPct: revenue > 0 ? (revenue - cost) / revenue * 100 : null, fee: 0, total: revenue };
  }
  function consume(p, d) {
    if (p.volume === undefined) p.stock = precise(p.stock - d.qty);
    else {
      p.closed -= d.closedQty;
      let needed = d.liquidQty, fromOpen = Math.min(p.open, needed);
      p.open = precise(p.open - fromOpen); needed = precise(needed - fromOpen);
      if (needed > EPS) { const bottles = Math.ceil((needed - EPS) / p.volume); p.closed -= bottles; p.open = precise(bottles * p.volume - needed); }
    }
    touch(p);
  }
  function sell(state, cart, payment, counter = 1, now) {
    return transaction(state, s => {
      if (!['pix', 'dinheiro', 'cartao'].includes(payment)) fail('Escolha Pix, Dinheiro ou Cartão.');
      counter = integer(counter, 'Balcão'); if (counter < 1 || counter > s.settings.counters) fail('Balcão inválido.');
      const q = quote(s, cart), feePct = number(s.settings.fees[payment], 'Taxa');
      if (feePct > 100) fail('A taxa não pode exceder 100%.');
      const fee = money(q.revenue * feePct / 100), fees = allocate(fee, q.lines, l => l.revenue), before = [], after = [];
      q.lines.forEach((l, i) => { l.fee = fees[i]; const cf = allocate(l.fee, l.components, c => c.qty * c.unitCost); l.components.forEach((c, j) => { c.fee = cf[j]; }); });
      q.demands.forEach(d => { const p = product(s, d.id); before.push(Object.assign({ id: p.id }, physical(p))); consume(p, d); after.push(Object.assign({ id: p.id }, physical(p))); });
      return movement(s, 'sale', now, { counter, payment, feePct, lines: q.lines, revenue: q.revenue, cost: q.cost, fee, dose: Number(s.settings.dose), before, after });
    });
  }
  function saleById(state, id) { const sale = state.movements.find(m => m.id === id && m.type === 'sale'); if (!sale) fail('Venda não encontrada.'); return sale; }
  function alreadyReversed(state, id) { return state.movements.some(m => (m.type === 'cancel' || m.type === 'undo') && m.saleId === id); }
  function undo(state, saleId, now) {
    return transaction(state, s => {
      const sale = saleById(s, saleId), elapsed = +date(now) - +date(sale.at);
      if (elapsed < 0 || elapsed > 5000) fail('O prazo de 5 segundos terminou. O Dono pode cancelar pelo histórico.', 'UNDO_EXPIRED');
      if (alreadyReversed(s, saleId)) fail('Esta venda já foi desfeita ou cancelada.');
      sale.after.forEach(saved => {
        const current = physical(product(s, saved.id));
        if (Object.keys(current).some(k => current[k] !== saved[k])) fail('Houve outro movimento neste estoque. Use o cancelamento pelo histórico.', 'UNDO_CONFLICT');
      });
      sale.before.forEach(saved => restorePhysical(product(s, saved.id), saved));
      return movement(s, 'undo', now, { saleId, entries: sale.before.map(saved => ({ id: saved.id })) });
    });
  }
  function purchase(state, entry, now) {
    return transaction(state, s => {
      const p = product(s, entry.id, true), qty = positive(entry.qty, 'Quantidade'), total = number(entry.total, 'Custo total');
      if (p.volume !== undefined && !Number.isInteger(qty)) fail('A compra de garrafas fechadas deve ser inteira.');
      const supplierId = entry.supplierId || p.supplierId, supplier = s.suppliers.find(x => x.id === supplierId);
      if (!supplier) fail('Selecione o fornecedor da compra.');
      const before = physical(p), previous = stock(p), amount = p.volume !== undefined ? qty * p.volume : qty;
      if (previous > EPS) ensureCost(p);
      p.cost = (previous * (Number(p.cost) || 0) + total) / (previous + amount);
      if (p.volume !== undefined) p.closed += qty; else p.stock = precise(p.stock + qty);
      touch(p);
      return movement(s, 'purchase', now, { refId: p.id, name: p.name, qty, amount, total: money(total), supplierId, supplierName: supplier.name, before, after: physical(p) });
    });
  }
  function openBottle(state, id, now) {
    return transaction(state, s => {
      const p = product(s, id, true); if (p.volume === undefined) fail('Este item não é uma garrafa.');
      if (p.open > EPS) fail('A garrafa aberta ainda contém líquido.');
      if (p.closed < 1) fail('Não há garrafa fechada disponível.');
      const before = physical(p); p.closed--; p.open = p.volume; touch(p);
      return movement(s, 'open', now, { refId: p.id, before, after: physical(p) });
    });
  }
  function makeCount(s, entries, now, extra) {
    if (!Array.isArray(entries) || !entries.length) fail('Informe pelo menos um item da contagem.');
    const seen = new Set(), results = entries.map(entry => {
      if (seen.has(entry.id)) fail('Produto repetido na contagem.'); seen.add(entry.id);
      const p = product(s, entry.id), before = physical(p), theoretical = stock(p);
      if (entry.skip) return { id: p.id, name: p.name, skip: true, theoretical };
      const v = validPhysical(p, entry.closed, entry.open, entry.qty), difference = precise(theoretical - v.qty);
      if (v.qty > EPS || Math.abs(difference) > EPS) ensureCost(p);
      const unitCost = Number(p.cost) || 0, spirit = p.volume !== undefined;
      setPhysical(p, v);
      return { id: p.id, name: p.name, kind: spirit ? 'spirit' : 'supply', unit: spirit ? 'ml' : p.unit, volume: p.volume || null,
        skip: false, theoretical, counted: v.qty, difference, delta: precise(-difference), shortage: Math.max(0, difference), surplus: Math.max(0, -difference),
        cost: money(Math.max(0, difference) * unitCost), surplusCost: money(Math.max(0, -difference) * unitCost),
        potential: spirit ? money(Math.max(0, difference) / s.settings.dose * p.dosePrice) : 0,
        unitCost, dose: spirit ? Number(s.settings.dose) : null, dosePrice: spirit ? Number(p.dosePrice) : null,
        reason: entry.reason || '', before, after: physical(p) };
    });
    return movement(s, 'count', now, Object.assign({ entries: results }, extra || {}));
  }
  function count(state, entries, now) { return transaction(state, s => makeCount(s, entries, now)); }
  function saleComponents(sale) {
    const map = {};
    sale.lines.forEach(l => l.components.forEach(c => {
      if (!map[c.id]) map[c.id] = { id: c.id, name: c.name, qty: 0, closedQty: 0, liquidQty: 0, cost: 0, unitCost: c.unitCost, kind: c.kind, volume: c.volume };
      ['qty', 'closedQty', 'liquidQty', 'cost'].forEach(k => { map[c.id][k] = precise(map[c.id][k] + (c[k] || 0)); });
    }));
    return Object.values(map);
  }
  function cancel(state, saleId, options, now) {
    return transaction(state, s => {
      const sale = saleById(s, saleId), opts = options || {};
      if (alreadyReversed(s, saleId)) fail('Esta venda já foi desfeita ou cancelada.');
      if (+date(now) < +date(sale.at)) fail('O cancelamento não pode anteceder a venda.');
      const reason = String(opts.reason || '').trim(); if (!reason) fail('Informe o motivo do cancelamento.');
      const components = saleComponents(sale), requested = new Map();
      (opts.returns || []).forEach(r => {
        if (requested.has(r.id)) fail('Componente repetido na reposição.');
        if (!components.some(c => c.id === r.id)) fail('A reposição contém um componente que não foi vendido.');
        requested.set(r.id, r);
      });
      const cancelId = uid(s, 'cancel', now), saleIndex = s.movements.indexOf(sale), entries = [];
      components.forEach(c => {
        const p = product(s, c.id), r = requested.get(c.id) || { qty: 0 }, recovered = number(r.qty === undefined ? 0 : r.qty, 'Quantidade recuperada');
        if (recovered > c.qty + EPS) fail('Reposição superior à quantidade vendida de ' + p.name + '.');
        const before = physical(p), previousQty = stock(p);
        let newEntryQty = 0, reflectedQty = 0, countId = null;
        if (recovered > EPS) {
          const laterCount = s.movements.slice(saleIndex + 1).some(m => m.type === 'count' && m.entries.some(e => e.id === c.id && !e.skip));
          const hasCounted = p.volume !== undefined ? r.countedClosed !== undefined && r.countedOpen !== undefined : r.countedQty !== undefined;
          if (laterCount && !hasCounted) fail('Confira o saldo físico atual de ' + p.name + ': houve contagem após a venda.', 'COUNT_REQUIRED');
          if (laterCount) {
            const values = validPhysical(p, r.countedClosed, r.countedOpen, r.countedQty), delta = precise(values.qty - previousQty);
            newEntryQty = Math.min(recovered, Math.max(0, delta)); reflectedQty = precise(recovered - newEntryQty);
            // A known return is an entry, not an unexplained surplus. Count only the
            // remaining difference after that entry and its historical cost are applied.
            if (newEntryQty > EPS) {
              if (previousQty > EPS) ensureCost(p);
              const incomingQty = precise(previousQty + newEntryQty);
              p.cost = (previousQty * (Number(before.cost) || 0) + newEntryQty * c.unitCost) / incomingQty;
              if (p.volume !== undefined) {
                const closed = Math.min(values.closed, Math.floor(incomingQty / p.volume));
                setPhysical(p, validPhysical(p, closed, precise(incomingQty - closed * p.volume)));
              } else setPhysical(p, { qty: incomingQty });
            }
            const m = makeCount(s, [{ id: p.id, closed: values.closed, open: values.open, qty: values.qty, reason: 'Conferência de cancelamento' }], now, { cancelId });
            countId = m.id;
          } else {
            let values;
            if (p.volume !== undefined) {
              const returnedClosed = integer(r.closed === undefined ? 0 : r.closed, 'Garrafas lacradas devolvidas');
              if (returnedClosed > c.closedQty || returnedClosed * p.volume > recovered + EPS) fail('A quantidade de garrafas lacradas devolvidas é inválida.');
              if (hasCounted) {
                values = validPhysical(p, r.countedClosed, r.countedOpen);
                // A fresh physical count can reverse an opening recorded automatically
                // for a dose that was never served; it must reconcile the exact quantity.
                if (Math.abs(values.qty - previousQty - recovered) > EPS) fail('A distribuição física não corresponde à reposição declarada.');
              } else {
                const open = precise(p.open + recovered - returnedClosed * p.volume);
                if (open > p.volume + EPS) fail('Confira a distribuição atual entre garrafas fechadas e aberta de ' + p.name + '.', 'COUNT_REQUIRED');
                values = validPhysical(p, p.closed + returnedClosed, open);
              }
            } else values = { qty: precise(previousQty + recovered) };
            if (previousQty > EPS) ensureCost(p);
            p.cost = (previousQty * (Number(p.cost) || 0) + recovered * c.unitCost) / (previousQty + recovered);
            setPhysical(p, values); newEntryQty = recovered;
          }
        }
        const consumedQty = precise(c.qty - recovered);
        const recoveredClosed = p.volume !== undefined ? Math.min(c.closedQty, number(r.closed === undefined ? 0 : r.closed, 'Garrafas devolvidas')) : 0;
        const recoveredLiquid = p.volume !== undefined ? Math.min(c.liquidQty, Math.max(0, recovered - recoveredClosed * p.volume)) : 0;
        entries.push({ id: p.id, name: c.name, kind: c.kind, qty: recovered, recoveredQty: recovered, recoveredClosed, recoveredLiquid, newEntryQty, reflectedQty, consumedQty,
          unitCost: c.unitCost, consumedCost: money(c.cost * consumedQty / c.qty), countId, delta: precise(stock(p) - previousQty), before, after: physical(p) });
      });
      const feeReturned = opts.feeReturned === true;
      return movement(s, 'cancel', now, { id: cancelId, saleId, reason, counter: sale.counter, payment: sale.payment, feePct: sale.feePct,
        revenue: -sale.revenue, cost: -sale.cost, fee: feeReturned ? -sale.fee : 0, feeReturned, feeRefund: feeReturned ? sale.fee : 0,
        dose: sale.dose, lines: clone(sale.lines), entries, returns: entries, consumedCost: money(entries.reduce((sum, e) => sum + e.consumedCost, 0)) });
    });
  }
  function upsert(state, kind, input, now) {
    return transaction(state, s => {
      if (!kinds.includes(kind)) fail('Cadastro inválido.');
      const data = clone(input), id = data.id || uid(s, kind, now), index = s[kind].findIndex(x => x.id === id), old = index < 0 ? null : s[kind][index];
      if (!old && kinds.some(k => s[k].some(x => x.id === id))) fail('Identificador de cadastro já utilizado.');
      const item = Object.assign({}, old || {}, data, { id });
      item.name = String(item.name || '').trim(); if (!item.name) fail('Informe o nome.');
      item.active = item.active !== false;
      item.createdAt = old ? old.createdAt : iso(now);
      if (kind === 'spirits' || kind === 'supplies') {
        item.min = number(item.min === undefined ? 0 : item.min, 'Estoque mínimo');
        item.cost = item.cost === undefined || item.cost === '' || item.cost === null ? null : number(item.cost, 'Custo');
        if (kind === 'spirits') {
          item.volume = positive(item.volume, 'Volume da garrafa'); item.dosePrice = positive(item.dosePrice, 'Preço da dose');
          item.bottlePrice = item.bottlePrice === '' || item.bottlePrice === undefined || item.bottlePrice === null ? null : positive(item.bottlePrice, 'Preço da garrafa');
          item.closed = item.closed === undefined ? 0 : item.closed; item.open = item.open === undefined ? 0 : item.open;
          const values = validPhysical(item, item.closed, item.open); item.closed = values.closed; item.open = values.open;
          item.type = item.type || 'Destilado'; item.color = item.color || '#bb8d43';
        } else {
          if (!['un', 'kg'].includes(item.unit)) fail('Escolha a unidade un ou kg.');
          item.stock = number(item.stock === undefined ? 0 : item.stock, 'Quantidade');
          item.price = item.price === undefined || item.price === null || item.price === '' ? null : positive(item.price, 'Preço avulso');
        }
        if (old) {
          if ((hasHistory(s, id) || stock(old) > EPS) && (item.volume !== old.volume || item.unit !== old.unit)) fail('Cadastre outra apresentação para mudar volume ou unidade.');
          const stockChanged = kind === 'spirits' ? item.closed !== old.closed || item.open !== old.open : item.stock !== old.stock;
          if (stockChanged) fail('Use compra, contagem ou reposição para alterar o estoque.');
          if (stock(old) > EPS && item.cost !== old.cost) fail('O custo médio do estoque é atualizado pelas entradas de compra.');
        }
        if (stock(item) > EPS) ensureCost(item);
      } else if (kind === 'drinks') {
        item.price = positive(item.price, 'Preço do drink');
        if (!Array.isArray(item.components) || !item.components.length) fail('O drink precisa ter pelo menos um ingrediente.');
        item.components = item.components.map(c => { product(s, c.id, true); return { id: c.id, qty: positive(c.qty, 'Quantidade do ingrediente') }; });
      } else if (kind === 'combos') {
        item.price = positive(item.price, 'Preço do combo');
        if (!Array.isArray(item.items) || !item.items.length) fail('O combo precisa ter pelo menos um item.');
        item.items = item.items.map(c => { if (!['dose', 'garrafa', 'drink', 'unidade'].includes(c.type)) fail('Item inválido no combo.'); lookup(s, c.type, c.id); const qty = positive(c.qty, 'Quantidade do combo'); if (c.type === 'garrafa' && !Number.isInteger(qty)) fail('Garrafas do combo devem ser inteiras.'); return { type: c.type, id: c.id, qty }; });
      } else item.contact = String(item.contact || '');
      if (old) s[kind][index] = item; else s[kind].push(item);
      if (!old && (kind === 'spirits' || kind === 'supplies')) {
        item._rev = 0;
        movement(s, 'initial', now, { entries: [{ id, name: item.name, kind: kind === 'spirits' ? 'spirit' : 'supply', qty: stock(item), unitCost: item.cost, cost: money(stock(item) * (item.cost || 0)), after: physical(item) }] });
      }
      return item;
    });
  }
  function deactivate(state, kind, id) {
    return transaction(state, s => { if (!kinds.includes(kind)) fail('Cadastro inválido.'); const item = s[kind].find(x => x.id === id); if (!item) fail('Cadastro não encontrado.'); item.active = false; return item; });
  }
  function inRange(m, range) { return +date(m.at) >= +date(range.start) && +date(m.at) <= +date(range.end); }
  function baseTotals() { return { revenue: 0, cost: 0, grossMargin: 0, fee: 0, marginAfterFees: 0, marginPct: null, salesRevenue: 0, cancelledRevenue: 0, chargedFees: 0, returnedFees: 0,
    sales: 0, cancellations: 0, qty: 0, soldMl: 0, consumedMl: 0, bottles: 0, openBottleEquivalents: 0, doses: 0, discount: 0, cancelledConsumedCost: 0 }; }
  function row(id, name, extra) { return Object.assign(baseTotals(), { id, name, channels: { dose: 0, garrafa: 0, drink: 0, combo: 0, unidade: 0 }, usage: [] }, extra || {}); }
  function finalize(r) {
    ['revenue', 'cost', 'fee', 'salesRevenue', 'cancelledRevenue', 'chargedFees', 'returnedFees', 'discount', 'cancelledConsumedCost'].forEach(k => { r[k] = money(r[k] || 0); });
    r.grossMargin = money(r.revenue - r.cost); r.marginAfterFees = money(r.grossMargin - r.fee);
    r.marginPct = r.revenue > 0 ? r.grossMargin / r.revenue * 100 : null;
    r.margin = r.grossMargin; r.tax = r.fee; r.saleCount = r.sales; r.cancelCount = r.cancellations; r.closedBottles = r.bottles; r.doseEquivalent = r.doses;
    return r;
  }
  function lossesReport(state, range) {
    const counts = state.movements.filter(m => m.type === 'count' && inRange(m, range)), byId = {}, entries = [];
    counts.forEach(m => m.entries.forEach(e => {
      entries.push(Object.assign({ at: m.at, opDate: m.opDate, countId: m.id }, e));
      if (!byId[e.id]) byId[e.id] = { id: e.id, name: e.name, kind: e.kind || ((findProduct(state, e.id) || {}).volume !== undefined ? 'spirit' : 'supply'), shortage: 0, surplus: 0, cost: 0, potential: 0, surplusCost: 0, countCount: 0, latest: null };
      const r = byId[e.id];
      if (!m.cancelId) r.latest = Object.assign({ at: m.at, opDate: m.opDate }, e);
      if (!e.skip) { r.kind = e.kind; ['shortage', 'surplus', 'cost', 'potential', 'surplusCost'].forEach(k => { r[k] += e[k] || 0; }); r.countCount++; }
    }));
    const items = Object.values(byId), generalCounts = counts.filter(m => !m.cancelId), latest = generalCounts.length ? generalCounts[generalCounts.length - 1] : null;
    const sum = (key, kind) => money(items.filter(x => !kind || x.kind === kind).reduce((a, x) => a + x[key], 0));
    return { hasCounts: counts.some(c => c.entries.some(e => !e.skip)), countCount: counts.length, entries, items, byItem: items,
      potential: sum('potential'), revenue: sum('potential'), cost: sum('cost'), missingCost: sum('cost'), spiritCost: sum('cost', 'spirit'), supplyCost: sum('cost', 'supply'), surplusCost: sum('surplusCost'),
      latestAt: latest ? latest.at : null, latestEntries: latest ? latest.entries : [], latest };
  }
  function report(state, options = {}) {
    const range = periodRange(options.period || 'month', options.now), counter = options.counter === 'all' || options.counter === 'todos' || !options.counter ? null : Number(options.counter);
    const totals = baseTotals(), itemMap = {}, componentMap = {}, days = {}, payments = ['pix', 'dinheiro', 'cartao'].map(payment => Object.assign(row(payment, { pix: 'Pix', dinheiro: 'Dinheiro', cartao: 'Cartão' }[payment]), { payment, share: null, percent: null }));
    state.spirits.concat(state.supplies).forEach(p => { componentMap[p.id] = row(p.id, p.name, { kind: p.volume !== undefined ? 'spirit' : 'supply', active: p.active !== false, volume: p.volume || null, unit: p.volume !== undefined ? 'ml' : p.unit, hasMovement: false, _days: {} }); });
    const undone = new Set(state.movements.filter(m => m.type === 'undo' && +date(m.at) <= +date(range.end)).map(m => m.saleId));
    const events = state.movements.filter(m => ['sale', 'cancel'].includes(m.type) && !undone.has(m.type === 'sale' ? m.id : m.saleId) && inRange(m, range) && (!counter || m.counter === counter));
    events.forEach(m => {
      const sign = m.type === 'sale' ? 1 : -1, pay = payments.find(p => p.id === m.payment);
      if (!days[m.opDate]) days[m.opDate] = row(m.opDate, m.opDate, { date: m.opDate });
      const day = days[m.opDate];
      [totals, pay, day].forEach(r => {
        r.revenue += m.revenue; r.cost += m.cost; r.fee += m.fee;
        if (sign > 0) { r.sales++; r.salesRevenue += m.revenue; r.chargedFees += m.fee; }
        else { r.cancellations++; r.cancelledRevenue -= m.revenue; r.returnedFees -= m.fee; r.cancelledConsumedCost += m.consumedCost || 0; }
      });
      m.lines.forEach(l => {
        const key = l.type + ':' + l.id;
        if (!itemMap[key]) itemMap[key] = row(l.id, l.name, { key, type: l.type });
        const item = itemMap[key], itemFee = sign > 0 ? l.fee : (m.feeReturned ? -l.fee : 0);
        item.qty += sign * l.qty; item.revenue += sign * l.revenue; item.cost += sign * l.cost; item.fee += itemFee; item.discount += sign * (l.discount || 0);
        if (sign > 0) item.sales++; else item.cancellations++;
        totals.qty += sign * l.qty; totals.discount += sign * (l.discount || 0);
        l.components.forEach(c => {
          if (!componentMap[c.id]) componentMap[c.id] = row(c.id, c.name, { kind: c.kind, active: false, volume: c.volume, unit: c.unit, hasMovement: false, _days: {} });
          const r = componentMap[c.id]; r.hasMovement = true;
          r.qty += sign * c.qty; r.revenue += sign * c.revenue; r.cost += sign * c.cost; r.fee += sign > 0 ? c.fee : (m.feeReturned ? -c.fee : 0);
          if (!r._days[m.opDate]) r._days[m.opDate] = row(m.opDate, m.opDate, { date: m.opDate, label: m.opDate });
          r._days[m.opDate].revenue += sign * c.revenue; r._days[m.opDate].cost += sign * c.cost;
          r._days[m.opDate].fee += sign > 0 ? c.fee : (m.feeReturned ? -c.fee : 0);
          Object.keys(c.channels || {}).forEach(channel => { r.channels[channel] = precise((r.channels[channel] || 0) + sign * c.channels[channel]); });
          const usageKey = l.type + ':' + l.id; let usage = r.usage.find(u => u.key === usageKey);
          if (!usage) { usage = { key: usageKey, id: l.id, type: l.type, name: l.name, qty: 0, amount: 0 }; r.usage.push(usage); }
          usage.qty += sign * l.qty; usage.amount += sign * c.qty;
          if (sign > 0) r.sales++; else r.cancellations++;
          if (c.kind === 'spirit') {
            r.soldMl += sign * c.qty; r.bottles += sign * c.closedQty; r.doses += sign * c.qty / l.dose;
            totals.soldMl += sign * c.qty; totals.bottles += sign * c.closedQty; totals.doses += sign * c.qty / l.dose;
            if (sign > 0) { r.consumedMl += c.liquidQty; totals.consumedMl += c.liquidQty; r.openBottleEquivalents += c.liquidQty / c.volume; totals.openBottleEquivalents += c.liquidQty / c.volume; }
          }
        });
      });
      if (sign < 0) (m.entries || []).forEach(e => {
        const r = componentMap[e.id]; if (r) r.cancelledConsumedCost += e.consumedCost || 0;
        const original = saleComponents(m).find(c => c.id === e.id);
        if (r && original && original.kind === 'spirit') {
          const liquidRecovered = e.recoveredLiquid === undefined ? Math.min(original.liquidQty, e.recoveredQty || 0) : e.recoveredLiquid;
          r.consumedMl -= liquidRecovered; totals.consumedMl -= liquidRecovered;
          r.openBottleEquivalents -= liquidRecovered / original.volume; totals.openBottleEquivalents -= liquidRecovered / original.volume;
        }
      });
    });
    const components = Object.values(componentMap).map(c => { c.series = Object.keys(c._days).sort().map(d => finalize(c._days[d])); delete c._days; c.ml = c.kind === 'spirit' ? c.soldMl : 0; return finalize(c); });
    const items = Object.values(itemMap).map(finalize), series = Object.keys(days).sort().map(d => finalize(Object.assign(days[d], { label: d })));
    payments.forEach(p => { finalize(p); p.share = totals.salesRevenue > 0 ? p.salesRevenue / totals.salesRevenue * 100 : null; p.percent = p.share; p.cancelled = p.cancelledRevenue; });
    finalize(totals);
    const tie = (a, b) => b.revenue - a.revenue || a.name.localeCompare(b.name, 'pt-BR');
    const active = components.filter(c => c.kind === 'spirit' && c.active);
    const byVolume = active.slice().sort((a, b) => b.soldMl - a.soldMl || tie(a, b));
    const byMargin = active.slice().sort((a, b) => b.grossMargin - a.grossMargin || tie(a, b));
    const hasSales = active.some(x => x.hasMovement);
    return { range, totals, items, components, payments, series, losses: lossesReport(state, range), events,
      rankings: { volume: byVolume, margin: byMargin, most: hasSales ? byVolume[0] || null : null,
        least: hasSales ? active.slice().sort((a, b) => a.soldMl - b.soldMl || tie(a, b))[0] || null : null,
        bestMargin: byMargin.find(c => c.hasMovement) || null } };
  }
  function dayNumber(d) { return Date.parse(opDate(d) + 'T12:00:00Z') / DAY; }
  function inventoryStats(state, now) {
    const end = date(now), first = operational(end); first.setDate(first.getDate() - 29); first.setHours(6, 0, 0, 0);
    const undone = new Set(state.movements.filter(m => m.type === 'undo' && +date(m.at) <= +end).map(m => m.saleId));
    const cancelled = new Map(state.movements.filter(m => m.type === 'cancel' && +date(m.at) <= +end).map(m => [m.saleId, m]));
    const consumed = {}, last = {};
    state.movements.forEach(m => {
      if (+date(m.at) > +end || (m.type === 'sale' && undone.has(m.id))) return;
      if (m.type === 'sale') saleComponents(m).forEach(c => {
        const cancellation = cancelled.get(m.id), returned = cancellation && cancellation.entries.find(e => e.id === c.id);
        if (!returned || returned.consumedQty > EPS) last[c.id] = Math.max(last[c.id] || 0, +date(m.at));
        if (+date(m.at) >= +first) consumed[c.id] = (consumed[c.id] || 0) + Math.max(0, c.qty - (returned ? returned.recoveredQty : 0));
      });
    });
    const items = state.spirits.concat(state.supplies).map(p => {
      const qty = stock(p), used = Math.max(0, precise(consumed[p.id] || 0)), daily = used / 30;
      const initial = state.movements.find(m => m.type === 'initial' && m.entries.some(e => e.id === p.id));
      const createdAt = initial ? initial.at : (p.createdAt || state.baseDate), observedDays = Math.max(0, dayNumber(end) - dayNumber(createdAt));
      const sufficient = observedDays >= 30, coverage = sufficient ? (daily > EPS ? qty / daily : (qty > 0 ? Infinity : 0)) : null;
      const lastAt = last[p.id] ? new Date(last[p.id]).toISOString() : null;
      const daysWithoutSale = Math.max(0, dayNumber(end) - dayNumber(lastAt || createdAt));
      const dead = qty > EPS && (daysWithoutSale >= 30 || (coverage !== null && coverage > 90));
      const deficit = Math.max(0, daily * 14 - qty), spirit = p.volume !== undefined;
      const step = spirit || p.unit === 'un' ? 1 : (p.precision || 0.001);
      const suggested = spirit ? Math.ceil((deficit - EPS) / p.volume) : Math.ceil((deficit - EPS) / step) * step;
      return { id: p.id, name: p.name, kind: spirit ? 'spirit' : 'supply', active: p.active !== false, unit: spirit ? 'ml' : p.unit,
        stock: qty, qty, closed: spirit ? p.closed : null, open: spirit ? p.open : null, cost: p.cost, capital: costKnown(p) ? money(qty * p.cost) : null,
        availableDoses: spirit ? Math.floor((p.open + EPS) / state.settings.dose) : null, remainderMl: spirit ? precise(p.open % state.settings.dose) : null,
        consumed: used, consumption: used, dailyConsumption: daily, coverage, coverageDays: coverage, sufficientHistory: sufficient, observedDays, daysWithoutSale, lastSaleAt: lastAt,
        dead, deadStock: dead, stagnant: dead, reorder: spirit ? p.closed <= p.min : p.stock <= p.min, suggested: Math.max(0, precise(suggested)), suggestedQty: Math.max(0, precise(suggested)), supplierId: p.supplierId || null };
    });
    const groups = {};
    items.filter(i => i.active && (i.reorder || i.suggested > 0)).forEach(i => {
      const key = i.supplierId || 'none'; if (!groups[key]) groups[key] = { id: key, name: (state.suppliers.find(s => s.id === key) || { name: 'Fornecedor não informado' }).name, items: [] }; groups[key].items.push(i);
    });
    return { items, byId: Object.fromEntries(items.map(i => [i.id, i])), reorder: items.filter(i => i.active && i.reorder), dead: items.filter(i => i.active && i.dead),
      purchases: Object.values(groups), shoppingList: Object.values(groups), capital: money(items.reduce((sum, i) => sum + (i.capital || 0), 0)), from: first.toISOString(), to: end.toISOString() };
  }
  function validateState(state) {
    if (!state || typeof state !== 'object' || Array.isArray(state)) fail('Arquivo de perfil inválido.');
    function safe(value, depth) {
      if (depth > 60) fail('Arquivo com estrutura excessivamente profunda.');
      if (typeof value === 'number' && !Number.isFinite(value)) fail('Arquivo contém um número inválido.');
      if (value && typeof value === 'object') Object.keys(value).forEach(k => { if (['__proto__', 'prototype', 'constructor'].includes(k)) fail('Arquivo contém uma propriedade inválida.'); safe(value[k], depth + 1); });
      else if (!['string', 'number', 'boolean', 'undefined'].includes(typeof value) && value !== null) fail('Arquivo contém dado inválido.');
    }
    safe(state, 0);
    if (state.version !== 1 || !['bairro', 'premium'].includes(state.profile) || !['proprio', 'demo'].includes(state.origin)) fail('Versão ou perfil de arquivo não compatível.');
    iso(state.baseDate); if (state.generatedUntil !== null && state.generatedUntil !== undefined) iso(state.generatedUntil);
    kinds.concat('movements').forEach(k => { if (!Array.isArray(state[k])) fail('Lista ausente no arquivo: ' + k + '.'); });
    const settings = state.settings;
    if (!settings || ![30, 40, 50].includes(settings.dose) || ![1, 2].includes(settings.counters) || !settings.fees || typeof settings.pin !== 'string' || !/^\d{4,8}$/.test(settings.pin)) fail('Configurações inválidas no arquivo.');
    ['pix', 'dinheiro', 'cartao'].forEach(p => { if (number(settings.fees[p], 'Taxa') > 100) fail('Taxa inválida no arquivo.'); });
    const catalogIds = new Set();
    kinds.forEach(kind => state[kind].forEach(item => {
      if (!item || typeof item.id !== 'string' || !item.id || typeof item.name !== 'string' || !item.name.trim() || catalogIds.has(item.id) || typeof item.active !== 'boolean') fail('Cadastro inválido ou duplicado no arquivo.');
      catalogIds.add(item.id);
      if (kind === 'spirits' || kind === 'supplies') {
        number(item.min, 'Estoque mínimo');
        if (item.cost !== null && item.cost !== undefined) number(item.cost, 'Custo');
        if (item.supplierId && !state.suppliers.some(x => x.id === item.supplierId)) fail('Fornecedor inexistente no arquivo.');
        if (kind === 'spirits') { positive(item.volume, 'Volume'); positive(item.dosePrice, 'Preço da dose'); if (item.bottlePrice !== null && item.bottlePrice !== undefined) positive(item.bottlePrice, 'Preço da garrafa'); validPhysical(item, item.closed, item.open); }
        else { if (!['un', 'kg'].includes(item.unit)) fail('Unidade inválida.'); validPhysical(item, null, null, item.stock); if (item.price !== null && item.price !== undefined) positive(item.price, 'Preço avulso'); }
        if (stock(item) > EPS) ensureCost(item);
      } else if (kind === 'drinks') {
        positive(item.price, 'Preço do drink'); if (!Array.isArray(item.components) || !item.components.length) fail('Ficha de drink vazia.');
        item.components.forEach(c => { product(state, c.id); positive(c.qty, 'Quantidade da ficha'); });
      } else if (kind === 'combos') {
        positive(item.price, 'Preço do combo'); if (!Array.isArray(item.items) || !item.items.length) fail('Ficha de combo vazia.');
        item.items.forEach(c => { const kindRef = { drink: 'drinks', dose: 'spirits', garrafa: 'spirits', unidade: 'supplies' }[c.type]; if (!kindRef || !state[kindRef].some(x => x.id === c.id)) fail('Referência inválida no combo.'); positive(c.qty, 'Quantidade do combo'); });
      }
    }));
    const movementIds = new Set(), sales = new Map(), reversed = new Set();
    state.movements.forEach(m => {
      if (!m || typeof m.id !== 'string' || !m.id || movementIds.has(m.id) || !['initial', 'purchase', 'sale', 'undo', 'cancel', 'count', 'open'].includes(m.type)) fail('Movimento inválido ou duplicado no arquivo.');
      movementIds.add(m.id); if (typeof m.at !== 'string') fail('Data de movimento inválida.'); iso(m.at);
      if (typeof m.opDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(m.opDate) || m.opDate !== opDate(m.at)) fail('Data operacional inválida.');
      if (['initial', 'count', 'cancel', 'undo'].includes(m.type) && !Array.isArray(m.entries)) fail('Movimento sem componentes.');
      (m.entries || []).forEach(e => { product(state, e.id); if (!e.skip && m.type === 'count') { number(e.counted, 'Quantidade contada'); number(e.theoretical, 'Saldo teórico'); number(e.cost, 'Custo faltante'); number(e.surplusCost, 'Custo da sobra'); } });
      if (m.type === 'purchase' || m.type === 'open') product(state, m.refId);
      if (m.type === 'purchase') { positive(m.qty, 'Quantidade comprada'); positive(m.amount, 'Entrada comprada'); number(m.total, 'Custo da compra'); if (!state.suppliers.some(x => x.id === m.supplierId)) fail('Compra sem fornecedor válido.'); }
      if (m.type === 'sale' || m.type === 'cancel') {
        if (![1, 2].includes(m.counter) || !['pix', 'dinheiro', 'cartao'].includes(m.payment) || !Array.isArray(m.lines) || !m.lines.length) fail('Venda inválida no arquivo.');
        ['revenue', 'cost', 'fee'].forEach(k => { if (!Number.isFinite(m[k])) fail('Valor inválido na venda.'); });
        if (m.type === 'sale' && (m.revenue <= 0 || m.cost < 0 || m.fee < 0)) fail('Valores de venda inválidos.');
        m.lines.forEach(l => {
          if (!['dose', 'garrafa', 'drink', 'combo', 'unidade'].includes(l.type) || !catalogIds.has(l.id) || typeof l.name !== 'string') fail('Item de venda inválido.');
          positive(l.qty, 'Quantidade vendida'); positive(l.dose, 'Dose histórica');
          ['revenue', 'cost', 'fee'].forEach(k => number(l[k], 'Valor histórico'));
          if (!Array.isArray(l.components) || !l.components.length) fail('Venda sem snapshot de componentes.');
          l.components.forEach(c => {
            product(state, c.id); positive(c.qty, 'Quantidade do componente'); number(c.unitCost, 'Custo histórico');
            ['cost', 'revenue', 'fee', 'closedQty', 'liquidQty'].forEach(k => number(c[k], 'Valor do componente'));
            if (!['spirit', 'supply'].includes(c.kind) || !c.channels || typeof c.channels !== 'object') fail('Snapshot inválido.');
            if (c.kind === 'spirit') { positive(c.volume, 'Volume histórico'); if (Math.abs(c.qty - c.closedQty * c.volume - c.liquidQty) > EPS) fail('Quantidade inconsistente no snapshot.'); }
          });
          ['revenue', 'cost', 'fee'].forEach(k => { if (Math.abs(l[k] - l.components.reduce((sum, c) => sum + c[k], 0)) > 0.011) fail('Rateio inconsistente no arquivo.'); });
        });
        const sign = m.type === 'sale' ? 1 : -1;
        (m.type === 'sale' ? ['revenue', 'cost', 'fee'] : ['revenue', 'cost']).forEach(k => { if (Math.abs(m[k] - sign * m.lines.reduce((sum, l) => sum + l[k], 0)) > 0.011) fail('Totais inconsistentes no arquivo.'); });
        if (m.type === 'sale') { sales.set(m.id, m); if (!Array.isArray(m.before) || !Array.isArray(m.after)) fail('Venda sem snapshot de estoque.'); }
      }
      if (m.type === 'cancel' || m.type === 'undo') {
        const sale = sales.get(m.saleId);
        if (!sale || reversed.has(m.saleId) || +date(m.at) < +date(sale.at)) fail('Estorno sem venda válida ou duplicado.');
        reversed.add(m.saleId);
        if (m.type === 'cancel') {
          if (typeof m.reason !== 'string' || !m.reason.trim() || typeof m.feeReturned !== 'boolean' || Math.abs(m.fee - (m.feeReturned ? -sale.fee : 0)) > 0.001) fail('Cancelamento inválido.');
          m.entries.forEach(e => { const c = saleComponents(sale).find(x => x.id === e.id); if (!c || number(e.recoveredQty, 'Reposição') > c.qty + EPS || Math.abs(e.recoveredQty - e.newEntryQty - e.reflectedQty) > EPS || Math.abs(e.consumedQty + e.recoveredQty - c.qty) > EPS) fail('Reposição inconsistente.'); });
        }
      }
    });
    return true;
  }
  function validateImport(candidate) { validateState(candidate); return clone(candidate); }
  return { createEmpty, stock, opDate, periodRange, quote, sell, undo, purchase, openBottle, count, cancel, upsert, deactivate, report, inventoryStats, batch, validateState, validateImport, money };
});
