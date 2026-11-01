import { setTimeout as delay } from 'node:timers/promises';
import { allowedUrl } from './config.js';
import { MAX_BODY_BYTES, StaleLeaseError } from './api.js';

export function boundedSnapshot(snapshot) {
  if (Buffer.byteLength(JSON.stringify(snapshot)) <= MAX_BODY_BYTES) return snapshot;
  return { ...snapshot, outcome: snapshot.outcome === 'challenged' ? 'challenged' : 'error', error: 'too_large', html: null };
}

export async function run(config, { api, fetchPage, signal, sleep = delay, now = Date.now,
  random = Math.random, log = () => {} }) {
  const started = now();
  const deadline = started + config.maxRunMinutes * 60000;
  const stats = { fetcher_version: '1.0.0', run_started_at: new Date(started).toISOString(),
    run_finished_at: null, fetched: 0, challenged: 0, errors: 0 };
  let stoppedByChallenge = false;
  let previousStart = null;
  let previousPacing = 90;
  const active = () => !signal?.aborted && now() < deadline && stats.fetched < config.maxPages;
  await api.heartbeat({ ...stats });
  try {
    while (active()) {
      const work = await api.work(1);
      if (work.paused_until || !work.requests?.length) break;
      if (!Number.isFinite(work.pacing_seconds) || work.pacing_seconds < 90) throw new Error('Invalid server pacing (minimum 90 seconds)');
      for (const request of work.requests) {
        if (!active()) break;
        if (typeof request.lease_token !== 'string' || !/^[0-9a-f]{64}$/.test(request.lease_token)) throw new Error('Invalid work lease token');
        if (previousStart !== null) {
          const interval = Math.ceil(Math.max(90, work.pacing_seconds, previousPacing) * 1000 * (1 + config.jitter * random()));
          const remaining = Math.max(0, previousStart + interval - now());
          try { await sleep(Math.min(remaining, Math.max(0, deadline - now())), undefined, { signal }); }
          catch (error) { if (!signal?.aborted) throw error; }
          if (!active()) break;
        }
        previousStart = now();
        previousPacing = work.pacing_seconds;
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
        const snapshot = boundedSnapshot({ ...result, request_id: request.id, lease_token: request.lease_token, url: request.url,
          fetched_at: new Date(now()).toISOString() });
        stats.fetched++;
        if (challenged) stats.challenged++;
        if (snapshot.outcome === 'error') stats.errors++;
        try {
          await api.snapshot(snapshot);
          log({ event: 'snapshot_saved', request_id: request.id, outcome: snapshot.outcome });
        } catch (error) {
          // A replay or expired lease cannot overwrite the server's current attempt.
          // Other delivery failures (including auth) remain fatal.
          if (!(error instanceof StaleLeaseError)) throw error;
          log({ event: 'stale_lease', request_id: request.id, outcome: snapshot.outcome });
        }
        if (challenged) { stoppedByChallenge = true; break; }
        if (!active()) break;
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
