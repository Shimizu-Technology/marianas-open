import test from 'node:test';
import assert from 'node:assert/strict';
import { FetchError, classifyFetchError } from '../src/errors.js';

for (const category of ['disallowed_redirect', 'disallowed_method', 'boundary_violation',
  'disallowed_navigation', 'browser_launch_failed', 'aborted_deadline']) {
  test(`safe browser category: ${category}`, () => assert.equal(classifyFetchError(new FetchError(category)), category));
}
test('Playwright timeout is categorized without its message', () => {
  const error = new Error('private URL and HTML'); error.name = 'TimeoutError';
  assert.equal(classifyFetchError(error), 'navigation_timeout');
});
test('extracts only a Chromium network code', () => {
  assert.equal(classifyFetchError(new Error('page.goto: net::ERR_CONNECTION_RESET at https://private.test/secret')), 'net_ERR_CONNECTION_RESET');
});
test('abort/deadline takes precedence over browser-closed or timeout errors', () => {
  assert.equal(classifyFetchError(new Error('Target closed'), AbortSignal.abort()), 'aborted_deadline');
});
test('unknown errors and forged categories never expose arbitrary content', () => {
  for (const error of [new Error('https://private.test/secret'), new FetchError('private'), { category: 'disallowed_method' }, null]) {
    assert.equal(classifyFetchError(error), 'unknown');
  }
});
