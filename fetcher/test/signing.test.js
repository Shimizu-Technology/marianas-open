import test from 'node:test';
import assert from 'node:assert/strict';
import { sign, sha256 } from '../src/signing.js';

// Identical vectors are published in fetcher/README.md for the Rails client.
export const vectors = [
  { method: 'GET', path: '/api/v1/internal/asjjf/work?limit=1', body: '',
    hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    signature: '21bc697d9810c337c4777bde2328ea6dfa2e82a4656a99688a8cd0b9d36c0848' },
  { method: 'POST', path: '/api/v1/internal/asjjf/heartbeat', body: '{"fetcher_version":"1.0.0","run_finished_at":null}',
    hash: 'a0bc1dcdf9f57f096daa836ef61348c22ae925bb2329c5afabab7587bdd739f6',
    signature: '3cb94907bb4f7fd6c75ddffcf2dc41d4fe260080624ff28d0a5ec431527820e8' },
];
for (const v of vectors) test(`HMAC vector ${v.method}`, () => {
  assert.equal(sha256(v.body), v.hash);
  assert.equal(sign('test-secret', '1793577600', v.method, v.path, v.body), v.signature);
});
test('query and raw body bytes are signed exactly', () => {
  assert.notEqual(sign('s', '1', 'GET', '/?a=1&b=2'), sign('s', '1', 'GET', '/?b=2&a=1'));
  assert.notEqual(sign('s', '1', 'POST', '/', '{}'), sign('s', '1', 'POST', '/', '{ }'));
});
