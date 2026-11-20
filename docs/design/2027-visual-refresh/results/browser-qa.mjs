import { chromium } from '../../../../fetcher/node_modules/playwright-core/index.mjs';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
const out = fileURLToPath(new URL('./', import.meta.url));
const session = process.env.DEV_LIFECYCLE_SESSION || '01a19b79-e9a2-7f70-94ee-f21d7a0cb887';
execFileSync('dev-lifecycle', [
  'claim',
  '--session',
  session,
  'process',
  String(process.pid),
  '--reason',
  'Visual B isolated Chromium QA',
]);
const browser = await chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const api = 'https://marianas-open-api.onrender.com';
const origin = 'http://127.0.0.1:5362';
const previous = process.env.QA_RESUME
  ? JSON.parse(readFileSync(`${out}browser-results.json`, 'utf8'))
  : {};
const observations = (previous.observations || []).map((row) => ({
    ...row,
    source: row.source || previous.source,
  })),
  attempts = previous.attempts || [],
  errors = previous.errors || [],
  blockedWrites = previous.blockedWrites || [];
mkdirSync(out, { recursive: true });
const context = await browser.newContext({
  reducedMotion: 'reduce',
  viewport: { width: 390, height: 844 },
  acceptDownloads: true,
});
await context.route(`${api}/api/v1/**`, async (route) => {
  if (route.request().method() !== 'GET') {
    blockedWrites.push(route.request().url());
    return route.abort();
  }
  const response = await route.fetch();
  await route.fulfill({
    response,
    headers: {
      ...response.headers(),
      'access-control-allow-origin': origin,
      'access-control-allow-credentials': 'true',
    },
  });
});
// Preserve real image bytes; permit the local-only download test to read the S3 blob.
await context.route('https://marianas-open.s3.ap-southeast-2.amazonaws.com/**', async (route) => {
  if (route.request().method() !== 'GET') return route.abort();
  const response = await route.fetch();
  await route.fulfill({
    response,
    headers: { ...response.headers(), 'access-control-allow-origin': origin },
  });
});
await context.addInitScript(() => {
  Object.defineProperty(navigator, 'share', { value: undefined, configurable: true });
  Object.defineProperty(navigator, 'clipboard', {
    value: {
      writeText: async (value) => {
        window.__copiedPhoto = value;
      },
    },
    configurable: true,
  });
});
const page = await context.newPage();
page.on('pageerror', (e) => errors.push(e.message));
const flush = () =>
  writeFileSync(
    `${out}browser-results.json`,
    JSON.stringify(
      {
        source: process.env.QA_SOURCE || 'working tree',
        observations,
        attempts,
        errors,
        blockedWrites,
      },
      null,
      2
    )
  );
async function ready(path) {
  await page.goto(`${origin}${path}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.locator('h1').first().waitFor({ timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
}
async function overflow() {
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
    false,
    'Horizontal overflow'
  );
}
async function shot(name, locator) {
  if (locator) await locator.scrollIntoViewIfNeeded();
  await page.waitForTimeout(250);
  await page.waitForFunction(
    () =>
      Array.from(document.images)
        .filter((image) => {
          const box = image.getBoundingClientRect();
          return box.bottom > 0 && box.top < innerHeight && box.width > 0;
        })
        .every((image) => image.complete && image.naturalWidth > 0),
    undefined,
    { timeout: 60000 }
  );
  await page.screenshot({ path: `${out}${name}.png` });
}
async function test(id, fn) {
  if (
    process.env.QA_CASES &&
    !process.env.QA_CASES.split(',').some((name) => id.endsWith('-' + name))
  )
    return;
  let result;
  try {
    await fn();
    result = { id, status: 'passed', source: process.env.QA_SOURCE };
  } catch (e) {
    result = { id, status: 'failed', error: e.stack, source: process.env.QA_SOURCE };
    await page.screenshot({ path: `${out}failure-${id}.png` }).catch(() => {});
  }
  const index = observations.findIndex((row) => row.id === id);
  if (index >= 0) {
    attempts.push(observations[index]);
    observations[index] = result;
  } else observations.push(result);
  flush();
  console.log(result.id, result.status);
}
try {
  for (const lang of process.env.QA_LANGS?.split(',') || ['en', 'ja', 'zh-Hant']) {
    const t = JSON.parse(
      readFileSync(new URL(`../../../../web/src/locales/${lang}.json`, import.meta.url), 'utf8')
    );
    await page.addInitScript((language) => localStorage.setItem('i18nextLng', language), lang);
    for (const width of process.env.QA_WIDTHS?.split(',').map(Number) || [390, 1440]) {
      await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
      for (const [name, slug] of [
        ['mo', 'marianas-open-2026'],
        ['hk', 'marianas-pro-hong-kong-2026'],
      ]) {
        await test(`${lang}-${width}-${name}-results`, async () => {
          await ready(`/events/${slug}`);
          const input = page.getByRole('searchbox', { name: t.results.searchPlaceholder });
          await input.waitFor({ timeout: 60000 });
          const section = page.locator('section').filter({ has: input });
          await section.locator('h5 button').first().waitFor();
          await shot(`${name}-results-${lang}-${width}`, section.locator('h3 button').first());
          await overflow();
          for (const discipline of ['gi', 'nogi']) {
            await section
              .getByRole('button', { name: t.officialRankings[discipline], exact: true })
              .click();
            const division = section.locator('h5 button').first();
            await division.waitFor();
            if ((await division.getAttribute('aria-expanded')) === 'false') await division.click();
            const athlete = section.locator('a[href^="/competitors/"]').first();
            await athlete.waitFor();
            assert.ok(await athlete.innerText());
            const headings = await section.locator('h5').allTextContents();
            assert.ok(
              headings.every((text) => (discipline === 'gi' ? !text.includes('No-Gi') : true))
            );
            await shot(`${name}-${discipline}-${lang}-${width}`, division);
            await overflow();
          }
          const opener = section.getByRole('button', { name: new RegExp(t.results.filters) });
          if (width === 390) {
            assert.equal(await opener.isVisible(), true);
            await opener.click();
            const dialog = page.getByRole('dialog', { name: t.results.filters });
            await dialog.waitFor();
            const close = dialog.getByRole('button', { name: t.results.closeFilters });
            const show = dialog.getByRole('button', { name: t.results.showResults });
            await close.focus();
            await page.keyboard.press('Shift+Tab');
            assert.equal(await show.evaluate((e) => e === document.activeElement), true);
            await page.keyboard.press('Tab');
            assert.equal(await close.evaluate((e) => e === document.activeElement), true);
            await dialog
              .getByRole('combobox', { name: t.results.allBelts, exact: true })
              .selectOption('white');
            await shot(`${name}-filters-${lang}-${width}`);
            await show.click();
            assert.equal(await opener.evaluate((e) => e === document.activeElement), true);
            await opener.click();
            assert.equal(
              await dialog
                .getByRole('combobox', { name: t.results.allBelts, exact: true })
                .inputValue(),
              'white'
            );
            await page.keyboard.press('Escape');
            assert.equal(await page.getByRole('dialog').count(), 0);
            await opener.click();
            await dialog
              .getByRole('combobox', { name: t.results.allBelts, exact: true })
              .selectOption('');
            await show.click();
          } else {
            assert.equal(await opener.isVisible(), false);
            await section
              .getByRole('combobox', { name: t.results.allBelts, exact: true })
              .selectOption('white');
            await section
              .getByRole('combobox', { name: t.results.allBelts, exact: true })
              .selectOption('');
          }
          await input.fill('zzzz-unmatched-athlete');
          await section.getByText(t.results.noMatchingResults, { exact: true }).waitFor();
          await input.fill('');
          await section.locator('h5 button').first().waitFor();
          await section.getByRole('button', { name: t.results.expandAll, exact: true }).click();
          assert.equal(await section.locator('h5 button[aria-expanded="false"]').count(), 0);
          await section.getByRole('button', { name: t.results.collapseAll, exact: true }).click();
          assert.equal(await section.locator('h5').count(), 0);
          await overflow();
        });
      }
      await test(`${lang}-${width}-rankings`, async () => {
        await ready('/rankings');
        await page.locator('a[href^="/competitors/"]:visible').first().waitFor({ timeout: 60000 });
        await overflow();
        await shot(`rankings-${lang}-${width}`);
        await page.getByRole('button', { name: t.officialRankings.nogi, exact: true }).click();
        await page.locator('a[href^="/competitors/"]:visible').first().waitFor({ timeout: 60000 });
        assert.equal(new URL(page.url()).searchParams.get('discipline'), 'nogi');
        await overflow();
      });
      await test(`${lang}-${width}-athlete`, async () => {
        await ready('/competitors/2278');
        await page.getByRole('heading', { name: 'Gabrieli Pessanha', exact: true }).waitFor();
        await page.getByRole('heading', { name: t.officialRankings.medalHistory }).waitFor();
        await overflow();
        await shot(`athlete-${lang}-${width}`);
        await shot(
          `athlete-history-${lang}-${width}`,
          page
            .locator('.ui-card')
            .filter({ has: page.getByRole('heading', { name: t.officialRankings.medalHistory }) })
            .last()
            .locator('a[href^="/events/"]')
            .first()
        );
        assert.ok(await page.locator('a[href="/teams/infight-japan"]').count());
      });
      await test(`${lang}-${width}-academy`, async () => {
        await ready('/teams/infight-japan');
        await page.getByRole('heading', { name: 'Infight Japan', exact: true }).waitFor();
        await page.locator('a[href^="/competitors/"]').first().waitFor();
        await overflow();
        await shot(`academy-${lang}-${width}`);
      });
      await test(`${lang}-${width}-teams`, async () => {
        await ready('/teams');
        const first = page.locator('a[href^="/teams/"]').first();
        await first.waitFor();
        await overflow();
        await shot(`teams-${lang}-${width}`);
        const input = page.getByRole('textbox', { name: t.academies.search });
        await input.fill('Infight');
        await page.getByRole('heading', { name: 'Infight Japan', exact: true }).waitFor();
        assert.equal(await page.locator('h2').count(), 1);
        await page.getByRole('link', { name: /Infight Japan/ }).click();
        await page.getByRole('heading', { name: 'Infight Japan', exact: true }).waitFor();
      });
      await test(`${lang}-${width}-competitors`, async () => {
        await ready('/competitors');
        await page.locator('a[href^="/competitors/"]').first().waitFor();
        await overflow();
        await shot(`competitors-${lang}-${width}`);
        await page
          .getByRole('textbox', { name: t.competitors.searchPlaceholder })
          .fill('Gabrieli Pessanha');
        await page.getByRole('heading', { name: 'Gabrieli Pessanha', exact: true }).waitFor();
      });
      await test(`${lang}-${width}-gallery`, async () => {
        await ready('/events/marianas-open-2026/gallery');
        const first = page.getByRole('button', {
          name: t.season.openPhoto.replace('{{number}}', '1'),
          exact: true,
        });
        await first.waitFor();
        await overflow();
        await shot(`gallery-${lang}-${width}`);
        await page.getByRole('button', { name: /Tournament Day 1/ }).click();
        await first.waitFor();
        await first.click();
        const dialog = page.getByRole('dialog');
        await dialog.waitFor();
        assert.ok(new URL(page.url()).searchParams.get('photo'));
        await overflow();
        assert.doesNotMatch(await dialog.innerText(), /455A|\.jpe?g/i);
        await dialog.getByRole('button', { name: t.galleryActions.share, exact: true }).click();
        await dialog.getByText(t.galleryActions.copied, { exact: true }).waitFor();
        assert.equal(await page.evaluate(() => window.__copiedPhoto), page.url());
        const link = page.url();
        const download = page.waitForEvent('download', { timeout: 60000 });
        await dialog.getByRole('button', { name: t.galleryActions.download, exact: true }).click();
        const file = await download;
        assert.ok((await file.suggestedFilename()).endsWith('.jpg'));
        assert.ok(statSync(await file.path()).size > 1000);
        await file.delete();
        await shot(`gallery-lightbox-${lang}-${width}`);
        await page.keyboard.press('ArrowRight');
        assert.notEqual(page.url(), link);
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.equal(await first.evaluate((e) => e === document.activeElement), true);
        assert.equal(new URL(page.url()).searchParams.has('photo'), false);
        await page.goto(link, { waitUntil: 'domcontentloaded' });
        await page.getByRole('dialog').waitFor({ timeout: 60000 });
        assert.equal(page.url(), link);
        await page.keyboard.press('Escape');
        await overflow();
      });
    }
  }
} finally {
  flush();
  await context.unrouteAll({ behavior: 'wait' });
  await browser.close();
  execFileSync('dev-lifecycle', ['release', '--session', session, 'process', String(process.pid)]);
}
if (observations.some((row) => row.status !== 'passed') || errors.length || blockedWrites.length)
  process.exitCode = 1;
