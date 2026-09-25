/* AdegaControl: deterministic demonstration data, always produced by the ledger engine. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./engine.js'));
  else root.AdegaDemo = factory(root.AdegaEngine);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (Engine) {
  'use strict';

  function mulberry32(seed) {
    return function () {
      var t = seed += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function round(value, places) { var p = Math.pow(10, places == null ? 2 : places); return Math.round((value + Number.EPSILON) * p) / p; }
  function dateAt(day, hour) { var d = new Date(day); d.setHours(0, 0, 0, 0); d.setMinutes(Math.round(hour * 60)); return d; }
  function operationalStart(now) { var d = new Date(now); if (d.getHours() < 6) d.setDate(d.getDate() - 1); d.setHours(6, 0, 0, 0); return d; }

  function catalog(premium) {
    // Marcas e apresentações reais; custos, preços e fichas são exemplos da demo,
    // não cotações de varejo nem receitas oficiais dos fabricantes.
    var multiplier = premium ? 2 : 1;
    var costMultiplier = premium ? 1.05 : 1;
    var bottleMultiplier = premium ? 1.35 : 1;
    var base = [
      ['vodka-clara', 'Smirnoff No. 21', 'vodka', 998, 45, 10, 70, 5, 'norte', '#c7383a'],
      ['gin-botanico', 'Gin Rock’s', 'gin', 1000, 28, 7, 45, 3, 'norte', '#3e7e6f'],
      ['whisky-ambar', 'Ballantine’s Finest', 'whisky', 1000, 70, 12, 105, 4, 'reserva', '#d5b675'],
      ['cachaca-serra', 'Cachaça 51', 'cachaça', 965, 13, 4, 20, 3, 'norte', '#caa92e'],
      ['rum-dourado', 'Cachaça Corote', 'cachaça', 500, 4, 2, 7, 2, 'norte', '#c89035'],
      ['whisky-reserva', 'Jack Daniel’s Old No. 7', 'whisky', 1000, 130, 20, 185, 2, 'reserva', '#676b6e'],
      ['tequila-sol', 'Johnnie Walker Red Label', 'whisky', 750, 80, 12, 115, 2, 'reserva', '#ba3d35'],
      ['licor-cafe', 'White Horse', 'whisky', 1000, 68, 10, 95, 2, 'reserva', '#e7cf97'],
      ['conhaque-noite', 'Dreher', 'conhaque', 900, 15, 4, 25, 2, 'reserva', '#9b4928'],
      ['gin-floral', 'Gordon’s London Dry Gin', 'gin', 750, 55, 12, 85, 2, 'reserva', '#629747']
    ];
    if (premium) base = base.concat([
      ['vodka-cristal', 'Absolut Vodka', 'vodka', 1000, 90, 15, 125, 2, 'reserva', '#669dc2'],
      ['whisky-turfa', 'Chivas Regal 12 Anos', 'whisky', 1000, 150, 28, 210, 2, 'reserva', '#b99465'],
      ['rum-reserva', 'Jack Daniel’s Tennessee Honey', 'licor de whisky', 1000, 140, 24, 195, 2, 'reserva', '#dda93f'],
      ['tequila-prata', 'Beefeater London Dry Gin', 'gin', 750, 95, 18, 135, 2, 'reserva', '#c94e4f']
    ]);
    var spirits = base.map(function (x, i) {
      return { id: x[0], name: x[1], type: x[2], volume: x[3], cost: round(x[4] * costMultiplier / x[3], 8), dosePrice: round(x[5] * multiplier), bottlePrice: round(x[6] * bottleMultiplier), min: x[7], supplierId: x[8], color: x[9], active: true, closed: i === 9 ? 1 : (i === 8 ? 14 : (i < 3 ? 18 : 8)), open: i === 9 ? 0 : 250 };
    });
    var supplyRows = [
      ['energetico', 'Energético · lata', 'un', 4.8, 10, 180, 24],
      ['tonica', 'Água tônica · lata', 'un', 3.2, 7, 120, 18],
      ['gelo', 'Gelo', 'kg', 2, 5, 100, 12],
      ['limao', 'Limão', 'un', 0.6, 1.5, 160, 20],
      ['acucar', 'Açúcar', 'kg', 4.5, 8, 20, 3],
      ['creme', 'Copo descartável · 700 ml', 'un', .55, 1, 300, 50],
      ['cerveja', 'Cerveja pilsen · lata', 'un', 3.1, 6, 400, 48]
    ];
    var supplies = supplyRows.map(function (x) { return { id: x[0], name: x[1], unit: x[2], cost: round(x[3] * costMultiplier), price: round(x[4] * (premium ? 1.4 : 1)), stock: x[5], min: x[6], supplierId: 'abastece', active: true }; });
    function component(id, qty) { return { id: id, qty: qty }; }
    var drinks = [
      { id: 'copao-vodka', name: 'Copão de Smirnoff', price: 22, components: [component('vodka-clara', 100), component('energetico', 1), component('gelo', .15), component('creme', 1)] },
      { id: 'copao-gin', name: 'Copão de Gin Rock’s', price: 20, components: [component('gin-botanico', 75), component('energetico', 1), component('gelo', .15), component('creme', 1)] },
      { id: 'caipirinha', name: 'Caipirinha de 51', price: 15, components: [component('cachaca-serra', 75), component('limao', 1), component('acucar', .025), component('gelo', .12), component('creme', 1)] },
      { id: 'whisky-energetico', name: 'Copão de Ballantine’s', price: 25, components: [component('whisky-ambar', 75), component('energetico', 1), component('gelo', .15), component('creme', 1)] },
      { id: 'batida', name: 'Copão de Jack Daniel’s', price: 35, components: [component('whisky-reserva', 75), component('energetico', 1), component('gelo', .15), component('creme', 1)] }
    ].map(function (item) { item.price = round(item.price * multiplier); item.active = true; return item; });
    var combos = premium ? [
      { id: 'degustacao', name: 'Trio Ballantine’s, Jack e Chivas', price: 110, items: [{ type: 'dose', id: 'whisky-ambar', qty: 1 }, { type: 'dose', id: 'whisky-reserva', qty: 1 }, { type: 'dose', id: 'whisky-turfa', qty: 1 }] },
      { id: 'kit-gin', name: 'Kit Beefeater + Tônicas', price: 205, items: [{ type: 'garrafa', id: 'tequila-prata', qty: 1 }, { type: 'unidade', id: 'tonica', qty: 4 }, { type: 'unidade', id: 'gelo', qty: 1 }] },
      { id: 'trio-vodka', name: '3 Copões de Smirnoff', price: 120, items: [{ type: 'drink', id: 'copao-vodka', qty: 3 }] }
    ] : [
      { id: 'trio-vodka', name: '3 Copões de Smirnoff', price: 60, items: [{ type: 'drink', id: 'copao-vodka', qty: 3 }] },
      { id: 'kit-whisky', name: 'Kit Ballantine’s', price: 139, items: [{ type: 'garrafa', id: 'whisky-ambar', qty: 1 }, { type: 'unidade', id: 'energetico', qty: 4 }, { type: 'unidade', id: 'gelo', qty: 2 }] },
      { id: 'kit-gin', name: 'Kit Gin Rock’s', price: 85, items: [{ type: 'garrafa', id: 'gin-botanico', qty: 1 }, { type: 'unidade', id: 'energetico', qty: 4 }, { type: 'unidade', id: 'gelo', qty: 1 }] }
    ];
    combos.forEach(function (item) { item.active = true; });
    return { spirits: spirits, supplies: supplies, drinks: drinks, combos: combos, suppliers: [
      { id: 'norte', name: 'Distribuidora Norte', contact: 'Contato demonstrativo', active: true },
      { id: 'reserva', name: 'Reserva Bebidas', contact: 'Contato demonstrativo', active: true },
      { id: 'abastece', name: 'Abastece Insumos', contact: 'Contato demonstrativo', active: true }
    ] };
  }

  function generate(profile, now) {
    profile = profile === 'premium' ? 'premium' : 'bairro';
    now = now == null ? new Date() : new Date(now);
    if (!Number.isFinite(now.getTime())) throw new Error('Data de geração inválida.');
    if (!Engine) throw new Error('Carregue o motor antes dos dados de demonstração.');
    var premium = profile === 'premium';
    var random = mulberry32(premium ? 551405 : 551010);
    var baseDate = operationalStart(now);
    baseDate.setFullYear(baseDate.getFullYear() - 1);
    var state = Engine.createEmpty(profile, baseDate);
    state.origin = 'demo';
    state.demoCatalogVersion = 2;
    state.demoNotice = 'Marcas reais. Preços, custos, fichas, fornecedores e movimentos são demonstrativos.';
    state.baseDate = baseDate.toISOString();
    state.generatedUntil = now.toISOString();
    state.settings.dose = 50;
    state.settings.counters = premium ? 1 : 2;
    state.settings.fees = { pix: 0, dinheiro: 0, cartao: 3.5 };
    state.settings.pin = '1234';
    var data = catalog(premium), baseCosts = {}, dayIndex = 0;
    function run(workingState) {
      if (workingState) state = workingState;
      ['suppliers', 'spirits', 'supplies', 'drinks', 'combos'].forEach(function (kind) {
        data[kind].forEach(function (item) {
          Engine.upsert(state, kind, item, baseDate);
          if (kind === 'spirits' || kind === 'supplies') baseCosts[item.id] = item.cost;
        });
      });
      var byId = {};
      state.spirits.concat(state.supplies, state.drinks, state.combos).forEach(function (item) { byId[item.id] = item; });
      function line(type, id, qty) { return { type: type, id: id, qty: qty }; }
      function basket(index, day) {
        var templates = [
          [line('drink', 'copao-vodka', 6), line('dose', 'vodka-clara', 4)],
          [line('unidade', 'cerveja', 14), line('dose', 'vodka-clara', 6)],
          [line('combo', 'trio-vodka', 2), line('unidade', 'cerveja', 6)],
          [line('drink', 'copao-gin', 4), line('unidade', 'tonica', 4)],
          [line('combo', premium ? 'degustacao' : 'kit-whisky', 1), line('unidade', 'cerveja', 4)],
          [line('drink', 'caipirinha', 6), line('dose', 'cachaca-serra', 2)],
          [line('drink', 'whisky-energetico', 4), line('dose', 'whisky-ambar', 4)],
          [line('combo', 'kit-gin', 1), line('unidade', 'cerveja', 6)],
          [line('drink', 'batida', 5), line('dose', 'tequila-sol', 4)],
          [line('dose', 'rum-dourado', 5), line('dose', 'licor-cafe', 3), line('unidade', 'cerveja', 8)],
          [line('garrafa', 'whisky-reserva', 1), line('unidade', 'cerveja', 6)]
        ];
        // Daily opening round gives the leading vodka consistent visibility even early in a month.
        var which = index === 0 ? 0 : index === 2 ? 2 : Math.floor(random() * templates.length);
        var items = templates[which];
        if (index === 1 && day % 6 === 0) items.push(line('dose', 'conhaque-noite', 1));
        if (premium && index === 3) {
          var extra = ['vodka-cristal', 'whisky-turfa', 'rum-reserva', 'tequila-prata'][day % 4];
          items.push(line('dose', extra, 3));
        }
        return items;
      }
      function needs(cart) {
        var result = {};
        function add(id, qty, bottle) {
          if (!result[id]) result[id] = { qty: 0, bottles: 0 };
          result[id].qty += qty;
          if (bottle) result[id].bottles += bottle;
        }
        function visit(entry, multiple) {
          var item = byId[entry.id], qty = entry.qty * multiple;
          if (entry.type === 'dose') add(item.id, state.settings.dose * qty, 0);
          else if (entry.type === 'garrafa') add(item.id, item.volume * qty, qty);
          else if (entry.type === 'unidade') add(item.id, qty, 0);
          else if (entry.type === 'drink') item.components.forEach(function (c) { add(c.id, c.qty * qty, 0); });
          else if (entry.type === 'combo') item.items.forEach(function (c) { visit(c, qty); });
        }
        cart.forEach(function (entry) { visit(entry, 1); });
        return result;
      }
      function supply(cart, at) {
        var demand = needs(cart);
        Object.keys(demand).forEach(function (id) {
          var item = byId[id], required = demand[id], amount = 0, spirit = !!item.volume;
          if (spirit) {
            var bottlesNeeded = required.bottles + Math.ceil(Math.max(0, required.qty - required.bottles * item.volume - item.open) / item.volume);
            if (item.closed < bottlesNeeded) amount = Math.max(bottlesNeeded - item.closed, id === 'vodka-clara' ? 18 : id === 'gin-botanico' || id === 'whisky-ambar' ? 10 : 5);
          } else if (item.stock + 1e-7 < required.qty) {
            var pack = id === 'cerveja' || id === 'creme' ? 300 : id === 'energetico' || id === 'tonica' ? 120 : id === 'limao' ? 100 : id === 'gelo' ? 70 : 12;
            amount = Math.max(Math.ceil(required.qty - item.stock), pack);
          }
          if (amount) {
            var unitCost = baseCosts[id] * (1 + dayIndex / 365 * .065 + (random() - .5) * .04);
            Engine.purchase(state, { id: id, qty: amount, total: round(amount * unitCost * (spirit ? item.volume : 1)), supplierId: item.supplierId }, new Date(at.getTime() - 1000));
          }
        });
        return demand;
      }
      var lossIds = ['vodka-clara', 'gin-botanico', 'whisky-ambar'];
      for (var day = new Date(baseDate); day <= now; day.setDate(day.getDate() + 1), dayIndex++) {
        var weekday = day.getDay(), month = day.getMonth();
        var seasonal = month === 11 ? 1.25 : month === 0 ? 1.16 : .96;
        var count = Math.round((weekday === 6 ? 13 : weekday === 5 ? 11 : weekday === 0 ? 9 : 7) * seasonal);
        for (var i = 0; i < count; i++) {
          var hour = 12 + i * (14.2 / Math.max(1, count - 1)) + random() * .18;
          var at = dateAt(day, hour);
          if (at > now) continue;
          var cart = basket(i, dayIndex);
          supply(cart, at);
          var chance = random(), payment = chance < .5 ? 'pix' : chance < .85 ? 'cartao' : 'dinheiro';
          var counter = premium || random() < .65 ? 1 : 2;
          Engine.sell(state, cart, payment, counter, at);
        }
        // Sunday 04:30 is the close of Saturday's operational day, after its late-night sales.
        var countAt = dateAt(day, 28.5);
        if (weekday === 6 && countAt <= now) {
          var entries = state.spirits.concat(state.supplies).map(function (item) {
            var spirit = !!item.volume, theoretical = spirit ? item.closed * item.volume + item.open : item.stock;
            var counted = theoretical;
            if (lossIds.indexOf(item.id) >= 0) counted -= theoretical * (.03 + random() * .04);
            if (item.id === 'licor-cafe') counted += 25;
            if (item.id === 'cerveja') counted -= Math.min(item.stock, 2);
            if (item.id === 'gelo') counted -= Math.min(item.stock, .5);
            counted = round(Math.max(0, counted), spirit || item.unit === 'kg' ? 3 : 0);
            // Each weekly round has one explicitly skipped product; the latest round retains this evidence.
            if (item.id === 'gin-floral') return { id: item.id, skip: true };
            var entry = { id: item.id, reason: counted < theoretical ? 'não identificado' : '' };
            if (spirit) { entry.closed = Math.floor(counted / item.volume); entry.open = counted - entry.closed * item.volume; }
            else entry.qty = counted;
            return entry;
          });
          Engine.count(state, entries, countAt);
        }
      }
    }
    if (typeof Engine.batch === 'function') Engine.batch(state, run); else run();
    return state;
  }
  return { generate: generate, mulberry32: mulberry32 };
});
