import {chromium} from '../../../fetcher/node_modules/playwright-core/index.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const session=process.env.DEV_LIFECYCLE_SESSION;
execFileSync('dev-lifecycle',['claim','--session',session,'process',String(process.pid),'--reason','Registration opening locales and Taste measurements']);
const api='https://marianas-open-api.onrender.com',base='http://127.0.0.1:5361';
const events=await (await fetch(`${api}/api/v1/events`)).json();
const futureEvents=events.map(event=>event.status==='upcoming'?{...event,registration_opens_on:'2027-01-01'}:event);
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const outcomes=[],measurements=[];
try {
 for(const lang of ['en','ja','ko','pt','tl','zh','zh-Hant']) {
  const strings=JSON.parse(readFileSync(new URL(`../../../web/src/locales/${lang}.json`,import.meta.url)));
  const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
  await context.addInitScript(value=>localStorage.setItem('i18nextLng',value),lang);
  await context.route(`${api}/api/v1/**`,async route=>{
   assert.equal(route.request().method(),'GET');
   const response=await route.fetch();
   const json=new URL(route.request().url()).pathname==='/api/v1/events'?futureEvents:undefined;
   await route.fulfill({response,...(json?{json}:{}),headers:{...response.headers(),'access-control-allow-origin':base,'access-control-allow-credentials':'true'}}).catch(error => { if (!/already handled|closed/.test(error.message)) throw error; });
  });
  const page=await context.newPage();
  for(const path of ['/','/calendar','/events/copa-de-marianas-2027']) {
   await page.goto(base+path);await page.locator('h1').waitFor({timeout:60000});await page.waitForLoadState('networkidle');
   const formatted=new Intl.DateTimeFormat(({zh:'zh-CN','zh-Hant':'zh-TW',tl:'fil-PH'})[lang]||lang,{year:'numeric',month:'long',day:'numeric'}).format(new Date('2027-01-01T00:00:00'));
   const notice=strings.visualRefresh.registrationOpens.replace('{{date}}',formatted);
   assert(await page.getByRole('status').filter({hasText:notice}).count());
   assert.equal(await page.getByRole('button',{name:strings.calendar.register,exact:true}).count(),0);
   assert(await page.getByRole('link',{name:strings.visualRefresh.eventInfo,exact:true}).count());
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   outcomes.push({lang,path,status:'passed'});
  }
  await page.screenshot({path:new URL(`./after/future-opening-${lang}-390.png`,import.meta.url).pathname});
  await context.unrouteAll({behavior:'wait'});await context.close();console.log('PASS opening locale',lang);
 }
 if(process.env.TASTE_SKILL_ROOT) {
  const {probe}=await import(`${process.env.TASTE_SKILL_ROOT}/scripts/lib/probe.mjs`);
  const {judge}=await import(`${process.env.TASTE_SKILL_ROOT}/scripts/lib/rules.mjs`);
  for(const source of ['before','after']) {
   const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
   await context.addInitScript(()=>localStorage.setItem('i18nextLng','en'));
   await context.route(`${api}/api/v1/**`,async route=>{
    assert.equal(route.request().method(),'GET');const response=await route.fetch();
    await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':route.request().headers().origin||base,'access-control-allow-credentials':'true'}});
   });
   const page=await context.newPage();await page.goto(source==='before'?'https://marianasopen.com':base);await page.locator('h1').waitFor({timeout:60000});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);
   for(const width of [1440,768,390]) {await page.setViewportSize({width,height:width===390?844:900});const metrics=await page.evaluate(probe);measurements.push({source,width,metrics,findings:judge(metrics,{width})});}
   await context.unrouteAll({behavior:'wait'});await context.close();
  }
 }
} finally {await browser.close();writeFileSync(new URL('./opening-locales-results.json',import.meta.url),JSON.stringify({source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),outcomes,measurements},null,2));}
