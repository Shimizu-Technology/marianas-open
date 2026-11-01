import { setTimeout as delay } from 'node:timers/promises';
import { sign } from './signing.js';

export const MAX_BODY_BYTES = 2 * 1024 * 1024;
export class StaleLeaseError extends Error {
  constructor() {
    super('Stale snapshot lease (HTTP 409)');
    this.permanent = true;
  }
}

export class ApiClient {
  constructor(config, { fetchImpl = fetch, sleep = delay, now = Date.now, timeoutMs = 30000, retries = 3 } = {}) {
    Object.assign(this, { config, fetchImpl, sleep, now, timeoutMs, retries });
  }
  async request(method, path, data) {
    const body = data === undefined ? '' : JSON.stringify(data);
    if (Buffer.byteLength(body) > MAX_BODY_BYTES) throw new Error('API body too large');
    for (let attempt = 0; ; attempt++) {
      const timestamp = String(Math.floor(this.now() / 1000));
      let response;
      try {
        response = await this.fetchImpl(new URL(path, this.config.apiBase), {
          method, redirect: 'error', signal: AbortSignal.timeout(this.timeoutMs),
          headers: {
            'Content-Type': 'application/json', 'X-Asjjf-Fetcher-Id': this.config.fetcherId,
            'X-Asjjf-Timestamp': timestamp,
            'X-Asjjf-Signature': sign(this.config.secret, timestamp, method, path, body),
          }, ...(body ? { body } : {}),
        });
        // Read inside the timeout/retry boundary, including network failures mid-body.
        const raw = await response.text();
        if (response.status >= 500 && response.status <= 599) throw new Error('retryable_server_error');
        if (response.status === 409 && method === 'POST' && path === '/api/v1/internal/asjjf/snapshots') throw new StaleLeaseError();
        const expected = method === 'GET' ? 200 : path.endsWith('/snapshots') ? 201 : 204;
        if (response.status !== expected) throw Object.assign(new Error(`API HTTP ${response.status}`), { permanent: true });
        try { return raw ? JSON.parse(raw) : null; }
        catch { throw Object.assign(new Error('Invalid API JSON'), { permanent: true }); }
      } catch (error) {
        if (error.permanent || attempt >= this.retries) throw error;
        await this.sleep(1000 * 2 ** attempt);
      }
    }
  }
  work(limit = 1) { return this.request('GET', `/api/v1/internal/asjjf/work?limit=${limit}`); }
  snapshot(data) { return this.request('POST', '/api/v1/internal/asjjf/snapshots', data); }
  heartbeat(data) { return this.request('POST', '/api/v1/internal/asjjf/heartbeat', data); }
}
