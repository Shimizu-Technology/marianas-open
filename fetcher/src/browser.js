import { chromium } from 'playwright-core';
import { allowedUrl } from './config.js';

export function isChallenge({ title = '', html = '', status = 0 }) {
  return status === 403 || status === 429 || /just a moment|attention required|verify (?:that )?you are human|security verification/i.test(title) ||
    /id=["']challenge-form|cf-chl-|challenges\.cloudflare\.com\/turnstile/i.test(html);
}

export async function fetchPage(url, config, { signal, launch = options => chromium.launch(options), now = Date.now, validateUrl = allowedUrl } = {}) {
  validateUrl(url, config.allowedHosts);
  const browser = await launch({ headless: false, executablePath: config.executablePath,
    // Containers generally lack the kernel facilities needed for Chromium's sandbox.
    args: ['--no-sandbox', '--disable-dev-shm-usage'], timeout: 30000 });
  const stop = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener('abort', stop, { once: true });
  let challengeSeen = false;
  let status = null;
  try {
    signal?.throwIfAborted();
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Pacific/Guam', serviceWorkers: 'block' });
    let boundaryError;
    const rejectHop = () => { boundaryError = new Error('disallowed_navigation'); stop(); };
    // Observe title/markup changes from document creation, including challenges that
    // disappear before DOMContentLoaded. No browser identity or fingerprint changes.
    await context.exposeBinding('reportChallenge', () => { challengeSeen = true; });
    await context.addInitScript(() => {
      const observe = () => {
        if (/just a moment|attention required|verify (?:that )?you are human|security verification/i.test(document.title) ||
            document.querySelector('#challenge-form, [src*="cf-chl-"], [src*="challenges.cloudflare.com/turnstile"]')) {
          void globalThis.reportChallenge();
        }
      };
      new MutationObserver(observe).observe(document, { childList: true, subtree: true, characterData: true, attributes: true });
      observe();
    });
    const page = await context.newPage();
    page.on('request', request => {
      if (!request.isNavigationRequest()) return;
      try {
        for (let hop = request; hop; hop = hop.redirectedFrom()) {
          validateUrl(hop.url(), config.allowedHosts);
          if (hop.method() !== 'GET') throw new Error('disallowed_method');
        }
      } catch { rejectHop(); }
    });
    // Enforce the boundary before following redirects, including script navigations.
    // Leave ordinary browser subresources alone, as in the verified probe.
    // The fetcher itself issues only GET navigation, never in-page XHR/POST.
    await context.route('**/*', async route => {
      const request = route.request();
      try {
        if (request.isNavigationRequest()) {
          validateUrl(request.url(), config.allowedHosts);
          if (request.method() !== 'GET') return route.abort();
        }
        return route.continue();
      } catch { return route.abort(); }
    });
    page.on('response', response => {
      if (!response.request().isNavigationRequest()) return;
      if (isChallenge({ status: response.status() })) challengeSeen = true;
      try {
        validateUrl(response.url(), config.allowedHosts);
        if (response.status() >= 300 && response.status() < 400) {
          const location = response.headers().location;
          if (location) validateUrl(new URL(location, response.url()).href, config.allowedHosts);
        }
      } catch { rejectHop(); }
      if (response.frame() === page.mainFrame()) status = response.status();
    });
    let navigationError;
    try { await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }); }
    catch (error) { navigationError = error; }
    const deadline = now() + 30000;
    if (boundaryError) throw boundaryError;
    while (true) {
      const title = await page.title();
      if (isChallenge({ title, html: await page.content(), status })) challengeSeen = true;
      if (!/just a moment/i.test(title) || now() >= deadline) break;
      signal?.throwIfAborted();
      await page.waitForTimeout(1000);
    }
    const html = await page.content();
    const final_url = page.url();
    validateUrl(final_url, config.allowedHosts);
    if (boundaryError) throw boundaryError;
    const challenged = challengeSeen || isChallenge({ title: await page.title(), html, status });
    if (navigationError && !challenged) throw navigationError;
    return { final_url, http_status: status, html,
      outcome: challenged ? 'challenged' : status >= 200 && status < 300 ? 'ok' : 'error',
      error: challenged ? 'challenge_detected' : status >= 200 && status < 300 ? null : 'http_error' };
  } catch (error) {
    // Challenge evidence survives a later timeout, abort, or rejected redirect.
    // No HTML or final URL is returned when navigation could not be validated.
    if (challengeSeen) return { final_url: null, http_status: status, html: null,
      outcome: 'challenged', error: 'challenge_detected' };
    throw error;
  } finally {
    signal?.removeEventListener('abort', stop);
    await browser.close();
  }
}
