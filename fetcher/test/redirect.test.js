import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright-core';
import { fetchPage } from '../src/browser.js';

const executablePath = process.env.FETCHER_TEST_CHROMIUM || (process.platform === 'darwin'
  ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : chromium.executablePath());
// Only this dependency injection permits HTTP loopback. Production always uses allowedUrl.
const loopbackOnly = value => {
  const url = new URL(value);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1') throw new Error('disallowed_url');
  return url;
};
test('real Chromium redirects: allowed hop succeeds, disallowed host closes without HTML; transient challenge latches', async t => {
  await access(executablePath); // Missing browser is a failure, never a silent skip.
  let port;
  const server = http.createServer((req, res) => {
    if (req.url === '/allowed') { res.writeHead(302, { Location: '/results' }); res.end(); }
    else if (req.url === '/disallowed') { res.writeHead(302, { Location: `http://localhost:${port}/results` }); res.end(); }
    else if (req.url === '/challenge') {
      res.end('<title>Just a moment...</title><script>setTimeout(() => { document.title="Results"; document.body.innerHTML="Results"; }, 100)</script>');
    } else if (req.url === '/markup') {
      res.end('<title>Results</title><form id="challenge-form"></form><script>setTimeout(() => document.querySelector("form").remove(), 100)</script>');
    } else { res.end('<title>Results</title><body>Saved results</body>'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  port = server.address().port;
  t.after(() => new Promise(resolve => server.close(resolve)));
  const options = { validateUrl: loopbackOnly };
  const config = { executablePath, allowedHosts: ['127.0.0.1'] };
  const base = `http://127.0.0.1:${port}`;
  assert.equal((await fetchPage(`${base}/allowed`, config, options)).outcome, 'ok');
  await assert.rejects(fetchPage(`${base}/disallowed`, config, options), error => {
    assert.match(error.message, /disallowed_redirect/);
    assert.equal(error.detail?.host, 'localhost');
    return true;
  });
  for (const path of ['/challenge', '/markup']) {
    assert.equal((await fetchPage(`${base}${path}`, config, options)).outcome, 'challenged');
  }
});
