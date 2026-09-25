const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const evidence=[],errors=[];
const money=n=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce',acceptDownloads:true});
 const page=await context.newPage();page.setDefaultTimeout(12000);
 page.on('pageerror',e=>errors.push(e.message));
 const state=()=>page.evaluate(()=>structuredClone(AdegaApp.getState()));
 const flush=()=>page.evaluate(()=>AdegaApp.flush());
 const nav=async t=>{await page.locator('.nav [data-tab="'+t+'"]').click();};
 const act=async (a,extra='')=>{await page.locator('[data-action="'+a+'"]'+extra).first().click();};
 const check=async(name,fn)=>{try{await fn();evidence.push({name,pass:true});console.log('PASS '+name);}catch(e){evidence.push({name,pass:false,error:e.message});await page.screenshot({path:path.join(__dirname,'falha-fluxo.png'),fullPage:true});throw e;}};
 try{
 await page.goto('http://127.0.0.1:4180',{waitUntil:'networkidle'});await page.waitForFunction(()=>window.AdegaApp);
 await check('Primeiro acesso, roteiro e seleção de bebida',async()=>{
  assert.equal((await state()).profile,'bairro');assert(await page.locator('.tour').isVisible());
  const id=await page.locator('.spotlight').first().getAttribute('data-id');await page.locator('.spotlight').first().click();
  assert.equal(new URL(page.url()).hash,'#bebida='+id);assert(await page.locator('.beverage-hero').isVisible());
  const r=await page.evaluate(()=>AdegaEngine.report(AdegaApp.getState(),{period:'month'}));
  const c=r.components.find(x=>x.id===id);assert((await page.locator('.beverage-hero').innerText()).includes(money(c.grossMargin)));
  await act('select','[data-id=""]');await act('dismiss-tour');await flush();await page.reload();await page.waitForFunction(()=>window.AdegaApp);assert.equal(await page.locator('.tour').count(),0);
 });
 await check('Kit Ballantine’s + 2 Copões de Smirnoff no cartão, componentes e desfazer',async()=>{
  await nav('counter');await act('category','[data-category="all"]');await page.locator('#selling-counter').selectOption('2');
  const before=await state();
  await act('add','[data-id="kit-whisky"][data-type="combo"]');
  await act('add','[data-id="copao-vodka"][data-type="drink"]');await act('add','[data-id="copao-vodka"][data-type="drink"]');
  await act('pay','[data-payment="cartao"]');
  const after=await page.evaluate(()=>{const s=AdegaApp.getState();return {spirits:s.spirits,supplies:s.supplies,movements:[s.movements.at(-1)]};});await act('undo');
  const sale=after.movements.at(-1);assert.equal(sale.type,'sale');assert.equal(sale.revenue,183);assert.equal(sale.fee,6.41);assert.equal(sale.counter,2);
  const spirit=id=>after.spirits.find(x=>x.id===id),old=id=>before.spirits.find(x=>x.id===id);
  assert.equal(spirit('whisky-ambar').closed,old('whisky-ambar').closed-1);
  assert.equal(spirit('vodka-clara').closed*998+spirit('vodka-clara').open,old('vodka-clara').closed*998+old('vodka-clara').open-200);
  assert(Math.abs(before.supplies.find(x=>x.id==='gelo').stock-after.supplies.find(x=>x.id==='gelo').stock-2.3)<1e-7);
  const undone=await state();assert.deepEqual(undone.spirits,before.spirits);assert.deepEqual(undone.supplies,before.supplies);
  await act('history');assert((await page.locator('#modal').innerText()).includes('Desfeita'));assert.equal(await page.locator('#modal tbody tr').first().locator('[data-action="cancel-sale"]').count(),0);await act('close-modal');
 });
 await check('Venda rápida, cancelamento com consumo e taxas discriminadas',async()=>{
  await act('quick','[data-id="copao-vodka"][data-type="drink"]');await act('quick-pay','[data-payment="cartao"]');
  const sale=(await state()).movements.at(-1);await page.waitForTimeout(5100);await act('history');await act('cancel-sale','[data-id="'+sale.id+'"]');
  await page.locator('#cancel-reason').fill('Teste: pedido servido cancelado');await page.locator('#cancel-fee').check();await page.locator('#cancel-form button[type=submit]').click();
  const cancelled=await state(),c=cancelled.movements.at(-1);assert.equal(c.type,'cancel');assert.equal(c.revenue,-22);assert.equal(c.fee,-.77);assert(c.consumedCost>0);assert(c.entries.every(e=>e.recoveredQty===0));
  await nav('reports');const mix=page.locator('section.panel').filter({hasText:'Como seus clientes pagam'});const text=await page.locator('#content').innerText();assert(text.includes('Taxas devolvidas'));assert(text.includes('Líquido'));assert(text.includes('22,00 estornados'));
 });
 await check('Compra com custo total obrigatório e média ponderada',async()=>{
  await nav('stock');const before=(await state()).spirits.find(x=>x.id==='vodka-clara');
  await act('purchase','[data-id="vodka-clara"]');assert.equal(await page.locator('#purchase-total').inputValue(),'');
  await page.locator('#purchase-qty').fill('2');await page.locator('#purchase-total').fill('120');await page.locator('#purchase-form button:not([data-action])').click();
  const after=(await state()).spirits.find(x=>x.id==='vodka-clara');const ml=before.closed*before.volume+before.open;assert(Math.abs(after.cost-(ml*before.cost+120)/(ml+2*before.volume))<1e-7);assert.equal(after.closed,before.closed+2);
 });
 await check('Contagem guiada com falta, insumo, item pulado e revisão',async()=>{
  await nav('loss');const before=await state();await act('count-start');
  assert(await page.locator('#count-reason option').filter({hasText:'Quebra'}).count());
  const first=before.spirits[0];await page.locator('#count-closed').fill(String(first.closed));await page.locator('#count-open').fill(String(Math.max(0,first.open-20)));await page.locator('#count-reason').selectOption({label:'Quebra'});await page.locator('#count-form button[type=submit]').click();
  for(let i=1;i<before.spirits.length;i++)await act('count-skip');
  const supply=before.supplies[0];await page.locator('#count-qty').fill(String(supply.stock-1));await page.locator('#count-form button[type=submit]').click();
  for(let i=1;i<before.supplies.length;i++)await act('count-skip');
  assert.equal((await state()).movements.length,before.movements.length);
  await act('count-confirm');const c=(await state()).movements.at(-1);assert.equal(c.type,'count');assert.equal(c.entries.filter(e=>e.skip).length,15);assert.equal(c.entries.find(e=>e.id===supply.id).shortage,1);
  const text=await page.locator('#content').innerText();assert(text.includes('Sem contagem'));assert(text.includes('Quebra'));assert(text.includes('Falta 1 un'));assert(text.includes('Doses faltantes eq.'));
  await page.locator('#sim-served').fill('60');assert((await page.locator('#sim-result').innerText()).includes('24 litros'));
 });
 await check('Filtros, balcão de registro independente e estoque compartilhado',async()=>{
  await nav('panel');let values=[];for(const period of ['month','quarter','semester','year']){await act('period','[data-period="'+period+'"]');values.push(await page.evaluate(()=>AdegaEngine.report(AdegaApp.getState(),{period:AdegaApp.getView().period}).totals.revenue));}assert(values.every((v,i)=>!i||v>=values[i-1]));
  await page.locator('#report-counter').selectOption('1');const stock=JSON.stringify((await state()).spirits);await nav('loss');assert(await page.locator('.counter-filter').isHidden());await nav('stock');assert.equal(JSON.stringify((await state()).spirits),stock);await nav('counter');assert.equal(await page.locator('#selling-counter').inputValue(),'2');
  const dayBefore=await page.locator('.day-summary').innerText();await page.locator('#selling-counter').selectOption('1');assert.equal(await page.locator('.day-summary').innerText(),dayBefore);
 });
 await check('Identidade, perfis, PIN e modo Balcão persistidos',async()=>{
  await nav('settings');await page.locator('#brand-name').fill('Adega de Teste');await page.locator('#brand-color').fill('#d4a017');await page.locator('#brand-form button[type=submit]').click();
  await page.locator('#setting-pin').fill('5678');await page.locator('#operation-form button[type=submit]').click();
  const bairro=await state();await act('profile','[data-profile="premium"]');await page.waitForFunction(()=>AdegaApp.getState().profile==='premium');assert.equal((await state()).spirits.length,14);assert.equal(await page.locator('#store-name').innerText(),'Adega de Teste');
  await act('profile','[data-profile="bairro"]');await page.waitForFunction(()=>AdegaApp.getState().profile==='bairro');assert.deepEqual(await state(),bairro);
  await act('mode');await flush();await page.reload();await page.waitForFunction(()=>window.AdegaApp);assert.equal(await page.locator('.nav-item').count(),2);assert.equal((await page.evaluate(()=>AdegaApp.getView())).mode,'counter');
  for(const tab of ['counter','stock']){await nav(tab);const text=await page.locator('#content').innerText();assert(!/margem|Custo|Taxas|Compra|Vazamento|Abrir garrafa/i.test(text));}
  await act('mode');await page.locator('#owner-pin').fill('1234');await page.locator('#pin-form button').click();assert(await page.locator('#modal').isVisible());await page.locator('#owner-pin').fill('5678');await page.locator('#pin-form button').click();assert.equal(await page.locator('.nav-item').count(),6);
 });
 let exported,exportPath;
 await check('Exportar, cancelar restauração, restaurar e importar sem alterar datas',async()=>{
  await nav('settings');const before=await state();const downloadPromise=page.waitForEvent('download');await act('export');const dl=await downloadPromise;exportPath=path.join(__dirname,'fluxo-exportado.json');await dl.saveAs(exportPath);exported=JSON.parse(fs.readFileSync(exportPath));assert.deepEqual(exported.state,before);
  await act('restore');assert.equal(await page.locator('#reset-brand').isChecked(),false);await act('close-modal');assert.deepEqual(await state(),before);
  await act('restore');await act('confirm-reset');await page.waitForFunction(()=>AdegaApp.getState().movements.at(-1).type!=='cancel');assert.equal((await state()).settings.pin,'5678');assert.equal(await page.locator('#store-name').innerText(),'Adega de Teste');assert((await state()).generatedUntil!==before.generatedUntil);
  await nav('settings');await page.locator('#import-file').setInputFiles(exportPath);await page.locator('[data-action="confirm-import"]').waitFor();await act('confirm-import');await page.waitForFunction(n=>AdegaApp.getState().movements.length===n,before.movements.length);assert.deepEqual(await state(),before);
  const bad=structuredClone(exported);bad.state.movements.find(x=>x.type==='sale').fee=999;
  await page.locator('#import-file').setInputFiles({name:'invalido.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForTimeout(400);assert.equal(await page.locator('#modal').isVisible(),false);assert.deepEqual(await state(),before);
  await flush();await page.reload();await page.waitForFunction(()=>window.AdegaApp);assert.deepEqual(await state(),before);
 });
 await check('Começar do zero e cadastrar fornecedor, saldo inicial, drink e combo',async()=>{
  await nav('settings');await act('start-empty');await act('confirm-reset');await page.waitForFunction(()=>AdegaApp.getState().origin==='proprio');
  const newItem=async kind=>{await page.locator('.catalog-group').filter({has:page.locator('[data-action="new-item"][data-kind="'+kind+'"]')}).locator('summary').evaluate(e=>e.parentElement.open=true);await act('new-item','[data-kind="'+kind+'"]');};
  await newItem('suppliers');await page.locator('[data-edit-key="name"]').fill('Fornecedor Teste');await page.locator('#editor-form button[type=submit]').click();
  await newItem('spirits');await page.locator('[data-edit-key="name"]').fill('Destilado Teste');await page.locator('[data-edit-key="costInput"]').fill('60');await page.locator('[data-edit-key="closed"]').fill('2');await page.locator('[data-edit-key="open"]').fill('500');await page.locator('#editor-form button[type=submit]').click();
  let s=await state();assert.equal(s.spirits.length,1);assert.equal(s.spirits[0].cost,.06);assert.equal(s.movements.filter(x=>x.type==='purchase'||x.type==='sale').length,0);assert.equal(s.movements.at(-1).type,'initial');
  const sid=s.spirits[0].id;await newItem('drinks');await page.locator('[data-edit-key="name"]').fill('Drink Teste');await page.locator('[data-edit-key="price"]').fill('20');await page.locator('#editor-form button[type=submit]').click();assert(await page.locator('#form-error').isVisible());
  await act('recipe-add');await page.locator('.recipe-select').selectOption(sid);await page.locator('.recipe-qty').fill('50');assert((await page.locator('#recipe-preview').innerText()).includes('17,00'));await page.locator('#editor-form button[type=submit]').click();assert.equal((await state()).drinks.length,1);
  await newItem('combos');await page.locator('[data-edit-key="name"]').fill('Combo Teste');await page.locator('[data-edit-key="price"]').fill('35');await act('recipe-add');await page.locator('.recipe-select').selectOption('drink|'+(await state()).drinks[0].id);await page.locator('.recipe-qty').fill('2');assert((await page.locator('#recipe-preview').innerText()).includes('Desconto'));assert((await page.locator('#recipe-preview').innerText()).includes('29,00'));await page.locator('#editor-form button[type=submit]').click();assert.equal((await state()).combos.length,1);
  await nav('counter');await act('category','[data-category="all"]');await act('add','[data-type="combo"]');await act('pay','[data-payment="pix"]');assert.equal((await state()).movements.at(-1).revenue,35);
 });
 await check('Tela móvel, comanda acessível e venda por toque',async()=>{
  await page.setViewportSize({width:360,height:900});await act('add','[data-type="drink"]');assert(await page.locator('.mobile-cart').isVisible());await act('show-cart');await page.waitForTimeout(250);await act('pay','[data-payment="dinheiro"]');assert.equal((await state()).movements.at(-1).payment,'dinheiro');assert.equal(await page.locator('.mobile-cart').count(),0);
  assert.equal(await page.locator('.sidebar-foot').isVisible(),false);assert((await page.evaluate(()=>document.documentElement.scrollWidth))<=360);await page.screenshot({path:path.join(__dirname,'fluxo-mobile-comanda.png'),fullPage:true});
 });
 await check('Arquivo local offline, tabelas e recarga sem novas vendas',async()=>{
  const offline=await browser.newContext({viewport:{width:768,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'});
  await offline.route(/^https?:/,route=>route.abort());const p=await offline.newPage();p.on('pageerror',e=>errors.push(e.message));
  await p.goto('file:///'+path.resolve('index.html').replace(/\\/g,'/'));await p.waitForFunction(()=>window.AdegaApp);
  assert(await p.locator('#chart-table').isVisible());assert(await p.locator('#revenue-chart').isHidden());
  const initial=await p.evaluate(()=>JSON.stringify(AdegaApp.getState()));await p.locator('.spotlight').first().click();assert(await p.locator('#chart-table').isVisible());const selectedRows=await p.locator('#chart-table tbody tr').count();assert(selectedRows>0);
  await p.reload();await p.waitForFunction(()=>window.AdegaApp);assert.equal(await p.evaluate(()=>JSON.stringify(AdegaApp.getState())),initial);
  await p.screenshot({path:path.join(__dirname,'offline-file.png'),fullPage:true});await offline.close();
 });
 assert.deepEqual(errors,[]);
 }catch(e){console.error(e.stack);process.exitCode=1;}
 finally{fs.writeFileSync(path.join(__dirname,'browser-flows.json'),JSON.stringify({executedAt:new Date().toISOString(),evidence,errors},null,2));await browser.close();}
})();
