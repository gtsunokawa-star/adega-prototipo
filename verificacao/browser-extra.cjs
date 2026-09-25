const {chromium}=require('playwright'),E=require('../src/engine.js'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const b=await chromium.launch({channel:'chrome',headless:true}),c=await b.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'}),p=await c.newPage();p.setDefaultTimeout(12000);const checks=[],errors=[];p.on('pageerror',e=>errors.push(e.message));
 const act=(a,x='')=>p.locator('[data-action="'+a+'"]'+x).first().click(),nav=t=>p.locator('.nav [data-tab="'+t+'"]').click(),state=()=>p.evaluate(()=>structuredClone(AdegaApp.getState()));
 const check=async(name,f)=>{await f();checks.push({name,pass:true});console.log('PASS '+name);};
 try{
 await p.goto('http://127.0.0.1:4180');await p.waitForFunction(()=>window.AdegaApp);
 await check('Fotos reais completas nos dois perfis e carrossel por teclado',async()=>{
  for(const profile of ['bairro','premium']){
   await nav('settings');await act('profile','[data-profile="'+profile+'"]');await p.waitForFunction(profile=>AdegaApp.getState().profile===profile,profile);await nav('stock');
   await p.waitForFunction(()=>[...document.querySelectorAll('.stock-bottle img')].every(i=>i.complete&&i.naturalWidth>0));
   assert.equal(await p.locator('.stock-bottle img').count(),profile==='bairro'?10:14);
  }
  await nav('panel');const tile=p.locator('.bottle-tile').nth(1);await tile.focus();await p.keyboard.press('ArrowRight');assert.equal(await p.locator('.bottle-tile').nth(2).evaluate(e=>e===document.activeElement),true);await p.keyboard.press('Enter');assert(await p.locator('.beverage-hero').isVisible());assert(p.url().includes('#bebida='));
 });
 await check('Retomar roteiro e personalização pelo link',async()=>{
  await nav('settings');await act('show-tour');assert(await p.locator('.tour').isVisible());await p.goto('http://127.0.0.1:4180/?adega=Teste%20do%20Link&cor=%23d4a017&perfil=bairro');await p.waitForFunction(()=>window.AdegaApp);assert.equal(await p.locator('#store-name').innerText(),'Teste do Link');assert.equal((await state()).profile,'bairro');
 });
 await check('Avançar semanas preserva demo; restaurar mantém o outro perfil',async()=>{
  const before=await state();await p.evaluate(()=>AdegaApp.flush());const premium=await p.evaluate(()=>localStorage.getItem('adegacontrol.v4.premium'));
  await p.clock.install({time:new Date(Date.now()+21*86400000)});await p.reload();await p.waitForFunction(()=>window.AdegaApp);assert.deepEqual(await state(),before);assert((await p.locator('#content').innerText()).includes('Seus testes estão preservados'));
  await act('restore');await act('close-modal');assert.deepEqual(await state(),before);await act('restore');await act('confirm-reset');await p.waitForFunction(old=>AdegaApp.getState().generatedUntil!==old,before.generatedUntil);await p.evaluate(()=>AdegaApp.flush());
  assert.equal(await p.evaluate(()=>localStorage.getItem('adegacontrol.v4.premium')),premium);assert.equal(await p.locator('#store-name').innerText(),'Teste do Link');
 });
 await check('Cancelar dose não servida após abertura automática recupera distribuição física',async()=>{
  const now=new Date(Date.now()+21*86400000),fixture=E.createEmpty('bairro',new Date(+now-86400000));
  E.upsert(fixture,'suppliers',{id:'fornecedor',name:'Fornecedor de teste',active:true},now);
  E.upsert(fixture,'spirits',{id:'vodka-teste',name:'Vodka do teste',active:true,type:'vodka',volume:1000,cost:.06,dosePrice:10,bottlePrice:80,min:1,supplierId:'fornecedor',closed:5,open:30},now);
  await nav('settings');await p.locator('#import-file').setInputFiles({name:'reposicao.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({app:'AdegaControl',version:1,profile:'bairro',exportedAt:now.toISOString(),state:fixture,brand:{name:'Teste físico',color:'#c9e879',logo:'',custom:true}}))});await act('confirm-import');await nav('counter');await act('quick','[data-type="dose"]');await act('quick-pay','[data-payment="pix"]');
  let s=await state();assert.equal(s.spirits[0].closed,4);assert.equal(s.spirits[0].open,980);const sale=s.movements.at(-1);
  await act('history');await act('cancel-sale','[data-id="'+sale.id+'"]');await p.locator('#cancel-reason').fill('Venda registrada sem servir a dose');await p.locator('#return-vodka-teste').fill('50');
  await p.locator('#cancel-form button[type=submit]').click();assert(await p.locator('#modal').isVisible());assert(!(await state()).movements.some(m=>m.type==='cancel'));
  await p.locator('#counted-closed-vodka-teste').fill('5');await p.locator('#counted-open-vodka-teste').fill('30');await p.locator('#cancel-form button[type=submit]').click();s=await state();assert.equal(s.spirits[0].closed,5);assert.equal(s.spirits[0].open,30);assert(s.movements.some(m=>m.type==='cancel'));assert.equal(E.report(s,{period:'month',now}).losses.surplusCost,0);
 });
 assert.deepEqual(errors,[]);
 }catch(e){console.error(e.stack);checks.push({pass:false,error:e.message});await p.screenshot({path:path.join(__dirname,'falha-extra.png'),fullPage:true});process.exitCode=1;}
 finally{fs.writeFileSync(path.join(__dirname,'browser-extra.json'),JSON.stringify({executedAt:new Date().toISOString(),checks,errors},null,2));await b.close();}
})();
