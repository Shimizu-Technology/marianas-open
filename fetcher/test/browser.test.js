import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchPage, isChallenge } from '../src/browser.js';
const config = { executablePath: '/usr/bin/chromium', allowedHosts: ['asjjf.org', 'dumau.asjjf.org'] };
for (const data of [{ title: 'Just a moment...' }, { title: 'Attention Required! | Cloudflare' },
  { status: 403 }, { status: 429 }, { html: '<form id="challenge-form">' }, { html: '<script src="/cdn-cgi/challenge-platform/cf-chl-test">' }]) {
  test(`challenge detected ${JSON.stringify(data)}`, () => assert.equal(isChallenge(data), true));
}
test('ordinary ASJJF page mentioning Cloudflare is not a challenge', () => {
  assert.equal(isChallenge({ title: 'ASJJF Results', status: 200, html: '<footer>Cloudflare</footer>' }), false);
});
function browserFixture({ fail = false, challenge = false } = {}) {
  let closed = 0,
    listeners = {}, routeHandler, launchOptions, contextOptions;
  const frame = {};
  const page = {
    on: (event, fn) => { listeners[event] = fn; }, mainFrame: () => frame,
    goto: async () => { if (fail) throw new Error('timeout'); listeners.response({ url: () => 'https://asjjf.org/', request: () => ({ isNavigationRequest: () => true }), frame: () => frame, status: () => challenge ? 403 : 200 }); },
    title: async () => challenge ? 'Verify you are human' : 'ASJJF Results',
    content: async () => '<html>Results</html>', url: () => 'https://asjjf.org/main/resultsList/2062',
  };
  const browser = { close: async () => { closed++; }, newContext: async options => {
    contextOptions = options;
    return { exposeBinding: async () => {}, addInitScript: async () => {}, newPage: async () => page, route: async (_, fn) => { routeHandler = fn; } };
  } };
  return { launch: async options => { launchOptions = options; return browser; },
    closed: () => closed, options: () => [launchOptions, contextOptions],
    route: async (url, method = 'GET', type = 'document') => {
      let action;
      await routeHandler({ request: () => ({ url: () => url, method: () => method, isNavigationRequest: () => type === 'document' }),
        continue: async () => { action = 'continue'; }, abort: async () => { action = 'abort'; } });
      return action;
    } };
}
test('fresh headed browser, locale/timezone and closure for each page', async () => {
  let launches = 0;
  for (let i = 0; i < 2; i++) {
    const f = browserFixture();
    const result = await fetchPage('https://asjjf.org/', config, { launch: async o => { launches++; return f.launch(o); } });
    assert.equal(result.outcome, 'ok'); assert.equal(f.closed(), 1);
    assert.equal(f.options()[0].headless, false);
    assert.equal(f.options()[0].executablePath, '/usr/bin/chromium');
    assert.deepEqual(f.options()[1], { locale: 'en-US', timezoneId: 'Pacific/Guam', serviceWorkers: 'block' });
    assert.equal(await f.route('https://evil.test/'), 'abort');
    assert.equal(await f.route('http://asjjf.org/'), 'abort');
    assert.equal(await f.route('https://asjjf.org/', 'POST'), 'abort');
    assert.equal(await f.route('https://asjjf.org/', 'GET', 'xhr'), 'continue');
    assert.equal(await f.route('https://cdn.example/asset.js', 'GET', 'script'), 'continue');
    assert.equal(await f.route('https://asjjf.org/'), 'continue');
  }
  assert.equal(launches, 2);
});
test('browser closes on navigation error, challenge, and already-aborted signal', async () => {
  const f = browserFixture({ fail: true });
  await assert.rejects(fetchPage('https://asjjf.org/', config, { launch: f.launch })); assert.equal(f.closed(), 1);
  const g = browserFixture({ challenge: true });
  assert.equal((await fetchPage('https://asjjf.org/', config, { launch: g.launch })).outcome, 'challenged'); assert.equal(g.closed(), 1);
  const h = browserFixture();
  await assert.rejects(fetchPage('https://asjjf.org/', config, { launch: h.launch, signal: AbortSignal.abort() })); assert.equal(h.closed(), 1);
});
test('challenge title can clear; persistent challenge waits no more than 30 seconds', async () => {
  for (const clears of [true, false]) {
    let time = 0, closed = false;
    const frame = {};
    const page = { mainFrame: () => frame,
      on: (event, listener) => { if (event === 'response') listener({ url: () => 'https://asjjf.org/', request: () => ({ isNavigationRequest: () => true }), frame: () => frame, status: () => 200 }); },
      goto: async () => {}, title: async () => clears && time >= 2000 ? 'ASJJF Results' : 'Just a moment...',
      waitForTimeout: async ms => { time += ms; }, content: async () => '<html></html>', url: () => 'https://asjjf.org/' };
    const launch = async () => ({ close: async () => { closed = true; }, newContext: async () => ({ exposeBinding: async () => {}, addInitScript: async () => {}, newPage: async () => page, route: async () => {} }) });
    const result = await fetchPage('https://asjjf.org/', config, { launch, now: () => time });
    assert.equal(result.outcome, 'challenged');
    assert.equal(time, clears ? 2000 : 30000);
    assert.equal(closed, true);
  }
});

test('challenge status is latched across later successful navigation responses', async () => {
  for (const status of [403, 429]) {
    const frame = {};
    let onResponse;
    const page = { on: (event, listener) => { if (event === 'response') onResponse = listener; },
      mainFrame: () => frame,
      goto: async () => {
        for (const code of [status, 200]) onResponse({ url: () => 'https://asjjf.org/',
          request: () => ({ isNavigationRequest: () => true }), frame: () => frame, status: () => code });
      },
      title: async () => 'Results', content: async () => '<html>Results</html>', url: () => 'https://asjjf.org/' };
    const launch = async () => ({ close: async () => {}, newContext: async () => ({
      exposeBinding: async () => {}, addInitScript: async () => {}, newPage: async () => page, route: async () => {} }) });
    assert.equal((await fetchPage('https://asjjf.org/', config, { launch })).outcome, 'challenged');
  }
});

test('request chain rejects an earlier HTTP hop even when the final request is allowed', async () => {
  let requestListener, closed = 0;
  const hop = (url, previous = null) => ({ isNavigationRequest: () => true, method: () => 'GET', url: () => url, redirectedFrom: () => previous });
  const page = { on: (event, listener) => { if (event === 'request') requestListener = listener; },
    goto: async () => requestListener(hop('https://asjjf.org/', hop('http://asjjf.org/'))) };
  const launch = async () => ({ close: async () => { closed++; }, newContext: async () => ({
    exposeBinding: async () => {}, addInitScript: async () => {}, newPage: async () => page, route: async () => {} }) });
  await assert.rejects(fetchPage('https://asjjf.org/', config, { launch }), /disallowed_navigation/);
  assert.ok(closed >= 1);
});

test('challenge evidence survives a later disallowed redirect without returning HTML', async () => {
  const listeners = {};
  const page = { on: (event, listener) => { listeners[event] = listener; },
    goto: async () => listeners.response({ request: () => ({ isNavigationRequest: () => true }),
      status: () => 403, url: () => 'https://evil.test/' }) };
  const launch = async () => ({ close: async () => {}, newContext: async () => ({
    exposeBinding: async () => {}, addInitScript: async () => {}, newPage: async () => page, route: async () => {} }) });
  const result = await fetchPage('https://asjjf.org/', config, { launch });
  assert.equal(result.outcome, 'challenged');
  assert.equal(result.html, null);
  assert.equal(result.final_url, null);
});
