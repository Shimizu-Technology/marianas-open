import { chromium } from '../../../fetcher/node_modules/playwright-core/index.mjs';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const session = process.env.DEV_LIFECYCLE_SESSION_ID;
if (!session) throw new Error('Set DEV_LIFECYCLE_SESSION_ID.');
const evidence = fileURLToPath(new URL('../../../docs/qa/d5-attention/', import.meta.url));
await mkdir(evidence, { recursive: true });
const lifecycle = (...args) => {
  const result = spawnSync('dev-lifecycle', args, { encoding: 'utf8' });
  if (result.status) throw new Error(result.stderr || result.stdout);
};
const server = await chromium.launchServer({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const pid = String(server.process().pid);
lifecycle('claim', '--session', session, 'process', pid, '--reason', 'D5 isolated synthetic browser checks');
const results = [];
try {
  const browser = await chromium.connect(server.wsEndpoint());
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const base = 'http://127.0.0.1:5395/qa/attention/index.html';
    await page.goto(base);
    await page.getByText('4 items to review', { exact: false }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    const checkWidth = async () => {
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) throw new Error(`Overflow at ${width}`);
    };
    await checkWidth();
    await page.screenshot({ path: `${evidence}${width}-items.png`, fullPage: true });
    await page.getByRole('link', { name: 'Open: Results need approval: Copa de Marianas 2027', exact: true }).click();
    await page.getByRole('heading', { name: 'Event results destination' }).waitFor();
    await page.getByRole('link', { name: 'Back to Needs attention' }).click();
    await page.getByRole('link', { name: 'Staff help', exact: true }).filter({ visible: true }).last().click();
    await page.getByRole('heading', { name: 'Staff help', exact: true }).waitFor();
    await page.getByRole('link', { name: 'Upload photos, import a ZIP and review albums', exact: true }).click();
    await page.getByRole('heading', { name: 'Upload photos, import a ZIP and review albums', exact: true }).waitFor();
    await checkWidth();
    await page.screenshot({ path: `${evidence}${width}-help.png`, fullPage: true });
    if (width === 390) {
      await page.getByRole('button', { name: 'Open admin navigation' }).click();
      await page.locator('#mobile-admin-nav').getByRole('link', { name: 'Needs attention', exact: true }).click();
    } else await page.getByRole('link', { name: 'Needs attention', exact: true }).first().click();
    await page.getByRole('heading', { name: 'Needs attention', exact: true }).waitFor();
    await page.goto(`${base}?state=empty`);
    await page.getByText('Nothing needs attention.', { exact: true }).waitFor();
    await page.locator('time').waitFor();
    await page.screenshot({ path: `${evidence}${width}-empty.png`, fullPage: true });
    await page.goto(`${base}?state=error`);
    await page.getByRole('alert').waitFor();
    if (await page.getByText('Nothing needs attention.', { exact: true }).count()) throw new Error('False all-clear during error');
    await page.getByRole('button', { name: 'Try again', exact: true }).click();
    await page.getByText('4 items to review', { exact: false }).waitFor();
    await page.goto(`${base}?role=viewer&page=event`);
    await page.getByRole('textbox', { name: 'Name', exact: true }).waitFor();
    if (!await page.getByRole('button', { name: 'Save', exact: true }).isDisabled()) throw new Error('Viewer save enabled');
    const files = await page.locator('input[type="file"]').evaluateAll(inputs => inputs.every(input => input.disabled));
    if (!files) throw new Error('Viewer upload enabled');
    if (width === 390) await page.getByRole('combobox', { name: 'Event section', exact: true }).selectOption('publishing');
    else await page.getByRole('navigation', { name: 'Event sections' }).getByRole('button', { name: /Publishing/ }).click();
    if (!await page.getByRole('button', { name: 'Publish event', exact: true }).isDisabled()) throw new Error('Viewer publish enabled');
    await checkWidth();
    await page.screenshot({ path: `${evidence}${width}-viewer.png`, fullPage: true });
    if (errors.length) throw new Error(JSON.stringify(errors));
    results.push({ width, result: 'passed', flows: ['grouped items and long title', 'deep link', 'help topic and return navigation', 'empty with timestamp', 'error/retry', 'viewer save/publish/upload disabled'], pageErrors: errors, horizontalOverflow: false });
    await context.close();
  }
  await browser.close();
  await writeFile(`${evidence}browser-results.json`, JSON.stringify({ source: spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim(), synthetic: true, realClerk: 'not_run', physicalPhone: 'not_run', results }, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await server.close();
  lifecycle('release', '--session', session, 'process', pid);
}
