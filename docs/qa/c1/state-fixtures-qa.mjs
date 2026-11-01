import { chromium } from '../../../fetcher/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

execFileSync('dev-lifecycle', ['claim', '--session', '01a198dd-0de6-7223-b7b8-92e7e3dfe41c', 'process', String(process.pid), '--reason', 'C1 isolated off-season/cancelled fixtures']);
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const base = 'https://marianas-open-api.onrender.com';
const source = await browser.newContext();
const events = await (await source.request.get(`${base}/api/v1/events`)).json();
const copa = events.find(event => event.slug === 'copa-de-marianas-2026');
const mo = events.find(event => event.slug === 'marianas-open-2026');
const next = events.find(event => event.slug === 'copa-de-marianas-2027');
const summary = await (await source.request.get(`${base}/api/v1/events/${copa.slug}/results/summary`)).json();
const observations = [];
const screenshots = fileURLToPath(new URL('./screenshots/', import.meta.url));
try {
  for (const width of [390, 1440]) {
    for (const scenario of ['off-season', 'empty', 'cancelled', 'live', 'summary-error']) {
      const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 900 }, reducedMotion: 'reduce' });
      const fixture = scenario === 'off-season' ? [{ ...mo, results_count: 0 }, { ...copa, results_count: summary.total_results }]
        : scenario === 'empty' ? [] : scenario === 'summary-error' ? [{ ...copa, results_count: summary.total_results }] : [{ ...next, status: scenario === 'cancelled' ? 'cancelled' : 'upcoming', date: scenario === 'live' ? '2026-11-02' : next.date, end_date: null }];
      await context.route(`${base}/api/v1/**`, async route => {
        assert.equal(route.request().method(), 'GET');
        const headers = { 'access-control-allow-origin': 'http://127.0.0.1:5351', 'access-control-allow-credentials': 'true', 'content-type': 'application/json' };
        if (scenario === 'summary-error' && new URL(route.request().url()).pathname.endsWith('/results/summary')) await route.fulfill({ status: 503, headers, body: '{}' });
        else if (new URL(route.request().url()).pathname === '/api/v1/events') await route.fulfill({ status: 200, headers, body: JSON.stringify(fixture) });
        else { const response = await route.fetch(); await route.fulfill({ response, headers: { ...response.headers(), ...headers } }); }
      });
      const page = await context.newPage();
      const path = scenario === 'summary-error' ? `/events/${copa.slug}` : scenario === 'cancelled' || scenario === 'live' ? `/events/${next.slug}` : '/';
      await page.goto(`http://127.0.0.1:5351${path}`);
      await page.locator('h1').waitFor();
      if (scenario === 'off-season' || scenario === 'empty') {
        const note = page.getByText('Next season’s dates will be announced here.', { exact: true });
        await note.waitFor();
        await note.scrollIntoViewIfNeeded();
        if (scenario === 'off-season') {
          assert.ok(await page.getByRole('heading', { name: '2026 season complete', exact: true }).count());
          assert.equal(await page.getByRole('link', { name: 'Latest results', exact: true }).getAttribute('href'), `/events/${copa.slug}#results`);
          assert.equal(await page.getByRole('link', { name: 'Latest photo gallery', exact: true }).getAttribute('href'), `/events/${mo.slug}/gallery`);
        }
      } else if (scenario === 'summary-error') {
        await page.getByPlaceholder('Search by name or academy...').waitFor();
        assert.ok(await page.locator('#results').getByRole('button').count());
      } else {
        const text = await page.locator('body').innerText();
        assert.match(text, scenario === 'cancelled' ? /EVENT CANCELLED/i : /HAPPENING NOW/i);
        if (scenario === 'cancelled') assert.doesNotMatch(text, /REGISTER TO COMPETE|TICKET SALES|BOOK NOW|TRAVEL INFORMATION/);
      }
      await page.screenshot({ path: `${screenshots}fixture-${scenario}-${width}.png` });
      if (scenario === 'off-season') {
        await page.getByRole('link', { name: 'Latest results', exact: true }).click();
        await page.waitForFunction(() => { const box = document.getElementById('results')?.getBoundingClientRect(); return box && box.top >= 0 && box.top < innerHeight / 2; });
        await page.screenshot({ path: `${screenshots}fixture-results-link-${width}.png` });
        await page.goto('http://127.0.0.1:5351/calendar');
        const emptyHeading = page.getByRole('heading', { name: 'No upcoming events announced' });
        await emptyHeading.waitFor();
        await emptyHeading.scrollIntoViewIfNeeded();
        assert.ok(await page.getByRole('link', { name: 'Latest photo gallery' }).count());
        assert.equal(await page.getByRole('heading', { name: 'Qualifying Series' }).count(), 0);
        await page.screenshot({ path: `${screenshots}fixture-calendar-empty-${width}.png` });
        await page.getByRole('button', { name: 'Past Results', exact: true }).click();
        assert.ok(await page.getByRole('heading', { name: '2026', exact: true }).count());
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      observations.push({ width, scenario, status: 'passed' });
      console.log(`PASS ${width} ${scenario}`);
      await context.unrouteAll({ behavior: 'ignoreErrors' });
      await context.close();
    }
  }
} finally {
  writeFileSync(new URL('./state-fixtures-results.json', import.meta.url), JSON.stringify(observations, null, 2));
  await browser.close();
}
