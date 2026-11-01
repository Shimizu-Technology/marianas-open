// Run with PLAYWRIGHT_MODULE pointing to an existing playwright-core/index.mjs.
// Public API access is GET-only. Invitation routing is covered in Vitest;
// real Clerk development verification evidence is in docs/API-PUBLIC-HARDENING-QA.md.
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE);
const session = process.env.DEV_LIFECYCLE_SESSION;
assert.ok(session, 'DEV_LIFECYCLE_SESSION is required');
const out = process.env.QA_OUTPUT || '/tmp/marianas-w2-qa';
await mkdir(out, { recursive: true });
const server = await chromium.launchServer({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE });
const pid = String(server.process().pid);
execFileSync('dev-lifecycle', ['claim', '--session', session, 'process', pid, '--reason', 'Headless public hardening QA']);
const browser = await chromium.connect(server.wsEndpoint());
const results = [];
const errors = [];
async function record(name, fn) {
  await fn(); results.push({ name, status: 'passed' }); console.log(`PASS ${name}`);
}
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await context.route('**/*', async route => {
      const request = route.request();
      if (/marianas-open-api\.onrender\.com/.test(request.url())) {
        assert.equal(request.method(), 'GET', 'Production public API must be read-only');
      }
      await route.continue();
    });
    await record(`${width}: unknown slug renders noindex 404`, async () => {
      await page.goto('http://127.0.0.1:5312/events/bogus-event');
      await page.getByRole('heading', { name: '404', exact: true }).waitFor();
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow');
      assert.doesNotMatch(await page.locator('main').innerText(), /October 18|Official Qualifier/);
      await page.waitForFunction(() => [...document.querySelectorAll('main a')].some(link => link.textContent.includes('Back to Home') && getComputedStyle(link.parentElement).opacity === '1'));
      await page.screenshot({ path: `${out}/unknown-${width}.png`, fullPage: true });
    });
    await record(`${width}: ASJJF primary and SJJIF secondary rules links`, async () => {
      await page.goto('http://127.0.0.1:5312/rules');
      await page.getByRole('heading', { name: 'Competition Rules', exact: true }).waitFor();
      const primary = page.locator('a.bg-gold-500[href="https://asjjf.org/main/rules?pagesType=RULE_BOOK"]');
      assert.equal(await primary.count(), 1);
      assert.equal(await primary.getAttribute('target'), '_blank');
      assert.ok(await page.locator('a[href="https://sjjif.com/publicPages/pages?pagesType=RULE_BOOK"]').count());
      assert.equal(await page.locator('a[href*="2018-sjjif"]').count(), 0);
      assert.doesNotMatch(await page.locator('main').innerText(), /download.*PDF/i);
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal overflow');
      await primary.focus();
      await page.screenshot({ path: `${out}/rules-${width}.png`, fullPage: true });
    });
    await record(`${width}: /event uses production current main event or calendar`, async () => {
      const response = await context.request.get('https://marianas-open-api.onrender.com/api/v1/events');
      assert.ok(response.ok());
      const events = await response.json();
      const current = events.filter(event => event.is_main_event && ['upcoming', 'live'].includes(event.status))
        .sort((a, b) => (a.status === 'live' ? -1 : b.status === 'live' ? 1 : a.date.localeCompare(b.date)))[0];
      await page.goto('http://127.0.0.1:5312/event');
      if (current) {
        await page.waitForFunction(name => document.querySelector('main')?.innerText.includes(name), current.name);
        assert.doesNotMatch(await page.locator('main').innerText(), /Page Not Found/);
      } else {
        await page.waitForURL('**/calendar');
      }
      results.push({ name: `${width}: main event fixture`, detail: current?.slug || 'no active main event; calendar redirect' });
      await page.screenshot({ path: `${out}/event-${width}.png`, fullPage: true });
    });
    await context.close();
    // A separate context owns mocked event data; no production state changes.
    const mock = await browser.newContext({ viewport: { width, height: 900 } });
    const mockedPage = await mock.newPage();
    let release;
    const pending = new Promise(resolve => { release = resolve; });
    await mock.route('**/api/v1/events', async route => {
      await pending;
      await route.fulfill({ json: [] });
    });
    await record(`${width}: delayed empty events never flash fake details`, async () => {
      await mockedPage.goto('http://127.0.0.1:5312/events/bogus-event');
      await mockedPage.locator('main .animate-spin').waitFor();
      assert.equal(await mockedPage.getByRole('heading', { name: '404', exact: true }).count(), 0);
      assert.doesNotMatch(await mockedPage.locator('main').innerText(), /October 18|Official Qualifier|Marianas Open/);
      release();
      await mockedPage.getByRole('heading', { name: '404', exact: true }).waitFor();
      await mockedPage.goto('http://127.0.0.1:5312/event');
      await mockedPage.waitForURL('**/calendar');
    });
    await record(`${width}: /event selects current main event fixture`, async () => {
      await mock.unroute('**/api/v1/events');
      const response = await mock.request.get('https://marianas-open-api.onrender.com/api/v1/events');
      const events = await response.json();
      const fixture = { ...events[0], name: 'Local QA Main Event', slug: 'local-qa-main', status: 'upcoming', is_main_event: true, date: '2027-12-01', translations: {} };
      await mock.route('**/api/v1/events', route => route.fulfill({ json: [fixture] }));
      await mockedPage.goto('http://127.0.0.1:5312/event');
      await mockedPage.getByRole('heading', { name: 'Local QA Main Event', exact: true }).waitFor();
      assert.equal(new URL(mockedPage.url()).pathname, '/event');
      await mockedPage.screenshot({ path: `${out}/main-fixture-${width}.png`, fullPage: true });
    });
    await record(`${width}: failed events API never renders fallback event`, async () => {
      await mock.unroute('**/api/v1/events');
      await mock.route('**/api/v1/events', route => route.fulfill({ status: 503, json: { error: 'Local test unavailable' } }));
      await mockedPage.goto('http://127.0.0.1:5312/events/bogus-event');
      await mockedPage.locator('main .animate-spin').waitFor();
      assert.doesNotMatch(await mockedPage.locator('main').innerText(), /October 18|Official Qualifier/);
      await mockedPage.getByRole('alert').filter({ hasText: 'Events are taking a moment' }).waitFor();
      assert.equal(await mockedPage.getByRole('heading', { name: '404', exact: true }).count(), 0);
      await mockedPage.screenshot({ path: `${out}/events-error-${width}.png`, fullPage: true });
      await mock.unroute('**/api/v1/events');
      await mock.route('**/api/v1/events', route => route.fulfill({ json: [] }));
      await mockedPage.getByRole('button', { name: 'Try again', exact: true }).click();
      await mockedPage.getByRole('heading', { name: '404', exact: true }).waitFor();
      assert.equal(new URL(mockedPage.url()).pathname, '/events/bogus-event');
    });
    await mock.close();
  }
  assert.deepEqual(errors, [], 'No browser runtime errors');
} finally {
  await writeFile(`${out}/results.json`, JSON.stringify({ results, errors }, null, 2));
  await browser.close();
  await server.close();
  execFileSync('dev-lifecycle', ['release', '--session', session, 'process', pid]);
}
