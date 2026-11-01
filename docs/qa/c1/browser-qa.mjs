import { chromium } from '../../../fetcher/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const directory = fileURLToPath(new URL('./screenshots/', import.meta.url));
mkdirSync(directory, { recursive: true });
const session = process.env.DEV_LIFECYCLE_SESSION || '01a198dd-0de6-7223-b7b8-92e7e3dfe41c';
execFileSync('dev-lifecycle', ['claim', '--session', session, 'process', String(process.pid), '--reason', 'C1 isolated headless Chromium QA']);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const observations = [];
const blockedWrites = [];
const errors = [];
const apiOrigin = 'https://marianas-open-api.onrender.com';
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
await context.route(`${apiOrigin}/api/v1/**`, async route => {
  if (route.request().method() !== 'GET') { blockedWrites.push(route.request().url()); await route.abort(); }
  else {
    const response = await route.fetch();
    await route.fulfill({ response, headers: { ...response.headers(), 'access-control-allow-origin': 'http://127.0.0.1:5351', 'access-control-allow-credentials': 'true' } });
  }
});
const page = await context.newPage();
page.on('pageerror', error => errors.push(error.message));
async function ready(url) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('h1').first().waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
}
async function shot(name, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => Array.from(document.images).filter(image => { const box = image.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight && box.width > 0; }).every(image => image.complete), undefined, { timeout: 30000 });
  await page.waitForTimeout(250);
  await page.screenshot({ path: `${directory}${name}.png` });
}
try {

  // Before evidence: actual deployed site, never local snapshots represented as production.
  if (!process.env.SKIP_BEFORE) {
    await ready('https://marianasopen.com/events/marianas-open-2026');
    await shot('before-mo-2026-390', page.locator('#spectator-tickets'));
    await ready('https://marianasopen.com/events/marianas-pro-hong-kong-2026');
    await shot('before-hong-kong-390');
  }
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    for (const [name, path] of [
      ['home', '/'], ['calendar', '/calendar'],
      ['mo-2026', '/events/marianas-open-2026'],
      ['hong-kong-2026', '/events/marianas-pro-hong-kong-2026'],
      ['copa-2026', '/events/copa-de-marianas-2026'],
      ['copa-2027', '/events/copa-de-marianas-2027'],
      ['past-events', '/events/past'],
      ['gallery', '/events/marianas-open-2026/gallery'],
    ]) {
      await ready(`http://127.0.0.1:5351${path}`);
      if (name === 'home') await page.getByText('Up next', { exact: true }).waitFor({ timeout: 60000 });
      const text = await page.locator('body').innerText();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      assert.equal(overflow, false, `${path} overflows at ${width}`);
      if (['mo-2026', 'hong-kong-2026', 'copa-2026'].includes(name)) {
        assert.match(text, /EVENT COMPLETE/i);
        assert.doesNotMatch(text, /TICKET SALES CLOSED|BOOK NOW|Win Your Way|Special rates|TRAVEL OFFER|REGISTER TO COMPETE/i);
        if (name !== 'copa-2026') assert.match(text, /Results are being finalized/);
        if (name === 'mo-2026') assert.match(text, /884 photos/);
      }
      if (name === 'home') {
        const next = page.locator('section').filter({ hasText: /up next/i }).first();
        await next.waitFor();
        assert.match(await next.innerText(), /2027.*Copa|Copa.*2027/i);
        assert.match(await next.innerText(), /January 30, 2027/);
        assert.ok(await next.locator('a[href*="asjjf.org/main/eventInfo/"]').count());
        await shot(`home-next-${width}`, next);
        await next.getByRole('link', { name: 'Details', exact: true }).click();
        await page.locator('h1').waitFor();
        assert.equal(new URL(page.url()).pathname, '/events/copa-de-marianas-2027');
        await ready('http://127.0.0.1:5351/');
      }
      if (name === 'calendar') {
        await page.getByRole('button', { name: 'Past Results', exact: true }).click();
        assert.ok(await page.getByRole('heading', { name: '2026', exact: true }).count());
        await page.getByRole('button', { name: 'Upcoming', exact: true }).click();
      }
      if (name === 'copa-2026') {
        const search = page.getByPlaceholder('Search by name or academy...');
        // The published result search must remain usable in the new archive layout.
        if (await search.count()) {
          await search.fill('no-match-c1-qa');
          await page.getByText('No results match your filters.').waitFor();
          await search.clear();
        }
      }
      if (name === 'copa-2027') {
        assert.match(text, /UPCOMING EVENT/i);
        assert.ok(await page.locator('a[href*="asjjf.org/main/eventInfo/"]').count());
      }
      if (name === 'past-events') {
        assert.match(text, /Results pending/i);
        assert.match(text, /View Results/i);
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await shot(`${name}-${width}`);
      if (['mo-2026', 'hong-kong-2026', 'copa-2026'].includes(name)) await shot(`${name}-results-${width}`, page.locator('#results'));
      if (name === 'mo-2026') {
        const firstPhoto = page.locator('#gallery a[href*="?photo="]').first();
        const expectedPhoto = new URL(await firstPhoto.getAttribute('href'), page.url()).searchParams.get('photo');
        await firstPhoto.click();
        await page.getByRole('dialog').waitFor({ timeout: 60000 });
        await page.getByRole('dialog').locator('img').evaluate(image => image.decode());
        assert.equal(new URL(page.url()).searchParams.get('photo'), expectedPhoto);
        await shot(`gallery-selected-${width}`);
        await page.getByRole('button', { name: 'Next photo', exact: true }).click();
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      }
      if (name === 'gallery') {
        const before = await page.getByRole('button', { name: /^Open photo/ }).count();
        await page.getByRole('button', { name: 'Load more', exact: true }).click();
        await page.waitForFunction(count => document.querySelectorAll('button[aria-label^="Open photo"]').length > count, before);
        const category = page.getByRole('button', { name: /^Podium Day 1/ });
        if (await category.count()) {
          await category.click();
          await page.waitForFunction(() => !Array.from(document.querySelectorAll('button')).some(button => button.disabled && button.textContent.includes('All')));
        }
      }
      observations.push({ width, path, overflow, text: text.slice(0, 10000), status: 'passed' });
      console.log(`PASS ${width} ${path}`);
    }
    await page.evaluate(() => localStorage.setItem('i18nextLng', 'ja'));
    for (const [name, path] of [['home-ja', '/'], ['mo-2026-ja', '/events/marianas-open-2026'], ['gallery-ja', '/events/marianas-open-2026/gallery']]) {
      await ready(`http://127.0.0.1:5351${path}`);
      const text = await page.locator('body').innerText();
      assert.doesNotMatch(text, /Results are being finalized|UP NEXT|EVENT COMPLETE|Official gallery|View photo gallery/i);
      if (name === 'home-ja') await shot(`${name}-${width}`, page.locator('section').filter({ hasText: '次の大会' }).first());
      else await shot(`${name}-${width}`);
      observations.push({ width, path, language: 'ja', text: text.slice(0, 6000), status: 'passed' });
      console.log(`PASS ${width} JA ${path}`);
    }
    await page.evaluate(() => localStorage.setItem('i18nextLng', 'en'));
  }
  assert.deepEqual(blockedWrites, []);
  assert.deepEqual(errors, []);
} finally {
  writeFileSync(new URL('./browser-results.json', import.meta.url), JSON.stringify({ observations, errors, blockedWrites }, null, 2));
  await context.unrouteAll({ behavior: 'ignoreErrors' });
  await browser.close();
}
