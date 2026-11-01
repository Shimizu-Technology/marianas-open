import { chromium } from '../../../fetcher/node_modules/playwright-core/index.mjs';
import { spawnSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const session = process.env.DEV_LIFECYCLE_SESSION_ID;
if (!session) throw new Error('Set DEV_LIFECYCLE_SESSION_ID to the task lifecycle session.');
const evidence = fileURLToPath(new URL('../../../docs/qa/photo-intake/', import.meta.url));
await mkdir(evidence, { recursive: true });
const lifecycle = (...args) => {
  const result = spawnSync('dev-lifecycle', args, { encoding: 'utf8' });
  if (result.status) throw new Error(result.stderr || result.stdout);
};
const server = await chromium.launchServer({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const pid = String(server.process().pid);
lifecycle('claim', '--session', session, 'process', pid, '--reason', 'D4 isolated headless browser QA');
const results = [];
try {
  const browser = await chromium.connect(server.wsEndpoint());
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5394/qa/photos/index.html');
    await page.getByRole('heading', { name: 'Photo library 12' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    if (width === 390) {
      await page.getByRole('button', { name: 'Open admin navigation' }).click();
      await page.getByRole('link', { name: 'Photos', exact: true }).filter({ visible: true }).click();
      await page.getByRole('heading', { name: 'Photos', exact: true }).waitFor();
      await page.getByRole('link', { name: /Marianas Open 2027/ }).click();
      await page.getByRole('heading', { name: 'Photo library 12' }).waitFor();
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (overflow) throw new Error(`Horizontal overflow at ${width}px`);
    await page.screenshot({ path: `${evidence}${width}-upload.png`, fullPage: true });
    if (width === 390) await page.getByRole('button', { name: 'Manage albums' }).click();
    await page.getByLabel('New album').fill('Podium Day 2');
    await page.getByRole('button', { name: 'Create album', exact: true }).click();
    await page.getByText('Album created. Choose it above or in the upload album menu.').waitFor();
    await page.getByRole('combobox', { name: /Upload to album/ }).selectOption({ label: 'Podium Day 2' });
    await page.getByRole('button', { name: 'Rename Podium Day 2', exact: true }).click();
    await page.getByLabel('Album name', { exact: true }).fill('Awards Day 2');
    await page.getByRole('button', { name: 'Save name' }).click();
    await page.getByText('Album renamed.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Move Awards Day 2 up' }).click();
    await page.getByText('Album order saved.', { exact: true }).waitFor();
    await page.getByRole('button', { name: 'Preview day albums' }).click();
    await page.getByRole('button', { name: 'Confirm 12 photo assignments' }).waitFor();
    await page.getByRole('button', { name: 'Confirm 12 photo assignments' }).click();
    await page.getByText('Day albums applied to the confirmed photos.').waitFor();
    await page.getByRole('combobox', { name: 'Photo visibility filter' }).selectOption('review');
    await page.getByRole('heading', { name: 'Photo library 2' }).waitFor();
    await page.getByLabel('Select DSC_4303.jpg', { exact: true }).check();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Hide', exact: true }).click();
    await page.getByText('1 photos hidden.', { exact: true }).waitFor();
    await page.getByRole('heading', { name: 'Photo library 2' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${evidence}${width}-review.png`, fullPage: false });
    await page.getByLabel('Select DSC_4303.jpg', { exact: true }).check();
    await page.getByRole('button', { name: 'Approve review', exact: true }).click();
    await page.getByRole('heading', { name: 'Photo library 1' }).waitFor();
    await page.getByRole('combobox', { name: 'Photo visibility filter' }).selectOption('hidden');
    await page.getByRole('heading', { name: 'Photo library 1' }).waitFor();
    if (!await page.getByLabel('Select DSC_4303.jpg', { exact: true }).count()) throw new Error('Manual hide was lost during approval');
    await page.getByRole('searchbox', { name: 'Search by filename' }).fill('no-match');
    await page.getByRole('button', { name: 'Search photos' }).click();
    await page.getByText('No photos match these filters.').waitFor();
    await page.getByRole('button', { name: 'Clear search and visibility filter' }).click();
    await page.getByRole('heading', { name: 'Photo library 12' }).waitFor();
    const brokenImages = await page.locator('img').evaluateAll(images => images.filter(image => image.complete && !image.naturalWidth).map(image => image.src));
    if (brokenImages.length || errors.length) throw new Error(JSON.stringify({ brokenImages, errors }));
    results.push({ width, result: 'passed', mobileNav: width === 390, flows: ['album create/rename/reorder', 'upload album choice', 'confirmed day assignments', 'review filter', 'confirmed hide', 'approve preserves manual hide', 'filename search/empty/recover'], horizontalOverflow: false, pageErrors: errors, brokenImages });
    await context.close();
  }
  await browser.close();
  await writeFile(`${evidence}browser-results.json`, JSON.stringify({ synthetic: true, physicalPhone: 'not_run', results }, null, 2) + '\n');
  console.log(JSON.stringify(results));
} finally {
  await server.close();
  lifecycle('release', '--session', session, 'process', pid);
}
