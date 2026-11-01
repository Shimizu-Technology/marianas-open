import test from 'node:test';
import assert from 'node:assert/strict';
import { run, boundedSnapshot } from '../src/run.js';
import { MAX_BODY_BYTES, ApiClient, StaleLeaseError } from '../src/api.js';
import { loadConfig, allowedUrl } from '../src/config.js';
const config = { maxPages: 200, maxRunMinutes: 300, jitter: 0.15, allowedHosts: ['asjjf.org', 'dumau.asjjf.org'] };
const request = (id = 1, url = 'https://asjjf.org/main/resultsList/2062') => ({ id, url, lease_token: id.toString(16).padStart(64, '0') });
const ok = { final_url: 'https://asjjf.org/main/resultsList/2062', http_status: 200, outcome: 'ok', html: '<html>日本語</html>', error: null };
function fixture({ jobs = [request()], outcome = ok, configOverride = {}, fetchImpl } = {}) {
  const snapshots = [], beats = [], waits = [], fetched = [], logs = [];
  let time = 0, leases = 0;
  const controller = new AbortController();
  const api = { work: async limit => { assert.equal(limit, 1); leases++; return { requests: jobs.splice(0, 1), pacing_seconds: 90, paused_until: null }; },
    snapshot: async s => snapshots.push(s), heartbeat: async s => beats.push(s) };
  const options = { api, now: () => time, random: () => 0.5, signal: controller.signal, log: e => logs.push(e),
    sleep: async ms => { waits.push(ms); time += ms; }, fetchPage: async (...args) => { fetched.push(args); return fetchImpl ? fetchImpl(...args) : outcome; } };
  return { api, snapshots, beats, waits, fetched, logs, controller, options,
    execute: () => run({ ...config, ...configOverride }, options), leases: () => leases };
}
test('leases one at a time, paces, snapshots, starts and ends heartbeat', async () => {
  const f = fixture({ jobs: [request(1), request(2)] });
  const stats = await f.execute();
  assert.equal(stats.fetched, 2);
  assert.equal(f.snapshots.length, 2);
  assert.deepEqual(f.waits, [96750]);
  assert.equal(f.beats[0].run_finished_at, null);
  assert.equal(f.beats[1].run_finished_at, '1970-01-01T00:01:36.750Z');
  assert.equal(f.snapshots[0].request_id, 1);
  assert.equal(f.snapshots[0].lease_token, request(1).lease_token);
  assert.equal(f.snapshots[1].lease_token, request(2).lease_token);
});
test('challenge posts evidence then stops the whole run without sleeping', async () => {
  const f = fixture({ jobs: [request(1), request(2)], outcome: { ...ok, outcome: 'challenged' } });
  const stats = await f.execute();
  assert.equal(stats.stoppedByChallenge, true);
  assert.equal(f.snapshots[0].outcome, 'challenged');
  assert.equal(f.fetched.length, 1);
  assert.equal(f.leases(), 1);
  assert.deepEqual(f.waits, []);
  assert.equal(f.beats[1].challenged, 1);
});
test('failed challenge delivery remains visible to the local breaker', async () => {
  const f = fixture({ outcome: { ...ok, outcome: 'challenged' } });
  f.api.snapshot = async () => { throw new Error('offline'); };
  await assert.rejects(f.execute(), /offline/);
  assert.ok(f.logs.some(e => e.event === 'challenge_detected'));
  assert.equal(f.beats[1].challenged, 1);
});
test('page and time caps prevent additional leases', async () => {
  const pages = fixture({ jobs: [request(1), request(2)], configOverride: { maxPages: 1 } });
  await pages.execute();
  assert.equal(pages.fetched.length, 1);
  assert.deepEqual(pages.waits, []);
  const time = fixture({ jobs: [request(1), request(2)], configOverride: { maxRunMinutes: 1 } });
  await time.execute();
  assert.equal(time.fetched.length, 1);
  assert.deepEqual(time.waits, [60000]);
});
test('paused or empty queue exits cleanly', async () => {
  for (const work of [{ requests: [] }, { requests: [request()], paused_until: '2099-01-01' }]) {
    const f = fixture(); f.api.work = async () => work;
    await f.execute(); assert.equal(f.fetched.length, 0); assert.equal(f.beats.length, 2);
  }
});
test('invalid URL is refused before any browser opens', async () => {
  for (const url of ['http://asjjf.org/', 'https://asjjf.org.evil.test/', 'https://user:pw@asjjf.org/', 'https://asjjf.org:444/', 'https://evil.test/']) {
    const f = fixture({ jobs: [request(1, url)] });
    await f.execute();
    assert.equal(f.fetched.length, 0);
    assert.equal(f.snapshots[0].outcome, 'error');
  }
  assert.equal(allowedUrl('https://dumau.asjjf.org/', config.allowedHosts).hostname, 'dumau.asjjf.org');
});
test('2 MB limit counts full JSON, escaped HTML and UTF-8; challenge still stops', async () => {
  const huge = { ...ok, html: '日"'.repeat(MAX_BODY_BYTES / 3) };
  const snapshot = boundedSnapshot(huge);
  assert.equal(snapshot.error, 'too_large'); assert.equal(snapshot.html, null);
  assert.ok(Buffer.byteLength(JSON.stringify(snapshot)) <= MAX_BODY_BYTES);
  const f = fixture({ jobs: [request(1), request(2)], outcome: { ...huge, outcome: 'challenged' } });
  assert.equal((await f.execute()).stoppedByChallenge, true);
  assert.equal(f.snapshots[0].error, 'too_large');
  assert.equal(f.snapshots[0].outcome, 'challenged');
});
test('SIGTERM aborts pacing and sends final heartbeat', async () => {
  const f = fixture({ jobs: [request(1), request(2)] });
  f.options.sleep = async () => { f.controller.abort(); throw new Error('aborted'); };
  await f.execute();
  assert.equal(f.fetched.length, 1); assert.equal(f.beats.length, 2);
});
test('fetch error posts error; snapshot delivery failure stops further work', async () => {
  const f = fixture({ fetchImpl: async () => { throw new Error('contains private details'); } });
  await f.execute(); assert.equal(f.snapshots[0].error, 'fetch_failed');
  const g = fixture({ jobs: [request(1), request(2)] });
  g.api.snapshot = async () => { throw new Error('offline'); };
  await assert.rejects(g.execute(), /offline/);
  assert.equal(g.fetched.length, 1); assert.equal(g.beats.length, 2);
});
test('jitter bounds and server pacing fail closed', async () => {
  for (const [random, expected] of [[0, 90000], [1, 103500]]) {
    const f = fixture({ jobs: [request(1), request(2)] }); f.options.random = () => random;
    await f.execute(); assert.deepEqual(f.waits, [expected]);
  }
  const f = fixture(); f.api.work = async () => ({ requests: [request()], pacing_seconds: 5 });
  await assert.rejects(f.execute(), /pacing/); assert.equal(f.fetched.length, 0);
});
test('configuration validates limits, origin and allowed host subset', () => {
  const env = { ASJJF_API_BASE: 'https://api.example', ASJJF_FETCHER_ID: 'mini', ASJJF_FETCHER_SECRET: 's' };
  assert.equal(loadConfig(env).maxPages, 200);
  for (const extra of [{ MAX_PAGES_PER_RUN: 'NaN' }, { MAX_PAGES_PER_RUN: '1.5' }, { PACING_JITTER: '1' }, { ALLOWED_HOSTS: 'evil.test' }, { ASJJF_API_BASE: 'http://api.example' }]) {
    assert.throws(() => loadConfig({ ...env, ...extra }));
  }
});

test('page START intervals use the larger current server floor and subtract fetch time', async () => {
  let time = 0;
  const starts = [];
  const jobs = [request(1), request(2), request(3)];
  await run(config, {
    now: () => time, random: () => 0,
    api: { work: async () => ({ requests: jobs.splice(0, 1), pacing_seconds: starts.length === 1 ? 120 : 90 }),
      snapshot: async () => {}, heartbeat: async () => {} },
    sleep: async ms => { time += ms; },
    fetchPage: async () => { starts.push(time); time += 30000; return ok; },
  });
  assert.deepEqual(starts, [0, 120000, 240000]);
});

// Keep these null-field shapes aligned with the Rails intake contract tests.
for (const [name, result] of Object.entries({
  network: { final_url: null, http_status: null, outcome: 'error', error: 'fetch_failed', html: null },
  latched: { final_url: null, http_status: null, outcome: 'challenged', error: 'challenge_detected', html: null },
  redirect: { final_url: null, http_status: 403, outcome: 'challenged', error: 'challenge_detected', html: null },
  oversized: { final_url: 'https://asjjf.org/main/eventResults/2062', http_status: 200, outcome: 'error', error: 'too_large', html: null },
  oversizedChallenge: { final_url: 'https://asjjf.org/main/eventResults/2062', http_status: 200, outcome: 'challenged', error: 'too_large', html: null },
})) test(`exact snapshot envelope for ${name}`, async () => {
  const job = request(1, 'https://asjjf.org/main/eventResults/2062');
  const f = fixture({ jobs: [job], outcome: result });
  await f.execute();
  assert.deepEqual(JSON.parse(JSON.stringify(f.snapshots[0])), {
    ...result, request_id: job.id, lease_token: job.lease_token, url: job.url,
    fetched_at: '1970-01-01T00:00:00.000Z',
  });
});

test('real API 409 for a stale snapshot logs and continues without retrying; auth stays fatal', async () => {
  for (const status of [409, 401, 403]) {
    const f = fixture({ jobs: [request(1), request(2)] });
    const deliveries = [];
    const client = new ApiClient({ apiBase: 'https://api.example', secret: 'test', fetcherId: 'home' }, {
      fetchImpl: async (_, options) => {
        deliveries.push(JSON.parse(options.body));
        return new Response('', { status: deliveries.length === 1 ? status : 201 });
      },
    });
    f.api.snapshot = data => client.snapshot(data);
    if (status === 409) {
      await f.execute();
      assert.equal(deliveries.length, 2);
      assert.equal(f.fetched.length, 2);
      assert.ok(f.logs.some(e => e.event === 'stale_lease' && e.request_id === 1));
      assert.ok(!f.logs.some(e => e.event === 'snapshot_saved' && e.request_id === 1));
      assert.ok(f.logs.some(e => e.event === 'snapshot_saved' && e.request_id === 2));
      assert.ok(!JSON.stringify(f.logs).includes(request(1).lease_token));
    } else {
      await assert.rejects(f.execute(), new RegExp(String(status)));
      assert.equal(f.fetched.length, 1);
      assert.equal(deliveries.length, 1);
    }
    assert.equal(f.beats.length, 2);
  }
});

test('a stale challenged snapshot still stops the whole run', async () => {
  const f = fixture({ jobs: [request(1), request(2)], outcome: { ...ok, outcome: 'challenged' } });
  f.api.snapshot = async () => { throw new StaleLeaseError(); };
  assert.equal((await f.execute()).stoppedByChallenge, true);
  assert.equal(f.fetched.length, 1);
  assert.ok(f.logs.some(e => e.event === 'stale_lease'));
});

test('missing or invalid lease tokens fail before browser navigation', async () => {
  for (const lease_token of [undefined, null, '', 'old-token']) {
    const f = fixture({ jobs: [{ ...request(), lease_token }] });
    await assert.rejects(f.execute(), /lease token/);
    assert.equal(f.fetched.length, 0);
    assert.equal(f.snapshots.length, 0);
    assert.equal(f.beats.length, 2);
  }
});
