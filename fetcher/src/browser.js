import { chromium } from 'playwright-core';
import { FetchError } from './errors.js';
import { allowedUrl } from './config.js';

export function isChallenge({ title = '', html = '', status = 0 }) {
  return status === 403 || status === 429 || /just a moment|attention required|verify (?:that )?you are human|security verification/i.test(title) ||
    /id=["']challenge-form|cf-chl-|challenges\.cloudflare\.com\/turnstile/i.test(html);
}

export async function fetchPage(url, config, { signal, launch = options => chromium.launch(options), now = Date.now, validateUrl = allowedUrl } = {}) {
  try { validateUrl(url, config.allowedHosts); }
  catch { throw new FetchError('boundary_violation'); }
  let browser;
  try { browser = await launch({ headless: false, executablePath: config.executablePath,
    // Containers generally lack the kernel facilities needed for Chromium's sandbox.
    args: ['--no-sandbox', '--disable-dev-shm-usage'], timeout: 30000 }); }
  catch { throw new FetchError('browser_launch_failed'); }
  const stop = () => { void browser.close().catch(() => {}); };
  signal?.addEventListener('abort', stop, { once: true });
  let challengeSeen = false;
  let status = null;
  let boundaryError;
  try {
    signal?.throwIfAborted();
    const context = await browser.newContext({ locale: 'en-US', timezoneId: 'Pacific/Guam', serviceWorkers: 'block' });
    const rejectHop = (category = 'disallowed_redirect') => { boundaryError ||= new FetchError(category); stop(); };
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
    // The host boundary, GET-only rule, and challenge status apply to every top-level
    // navigation (any frame without a parent, including popups) and its redirect chain.
    // ASJJF pages embed third-party iframes (Facebook, Google Tag Manager); child frames
    // load as in the verified probe and never affect the saved HTML.
    const isMainFrameNavigation = request => {
      if (!request.isNavigationRequest()) return false;
      try {
        if (typeof request.frame !== 'function') return true;
        const frame = request.frame();
        return !frame || typeof frame.parentFrame !== 'function' || frame.parentFrame() === null;
      } catch { return true; }
    };
    // The page that owns a request, or null when Playwright cannot tell yet.
    const pageOf = request => {
      try {
        if (typeof request.frame !== 'function') return null;
        const frame = request.frame();
        return frame && typeof frame.page === 'function' ? frame.page() : null;
      } catch { return null; }
    };
    // Only the original page is ever fetched; close anything the site tries to open.
    if (typeof context.on === 'function') {
      context.on('page', extra => { if (extra !== page) void extra.close().catch(() => {}); });
    }
    // Redirect hops never reach the route handler, so validate every top-level request
    // and response across the whole context (any popup included) and close the browser
    // on the first disallowed hop.
    const guardRequest = request => {
      if (!isMainFrameNavigation(request)) return;
      try {
        for (let hop = request; hop; hop = hop.redirectedFrom()) {
          validateUrl(hop.url(), config.allowedHosts);
          if (hop.method() !== 'GET') throw new FetchError('disallowed_method');
        }
      } catch (error) { rejectHop(error instanceof FetchError ? error.category : 'disallowed_redirect'); }
    };
    const guardResponse = response => {
      if (!isMainFrameNavigation(response.request())) return;
      if (isChallenge({ status: response.status() })) challengeSeen = true;
      try {
        validateUrl(response.url(), config.allowedHosts);
        if (response.status() >= 300 && response.status() < 400) {
          const location = response.headers().location;
          if (location) validateUrl(new URL(location, response.url()).href, config.allowedHosts);
        }
      } catch { rejectHop(); }
      try {
        if (response.frame() === page.mainFrame()) status = response.status();
      } catch { /* Early popup responses may not have a frame yet; they never set status. */ }
    };
    page.on('request', guardRequest);
    page.on('response', guardResponse);
    if (typeof context.on === 'function') {
      context.on('request', request => { if (pageOf(request) !== page) guardRequest(request); });
      context.on('response', response => { if (pageOf(response.request()) !== page) guardResponse(response); });
    }
    // Enforce the boundary before the first hop, including script navigations. Only the
    // original page may navigate at top level: popups are aborted before they load.
    // Leave ordinary browser subresources alone, as in the verified probe.
    // The fetcher itself issues only GET navigation, never in-page XHR/POST.
    await context.route('**/*', async route => {
      const request = route.request();
      try {
        if (isMainFrameNavigation(request)) {
          const owner = pageOf(request);
          if (owner && owner !== page) return route.abort();
          validateUrl(request.url(), config.allowedHosts);
          if (request.method() !== 'GET') return route.abort();
        }
        return route.continue();
      } catch { return route.abort(); }
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
    throw boundaryError || error;
  } finally {
    signal?.removeEventListener('abort', stop);
    await browser.close();
  }
}
