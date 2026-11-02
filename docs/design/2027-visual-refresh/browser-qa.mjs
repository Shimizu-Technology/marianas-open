import { chromium } from '../../../fetcher/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const session = process.env.DEV_LIFECYCLE_SESSION;
execFileSync('dev-lifecycle', ['claim', '--session', session, 'process', String(process.pid), '--reason', 'Visual refresh isolated Chromium acceptance matrix']);
const directory = new URL('./after/', import.meta.url).pathname;
mkdirSync(directory, {recursive:true});
const api = 'https://marianas-open-api.onrender.com';
const base = 'http://127.0.0.1:5361';
const response = await fetch(`${api}/api/v1/events`);
assert(response.ok);
const events = await response.json();
const locales = Object.fromEntries(['en','ja','zh-Hant'].map(lang=>[lang,JSON.parse(readFileSync(new URL(`../../../web/src/locales/${lang}.json`,import.meta.url)))]));
const copa = events.find(event=>event.slug === 'copa-de-marianas-2027');
const previousCopa = events.find(event=>event.slug === 'copa-de-marianas-2026');
const outcomes = [], errors = [], blockedWrites = [];
const browser = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const cache = new Map();
const routes = [['home','/'],['copa-2027','/events/copa-de-marianas-2027'],['mo-2026','/events/marianas-open-2026'],['calendar','/calendar'],['past-events','/events/past'],['404','/visual-refresh-404']];
async function setup(width, language, fixture, reducedMotion='reduce') {
 const context = await browser.newContext({viewport:{width,height:width===390?844:900},reducedMotion});
 await context.addInitScript(lang=>localStorage.setItem('i18nextLng',lang), language);
 await context.route(`${api}/api/v1/**`,async route=>{
  if(route.request().method() !== 'GET') {blockedWrites.push(route.request().url());return route.abort();}
  const url=route.request().url();
  if(fixture && new URL(url).pathname==='/api/v1/events') return route.fulfill({json:fixture,headers:{'access-control-allow-origin':base,'access-control-allow-credentials':'true'}});
  if(!cache.has(url)) cache.set(url,(async()=>{const res=await route.fetch();return {status:res.status(),body:await res.body(),headers:res.headers()};})());
  const data=await cache.get(url);
  await route.fulfill({...data,headers:{...data.headers,'access-control-allow-origin':base,'access-control-allow-credentials':'true'}});
 });
 const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
 return {context,page};
}
async function ready(page,path) {
 await page.goto(base+path,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('h1').first().waitFor({timeout:60000});
 await page.evaluate(()=>document.fonts.ready);
 await page.waitForFunction(()=>!document.querySelector('h1')?.closest('[aria-busy="true"]'),undefined,{timeout:60000});
 await page.waitForTimeout(200);
}
async function shot(page,name) {
 await page.waitForFunction(()=>[...document.images].filter(image=>{const r=image.getBoundingClientRect();return r.top<innerHeight&&r.bottom>0;}).every(image=>image.complete),undefined,{timeout:30000});
 await page.screenshot({path:`${directory}${name}.png`});
}
async function overflow(page) { assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false); }
async function register(page,context,scope,language,expected=copa) {
 const strings=locales[language];
 const trigger=scope.getByRole('button',{name:strings.calendar.register,exact:true});
 await trigger.focus(); await page.keyboard.press('Enter');
 const dialog=page.getByRole('dialog'); await dialog.waitFor();
 assert.equal(await page.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement)),true);
 // Tab through the three interactive elements and verify focus is contained.
 for(let i=0;i<4;i++) await page.keyboard.press('Tab');
 assert.equal(await page.evaluate(()=>document.querySelector('[role="dialog"]').contains(document.activeElement)),true);
 await page.keyboard.press('Escape'); await dialog.waitFor({state:'detached'}); assert(await trigger.evaluate(el=>el===document.activeElement));
 for(const [key,url] of [['registerGi',expected.registration_url_gi],['registerNogi',expected.registration_url_nogi]]) {
  await trigger.click();
  const choice=page.getByRole('dialog').getByRole('link',{name:strings.calendar[key],exact:true});
  assert.equal(await choice.getAttribute('href'),url.replace('/eventNotice/','/eventInfo/')); assert.equal(await choice.getAttribute('target'),'_blank');
  const popupPromise=context.waitForEvent('page'); await choice.click();const popup=await popupPromise;
  const expectedUrl = new URL(url.replace('/eventNotice/','/eventInfo/'));
  await popup.waitForURL(actual => actual.origin === expectedUrl.origin && actual.pathname === expectedUrl.pathname,{waitUntil:'commit',timeout:30000});
  const actualUrl = new URL(popup.url());
  for (const key of [...actualUrl.searchParams.keys()]) if (key.startsWith('__cf_chl_')) actualUrl.searchParams.delete(key);
  assert.equal(actualUrl.href, expectedUrl.href); await popup.close();
  await dialog.waitFor({state:'detached'});
 }
}
try {
 for(const width of (process.env.QA_WIDTHS?.split(',').map(Number) || [390,1440])) for(const language of (process.env.QA_LANGS?.split(',') || ['en','ja','zh-Hant'])) {
  const {context,page}=await setup(width,language);
  for(const [name,path] of routes.filter(([name])=>!process.env.QA_ROUTES || process.env.QA_ROUTES.split(',').includes(name))) {
   try {
    await ready(page,path);await overflow(page);
    if(name==='home') {
     assert.match(await page.locator('h1').innerText(),/2027/);
     assert.equal(await page.locator('.home-event-hero img').getAttribute('src'),previousCopa.hero_image_url);
     assert(await page.locator('.home-event-hero').getByText(locales[language].visualRefresh.stars.replace('{{count}}','3')).count());
     await register(page,context,page.locator('.home-event-hero'),language);
     await page.locator('.event-card').first().scrollIntoViewIfNeeded();
     await register(page,context,page.locator('.event-card').first(),language);
     await shot(page,`journey-${language}-${width}`);await page.evaluate(()=>scrollTo(0,0));
    }
    if(name==='copa-2027') {
     assert.equal(await page.locator('#event-hero img').getAttribute('src'),previousCopa.hero_image_url);
     assert.equal(await page.getByText(/1,000\+ athletes from 20\+/).count(),0);
     await register(page,context,page.locator('#event-hero'),language);
     await page.locator('figcaption').filter({hasText:/2026/}).first().scrollIntoViewIfNeeded();
     assert.match(await page.locator('figcaption').first().innerText(),/2026/);
     if(width===390) { await page.locator('.mobile-register-bar').waitFor({state:'visible'});await register(page,context,page.locator('.mobile-register-bar'),language);await shot(page,`sticky-${language}-${width}`); }
     await page.evaluate(()=>scrollTo(0,0));
    }
    if(name==='mo-2026') {
     assert.equal(await page.locator('#spectator-tickets').count(),0);
     assert.equal(await page.locator('.mobile-register-bar').count(),0);
     assert.equal(await page.getByRole('button',{name:locales[language].calendar.register,exact:true}).count(),0);
     assert(await page.locator('#gallery').count());assert(await page.locator('#results').count());
    }
    if(name==='calendar') {
     await page.getByRole('button',{name:locales[language].calendar.pastResults,exact:true}).click();assert(await page.getByRole('heading',{name:'2026',exact:true}).count());
     await page.getByRole('button',{name:locales[language].calendar.upcoming,exact:true}).click();
     await page.locator('.event-card').first().getByRole('link',{name:locales[language].calendar.details,exact:true}).click();assert(new URL(page.url()).pathname.includes('copa-de-marianas-2027'));await ready(page,path);
    }
    if(name==='past-events') {assert(await page.locator('.event-card').count()>0);assert.equal(await page.getByRole('button',{name:locales[language].calendar.register,exact:true}).count(),0);}
    if(name==='404') {assert.match(await page.locator('body').innerText(),/404/);assert(await page.getByRole('link',{name:locales[language].notFound?.home || /home/i}).count() || await page.locator('main a').count());}
    await overflow(page);await shot(page,`${name}-${language}-${width}`);
    outcomes.push({case:name,language,width,status:'passed'});console.log('PASS',name,language,width);
   } catch(error) {outcomes.push({case:name,language,width,status:'failed',error:error.message});console.log('FAIL',name,language,width,error.message);await page.screenshot({path:`${directory}failure-${name}-${language}-${width}.png`});}
  }
  // Existing navigation keyboard recovery remains intact.
  await ready(page,'/');
  const languageButton=page.getByRole('button',{name:new RegExp(locales[language].nav.language)});await languageButton.click();await page.keyboard.press('Escape');assert.equal(await languageButton.getAttribute('aria-expanded'),'false');
  if(width===1440) { const menu=page.getByRole('button',{name:locales[language].nav.events,exact:true});await menu.focus();await page.keyboard.press('Enter');const child=page.getByRole('link',{name:locales[language].nav.calendar,exact:true}).first();await child.focus();await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');assert(await menu.evaluate(el=>el===document.activeElement)); }
  if(width===390) {const menu=page.getByRole('button',{name:locales[language].nav.toggleMenu});await menu.click();await page.keyboard.press('Escape');assert.equal(await menu.getAttribute('aria-expanded'),'false');}
  await context.unrouteAll({behavior:'wait'});await context.close();
 }
 for(const width of (process.env.QA_SKIP_FIXTURES ? [] : [390,1440])) {
  const completed=events.filter(event=>event.status==='completed');
  const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Pacific/Guam',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  for(const kind of ['off-season','live','future-opening','pending']) {
   const fixture=kind==='off-season'?completed:events.map(event=>event.id===copa.id?{...event,...(kind==='live'?{date:today,end_date:today}:kind==='future-opening'?{registration_opens_on:'2027-01-01'}:{registration_not_open:true})}:event);
   const {context,page}=await setup(width,'en',fixture);
   try {
    await ready(page,'/');await overflow(page);
    if(kind==='off-season') {assert.equal(await page.getByRole('button',{name:'Register',exact:true}).count(),0);const results=page.getByRole('link',{name:locales.en.season.latestResults,exact:true});if(await results.count()){await results.click();await page.locator('#results').waitFor({timeout:60000});await ready(page,'/');}}
    if(kind==='live') {assert(await page.locator('.home-event-hero').getByText(locales.en.season.phase.live,{exact:true}).count());}
    if(['future-opening','pending'].includes(kind)) {
     assert.equal(await page.locator('.home-event-hero').getByRole('button',{name:'Register',exact:true}).count(),0);assert(await page.locator('.home-event-hero').getByRole('link',{name:locales.en.visualRefresh.eventInfo,exact:true}).count());
     await ready(page,'/events/copa-de-marianas-2027');assert.equal(await page.getByRole('button',{name:'Register',exact:true}).count(),0);await page.evaluate(()=>scrollTo(0,1200));assert.equal(await page.locator('.mobile-register-bar').count(),0);await page.evaluate(()=>scrollTo(0,0));
    }
    await shot(page,`fixture-${kind}-${width}`);outcomes.push({case:kind,width,language:'en',status:'passed'});console.log('PASS fixture',kind,width);
   }catch(error){outcomes.push({case:kind,width,status:'failed',error:error.message});console.log('FAIL fixture',kind,width,error.message);}
   await context.unrouteAll({behavior:'wait'});await context.close();
  }
 }
 // Observe normal motion after earlier runs covered the reduced-motion branch.
 const {context,page}=await setup(390,'en',null,'no-preference');await ready(page,'/');await page.getByRole('button',{name:'Register',exact:true}).first().click();await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});outcomes.push({case:'normal-and-reduced-motion',status:'passed'});await context.unrouteAll({behavior:'wait'});await context.close();
} finally {
 await browser.close();
 writeFileSync(new URL(process.env.QA_RESULTS || './qa-results.json',import.meta.url),JSON.stringify({testedAt:new Date().toISOString(),source:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),workingTree:execFileSync('git',['status','--short','--','web/src'],{encoding:'utf8'}).trim() || 'clean implementation source',outcomes,errors,blockedWrites},null,2));
}
if(outcomes.some(row=>row.status==='failed')||errors.length||blockedWrites.length)process.exitCode=1;
