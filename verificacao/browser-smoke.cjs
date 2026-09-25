const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'});
 const page=await context.newPage(),issues=[];
 page.on('pageerror',error=>issues.push({kind:'pageerror',message:error.message}));
 page.on('console',msg=>{if(msg.type()==='error'&&!/net::|Failed to load resource/.test(msg.text()))issues.push({kind:'console',message:msg.text()});});
 await page.goto('http://127.0.0.1:4180',{waitUntil:'networkidle'});
 await page.waitForFunction(()=>window.AdegaApp,{timeout:30000});
 const checks=[];
 for(const width of [1440,768,360]){
  await page.setViewportSize({width,height:1000});
  for(const tab of ['panel','counter','stock','reports','loss','settings']){
   await page.locator('.nav [data-tab="'+tab+'"]').click();
   await page.waitForTimeout(100);
   const dimension=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,body:document.body.scrollWidth,title:document.querySelector('#content h1')?.textContent,visible:!document.querySelector('#content').hidden}));
   checks.push({width,tab,...dimension});
   if(dimension.scroll>width+1||dimension.body>width+1)issues.push({kind:'overflow',width,tab,...dimension});
   if(tab==='panel'||tab==='counter'||width===360&&tab==='stock')await page.screenshot({path:path.join(__dirname,'tela-'+tab+'-'+width+'.png'),fullPage:true});
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('.nav [data-tab="panel"]').click();
 await page.screenshot({path:path.join(__dirname,'painel-desktop.png')});
 fs.writeFileSync(path.join(__dirname,'browser-smoke.json'),JSON.stringify({checks,issues},null,2));
 console.log(JSON.stringify({checks:checks.length,issues},null,2));
 await browser.close();
 if(issues.length)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
