// Only these identifiers (and a Chromium network code) may leave the browser.
const CATEGORIES = new Set(['disallowed_redirect', 'disallowed_method', 'boundary_violation',
  'disallowed_navigation', 'browser_launch_failed', 'aborted_deadline']);

export class FetchError extends Error {
  constructor(category, detail) { super(category); this.category = category; if (detail) this.detail = detail; }
}

// Describes a rejected navigation hop for the operator log without its path, query,
// credentials or any page content: only the scheme, a well-formed host name, the port,
// and which boundary rule failed.
export function describeRejectedUrl(value, hosts) {
  let url;
  try { url = new URL(value); } catch { return { rule: 'unparseable' }; }
  const scheme = ['http:', 'https:'].includes(url.protocol) ? url.protocol.slice(0, -1) : 'other';
  const host = /^[a-z0-9.-]{1,253}$/.test(url.hostname) ? url.hostname : 'invalid';
  const rule = scheme !== 'https' ? 'scheme' : url.username || url.password ? 'credentials'
    : url.port && url.port !== '443' ? 'port' : !hosts.includes(url.hostname) ? 'host' : 'other';
  return { rule, scheme, host, port: /^\d{1,5}$/.test(url.port) ? url.port : '' };
}

export function classifyFetchError(error, signal) {
  if (signal?.aborted) return 'aborted_deadline';
  if (error instanceof FetchError && CATEGORIES.has(error.category)) return error.category;
  if (error?.name === 'TimeoutError') return 'navigation_timeout';
  const code = /net::(ERR_[A-Z_]{1,80})\b/.exec(typeof error?.message === 'string' ? error.message : '');
  return code ? `net_${code[1]}` : 'unknown';
}
