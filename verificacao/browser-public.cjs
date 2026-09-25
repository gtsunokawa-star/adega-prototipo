const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
(async()=>{
 const url='https://gtsunokawa-star.github.io/adega-prototipo/',b=await chromium.launch({channel:'chrome',headless:true}),p=await b.newPage({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'}),errors=[],result={url,checkedAt:new Date().toISOString()};p.on('pageerror',e=>errors.push(e.message));
 try{
 const local=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8').replace(/\r\n/g,'\n');let remote='';
 for(let attempt=0;attempt<12;attempt++){const response=await p.goto(url+'?verificar='+Date.now(),{waitUntil:'domcontentloaded'});assert.equal(response.status(),200);remote=(await response.text()).replace(/\r\n/g,'\n');if(remote===local)break;await p.waitForTimeout(5000);}
 assert(remote===local,'A publicação ainda não corresponde ao HTML local.');result.htmlMatchesLocal=true;result.sha256=crypto.createHash('sha256').update(remote).digest('hex');
 await p.waitForFunction(()=>window.AdegaApp,{timeout:30000});await p.locator('.nav [data-tab="stock"]').click();await p.waitForFunction(()=>[...document.querySelectorAll('.stock-bottle img')].every(i=>i.complete&&i.naturalWidth>0));assert.equal(await p.locator('.stock-bottle img').count(),10);result.photosLoaded=10;
 await p.locator('.nav [data-tab="counter"]').click();await p.locator('[data-action="category"][data-category="all"]').click();await p.locator('[data-action="quick"][data-type="drink"][data-id="copao-vodka"]').click();await p.locator('[data-action="quick-pay"][data-payment="pix"]').click();assert.equal(await p.evaluate(()=>AdegaApp.getState().movements.at(-1).revenue),22);result.saleRegistered=true;
 await p.setViewportSize({width:360,height:900});const tabs=['panel','counter','stock','reports','loss','settings'];
 result.mobileDimensions=[];
 for(const tab of tabs){await p.locator('.nav [data-tab="'+tab+'"]').click();assert(await p.locator('#content h1').isVisible());const d=await p.evaluate(()=>({width:document.documentElement.scrollWidth,outside:[...document.querySelectorAll('#content *')].filter(e=>e.getBoundingClientRect().right>361&&!e.closest('.table-wrap,.bottle-carousel,.category-tabs')).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',right:Math.round(e.getBoundingClientRect().right)})).slice(0,15)}));result.mobileDimensions.push({tab,...d});}
 assert(result.mobileDimensions.every(x=>x.width<=360),JSON.stringify(result.mobileDimensions));
 result.mobileTabs=tabs.length;await p.locator('.nav [data-tab="panel"]').click();await p.locator('.kpi-grid').screenshot({path:path.join(__dirname,'kpis-mobile-publicado.png')});await p.setViewportSize({width:1440,height:1000});await p.screenshot({path:path.join(__dirname,'site-publicado.png')});assert.deepEqual(errors,[]);result.passed=true;
 }catch(e){result.passed=false;result.error=e.message;process.exitCode=1;}
 finally{result.errors=errors;fs.writeFileSync(path.join(__dirname,'browser-public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));await b.close();}
})();
