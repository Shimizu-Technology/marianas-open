// Only these identifiers (and a Chromium network code) may leave the browser.
const CATEGORIES = new Set(['disallowed_redirect', 'disallowed_method', 'boundary_violation',
  'disallowed_navigation', 'browser_launch_failed', 'aborted_deadline']);

export class FetchError extends Error {
  constructor(category) { super(category); this.category = category; }
}

export function classifyFetchError(error, signal) {
  if (signal?.aborted) return 'aborted_deadline';
  if (error instanceof FetchError && CATEGORIES.has(error.category)) return error.category;
  if (error?.name === 'TimeoutError') return 'navigation_timeout';
  const code = /net::(ERR_[A-Z_]{1,80})\b/.exec(typeof error?.message === 'string' ? error.message : '');
  return code ? `net_${code[1]}` : 'unknown';
}
