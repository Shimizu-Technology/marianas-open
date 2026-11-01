import test from 'node:test';
import assert from 'node:assert/strict';
import { ApiClient } from '../src/api.js';
import { sign } from '../src/signing.js';
const config = { apiBase: 'https://api.example', secret: 'secret', fetcherId: 'mini' };

test('network and 5xx retries back off and re-sign; exact request body and paths', async () => {
  const calls = [], waits = [];
  const api = new ApiClient(config, { now: () => 1793577600000 + calls.length * 1000,
    sleep: async ms => waits.push(ms), fetchImpl: async (url, options) => {
      calls.push([url, options]);
      if (calls.length === 1) throw new TypeError('network');
      if (calls.length === 2) return new Response('', { status: 503 });
      return new Response('{}', { status: 201 });
    } });
  await api.snapshot({ html: '日本語' });
  assert.deepEqual(waits, [1000, 2000]);
  for (const [url, opts] of calls) {
    assert.equal(url.pathname, '/api/v1/internal/asjjf/snapshots');
    assert.equal(opts.redirect, 'error');
    assert.equal(opts.headers['X-Asjjf-Fetcher-Id'], 'mini');
    assert.equal(opts.headers['X-Asjjf-Signature'], sign('secret', opts.headers['X-Asjjf-Timestamp'], 'POST', url.pathname, opts.body));
  }
  assert.notEqual(calls[0][1].headers['X-Asjjf-Signature'], calls[1][1].headers['X-Asjjf-Signature']);
});
for (const status of [400, 401, 403, 409, 422, 429]) test(`HTTP ${status} is never retried`, async () => {
  let count = 0;
  const api = new ApiClient(config, { fetchImpl: async () => { count++; return new Response('', { status }); } });
  await assert.rejects(api.work(), new RegExp(String(status)));
  assert.equal(count, 1);
});
test('retry cap and timeouts', async () => {
  let count = 0;
  const api = new ApiClient(config, { timeoutMs: 5, sleep: async () => {}, fetchImpl: async (_, { signal }) => {
    count++;
    await new Promise((_, reject) => { signal.addEventListener('abort', () => reject(signal.reason)); setTimeout(() => {}, 10); });
  } });
  await assert.rejects(api.work());
  assert.equal(count, 4);
});
test('invalid JSON is not retried; empty heartbeat response accepted', async () => {
  let count = 0;
  const api = new ApiClient(config, { fetchImpl: async () => { count++; return new Response('bad'); } });
  await assert.rejects(api.work(), /Invalid API JSON/);
  assert.equal(count, 1);
  const heartbeat = new ApiClient(config, { fetchImpl: async () => new Response(null, { status: 204 }) });
  assert.equal(await heartbeat.heartbeat({}), null);
});
