export function allowedUrl(value, hosts) {
  const url = new URL(value);
  if (url.protocol !== 'https:' || url.username || url.password ||
      (url.port && url.port !== '443') || !hosts.includes(url.hostname)) {
    throw new Error('disallowed_url');
  }
  return url;
}

export function loadConfig(env = process.env) {
  for (const key of ['ASJJF_API_BASE', 'ASJJF_FETCHER_ID', 'ASJJF_FETCHER_SECRET']) {
    if (!env[key]?.trim()) throw new Error(`Missing ${key}`);
  }
  const base = new URL(env.ASJJF_API_BASE);
  if (base.protocol !== 'https:' || base.username || base.password ||
      base.pathname !== '/' || base.search || base.hash) throw new Error('ASJJF_API_BASE must be an HTTPS origin');
  const number = (key, fallback, min, max) => {
    const value = Number(env[key] ?? fallback);
    if (!Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${key}`);
    return value;
  };
  const maxPages = number('MAX_PAGES_PER_RUN', 200, 1, 10000);
  if (!Number.isInteger(maxPages)) throw new Error('MAX_PAGES_PER_RUN must be an integer');
  const allowedHosts = (env.ALLOWED_HOSTS ?? 'asjjf.org,dumau.asjjf.org').split(',').map(x => x.trim().toLowerCase());
  if (allowedHosts.some(x => !['asjjf.org', 'dumau.asjjf.org'].includes(x))) throw new Error('ALLOWED_HOSTS must be a subset of ASJJF hosts');
  return {
    apiBase: base.origin, fetcherId: env.ASJJF_FETCHER_ID, secret: env.ASJJF_FETCHER_SECRET,
    maxPages, maxRunMinutes: number('MAX_RUN_MINUTES', 300, 0.01, 1440),
    jitter: number('PACING_JITTER', 0.15, 0, 0.5), allowedHosts,
    executablePath: env.CHROMIUM_EXECUTABLE_PATH || '/usr/bin/chromium',
  };
}
