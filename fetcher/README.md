# ASJJF fetcher

Phase B2 supplies raw page snapshots to the separately implemented Rails intake API. It does not parse results, update rankings, or deploy itself. See [Mac mini operations](../ops/asjjf-fetcher/README.md).

Node 22, ESM, and exactly `playwright-core@1.56.1` (the version used by the feasibility probe). Chromium is the Debian system package, not Playwright's downloaded browser. Run tests with `npm ci && npm test`.

## Configuration

| Variable | Default / requirement |
|---|---|
| `ASJJF_API_BASE` | Required HTTPS origin, no path/query/credentials |
| `ASJJF_FETCHER_ID` | Required; registered fetcher identifier on the API |
| `ASJJF_FETCHER_SECRET` | Required; shared HMAC secret |
| `MAX_PAGES_PER_RUN` | `200` attempts, including errors and refused URLs |
| `MAX_RUN_MINUTES` | `300` minutes; closes an active browser at deadline |
| `PACING_JITTER` | `0.15`; fraction, from 0 to 0.5 |
| `ALLOWED_HOSTS` | `asjjf.org,dumau.asjjf.org`; may restrict this list |
| `CHROMIUM_EXECUTABLE_PATH` | `/usr/bin/chromium` |

Every page uses a freshly launched **headed** browser with one page, `en-US` locale, and `Pacific/Guam` timezone. GET navigation is restricted to HTTPS on the allowed hosts (port 443); credentials, external navigation redirects and non-GET navigations are refused. Ordinary browser subresources are left alone, as in the verified probe. The fetcher never issues in-page fetch/XHR or POST requests. Service workers are blocked so they cannot bypass navigation routing. No stealth tooling, fingerprint changes, webdriver patches, CAPTCHA services, or proxy rotation.

The API is leased one request at a time. The server pacing must be at least 90 seconds; sleep after each processed request is pacing ± configured jitter (default 76.5–103.5 seconds for 90 seconds). Empty queues and `paused_until` exit cleanly. An uncleared challenge title, Cloudflare challenge markup, HTTP 403, or HTTP 429 stops the entire run after attempting to save evidence. The browser waits at most 30 seconds for a “Just a moment” title to clear. Browser failures produce sanitized error snapshots; a snapshot-delivery failure stops further fetching. Oversized **serialized JSON** (including metadata, UTF-8 and escaping) becomes `outcome: error`, `error: too_large`, `html: null`. An oversized challenge still stops the run.

API calls have a 30-second timeout per attempt, up to three retries at 1/2/4-second backoff, for network errors and HTTP 5xx only. Authentication, other 4xx (including 429), invalid JSON, and unexpected success statuses fail immediately. Requests are signed again on each retry. Snapshot POST retries can repeat a request after an ambiguous network failure: the intake must handle replay/duplicate request IDs safely. No ASJJF navigation is retried automatically.

SIGTERM/SIGINT stops pacing and closes an active browser, then attempts the final heartbeat. API delivery/final heartbeat can finish beyond the page/time cap; container shutdown allows 300 seconds. Counts: `fetched` is attempted work items, `challenged` counts detected challenges even if too large, `errors` counts error snapshots. Logs contain JSON events and counts, never HTML, secrets, or browser error messages. Exit codes: 0 clean, 1 configuration/API/page errors, 2 challenge (also when evidence delivery fails).

## Exact signing vectors

All strings below are UTF-8. No trailing newline in the body or canonical signing message. Timestamp is the literal Unix-seconds string `1793577600`. Secret is the literal `test-secret` (test data only). Signature is lowercase hex HMAC-SHA256 of:

```text
${timestamp}\n${METHOD}\n${pathWithQuery}\n${sha256hex(rawBody)}
```

GET vector (empty raw body):

```json
{
  "secret": "test-secret",
  "timestamp": "1793577600",
  "method": "GET",
  "pathWithQuery": "/api/v1/internal/asjjf/work?limit=1",
  "rawBody": "",
  "bodySha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "signature": "21bc697d9810c337c4777bde2328ea6dfa2e82a4656a99688a8cd0b9d36c0848"
}
```

POST vector (body is exactly the JSON string's decoded content, with no spaces):

```json
{
  "secret": "test-secret",
  "timestamp": "1793577600",
  "method": "POST",
  "pathWithQuery": "/api/v1/internal/asjjf/heartbeat",
  "rawBody": "{\"fetcher_version\":\"1.0.0\",\"run_finished_at\":null}",
  "bodySha256": "a0bc1dcdf9f57f096daa836ef61348c22ae925bb2329c5afabab7587bdd739f6",
  "signature": "3cb94907bb4f7fd6c75ddffcf2dc41d4fe260080624ff28d0a5ec431527820e8"
}
```

Headers: `X-Asjjf-Fetcher-Id`, `X-Asjjf-Timestamp`, `X-Asjjf-Signature`. Query order and raw body bytes matter. Use these same vectors in Rails tests.
