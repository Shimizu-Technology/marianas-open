import test from 'node:test';
import assert from 'node:assert/strict';
import { FetchError, classifyFetchError, describeRejectedUrl } from '../src/errors.js';

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

test('rejected hop descriptions name the failed rule without path, query or credentials', () => {
  const hosts = ['asjjf.org', 'dumau.asjjf.org'];
  assert.deepEqual(describeRejectedUrl('http://asjjf.org/main/eventResults/1514', hosts), { rule: 'scheme', scheme: 'http', host: 'asjjf.org', port: '' });
  assert.deepEqual(describeRejectedUrl('https://www.asjjf.org/login?next=/x', hosts), { rule: 'host', scheme: 'https', host: 'www.asjjf.org', port: '' });
  assert.deepEqual(describeRejectedUrl('https://asjjf.org:8443/a', hosts), { rule: 'port', scheme: 'https', host: 'asjjf.org', port: '8443' });
  const withUser = describeRejectedUrl('https://user:pw@asjjf.org/a', hosts);
  assert.deepEqual(withUser, { rule: 'credentials', scheme: 'https', host: 'asjjf.org', port: '' });
  assert.ok(!JSON.stringify(withUser).includes('pw') && !JSON.stringify(withUser).includes('user'));
  assert.deepEqual(describeRejectedUrl('javascript:alert(1)', hosts), { rule: 'scheme', scheme: 'other', host: 'invalid', port: '' });
  assert.deepEqual(describeRejectedUrl('not a url', hosts), { rule: 'unparseable' });
});
