import { setTimeout as delay } from 'node:timers/promises';
import { allowedUrl } from './config.js';
import { MAX_BODY_BYTES } from './api.js';

export function boundedSnapshot(snapshot) {
  if (Buffer.byteLength(JSON.stringify(snapshot)) <= MAX_BODY_BYTES) return snapshot;
  return { ...snapshot, outcome: 'error', error: 'too_large', html: null };
}

export async function run(config, { api, fetchPage, signal, sleep = delay, now = Date.now,
  random = Math.random, log = () => {} }) {
  const started = now();
  const deadline = started + config.maxRunMinutes * 60000;
  const stats = { fetcher_version: '1.0.0', run_started_at: new Date(started).toISOString(),
    run_finished_at: null, fetched: 0, challenged: 0, errors: 0 };
  let stoppedByChallenge = false;
  const active = () => !signal?.aborted && now() < deadline && stats.fetched < config.maxPages;
  await api.heartbeat({ ...stats });
  try {
    while (active()) {
      const work = await api.work(1);
      if (work.paused_until || !work.requests?.length) break;
      if (!Number.isFinite(work.pacing_seconds) || work.pacing_seconds < 90) throw new Error('Invalid server pacing (minimum 90 seconds)');
      for (const request of work.requests) {
        if (!active()) break;
        let result;
        // A deadline closes the active browser as well as stopping further leases.
        const pageSignal = AbortSignal.any([AbortSignal.timeout(Math.max(1, Math.ceil(deadline - now()))),
          ...(signal ? [signal] : [])]);
        try {
          allowedUrl(request.url, config.allowedHosts);
          result = await fetchPage(request.url, config, { signal: pageSignal });
        } catch {
          // Do not log browser exception messages: they can include entire page URLs/content.
          result = { final_url: null, http_status: null, outcome: 'error', error: 'fetch_failed', html: null };
        }
        const challenged = result.outcome === 'challenged';
        if (challenged) {
          stoppedByChallenge = true;
          log({ event: 'challenge_detected', request_id: request.id });
        }
        const snapshot = boundedSnapshot({ request_id: request.id, url: request.url, ...result,
          fetched_at: new Date(now()).toISOString() });
        stats.fetched++;
        if (challenged) stats.challenged++;
        if (snapshot.outcome === 'error') stats.errors++;
        // A failed delivery is fatal: do not continue fetching pages without saved evidence.
        await api.snapshot(snapshot);
        log({ event: 'snapshot_saved', request_id: request.id, outcome: snapshot.outcome });
        if (challenged) { stoppedByChallenge = true; break; }
        if (!active()) break;
        const ms = Math.round(work.pacing_seconds * 1000 * (1 + config.jitter * (2 * random() - 1)));
        try { await sleep(Math.min(ms, Math.max(0, deadline - now())), undefined, { signal }); }
        catch (error) { if (!signal?.aborted) throw error; }
      }
      if (stoppedByChallenge) break;
    }
  } finally {
    stats.run_finished_at = new Date(now()).toISOString();
    await api.heartbeat({ ...stats });
    log({ event: 'run_finished', ...stats, stoppedByChallenge });
  }
  return { ...stats, stoppedByChallenge };
}
