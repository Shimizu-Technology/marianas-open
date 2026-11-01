import { chromium } from 'playwright-core';
import { allowedUrl } from './config.js';

export function isChallenge({ title = '', html = '', status = 0 }) {
  return status === 403 || status === 429 || /just a moment|attention required|verify (?:that )?you are human|security verification/i.test(title) ||
    /id=["']challenge-form|cf-chl-|challenges\.cloudflare\.com\/turnstile/i.test(html);
}

export async function fetchPage(url, config, { signal, launch = options => chromium.launch(options), now = Date.now } = {}) {
  allowedUrl(url, config.allowedHosts);
  const browser = await launch({ headless: false, executablePath: config.executablePath,
    // Containers generally lack the kernel facilities needed for Chromium's sandbox.
    args: ['--no-sandbox', '--disable-dev-shm-usage'], timeout: 30000 });
  const stop = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener('abort', stop, { once: true });
  try {
    signal?.throwIfAborted();
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Pacific/Guam', serviceWorkers: 'block' });
    const page = await context.newPage();
    // Enforce the boundary before following redirects, including script navigations.
    // Leave ordinary browser subresources alone, as in the verified probe.
    // The fetcher itself issues only GET navigation, never in-page XHR/POST.
    await context.route('**/*', async route => {
      const request = route.request();
      try {
        if (request.isNavigationRequest()) {
          allowedUrl(request.url(), config.allowedHosts);
          if (request.method() !== 'GET') return route.abort();
        }
        return route.continue();
      } catch { return route.abort(); }
    });
    let status = null;
    page.on('response', response => {
      if (response.request().isNavigationRequest() && response.frame() === page.mainFrame()) status = response.status();
    });
    let navigationError;
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
    catch (error) { navigationError = error; }
    const deadline = now() + 30000;
    while (/just a moment/i.test(await page.title()) && now() < deadline) {
      signal?.throwIfAborted();
      await page.waitForTimeout(1000);
    }
    const html = await page.content();
    const final_url = page.url();
    allowedUrl(final_url, config.allowedHosts);
    const challenged = isChallenge({ title: await page.title(), html, status });
    if (navigationError && !challenged) throw navigationError;
    return { final_url, http_status: status, html,
      outcome: challenged ? 'challenged' : status >= 200 && status < 300 ? 'ok' : 'error',
      error: challenged ? 'challenge_detected' : status >= 200 && status < 300 ? null : 'http_error' };
  } finally {
    signal?.removeEventListener('abort', stop);
    await browser.close();
  }
}
