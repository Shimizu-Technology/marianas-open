# ASJJF fetcher

Phase B2 supplies raw page snapshots to the separately implemented Rails intake API. It does not parse results, update rankings, or deploy itself. See [Mac mini operations](../ops/asjjf-fetcher/README.md).

Node 22, ESM, and exactly `playwright-core@1.56.1` (the version used by the feasibility probe). Chromium is the Debian system package, not Playwright's downloaded browser. Run tests with `npm ci && npm test`.

## Configuration

| Variable | Default / requirement |
|---|---|
| `ASJJF_API_BASE` | Required HTTPS origin, no path/query/credentials |
| `ASJJF_FETCHER_ID` | Required; operational label (1–80 ASCII letters/digits/underscore/dot/hyphen) under the shared credential |
| `ASJJF_FETCHER_SECRET` | Required; shared HMAC secret |
| `MAX_PAGES_PER_RUN` | `200` attempts, including errors and refused URLs |
| `MAX_RUN_MINUTES` | `300` minutes; closes an active browser at deadline |
| `PACING_JITTER` | `0.15`; fraction, from 0 to 0.5 |
| `ALLOWED_HOSTS` | `asjjf.org,dumau.asjjf.org`; may restrict this list |
| `CHROMIUM_EXECUTABLE_PATH` | `/usr/bin/chromium` |

Every page uses a freshly launched **headed** browser with one page, `en-US` locale, and `Pacific/Guam` timezone. GET navigation is restricted to HTTPS on the allowed hosts (port 443); credentials, external navigation redirects and non-GET navigations are refused. Ordinary browser subresources are left alone, as in the verified probe. The fetcher never issues in-page fetch/XHR or POST requests. Service workers are blocked so they cannot bypass navigation routing. No stealth tooling, fingerprint changes, webdriver patches, CAPTCHA services, or proxy rotation.

The API is leased one request at a time. The server pacing must be at least 90 seconds. Page starts are separated by the larger current/previous server floor plus nonnegative configured jitter (default 90–103.5 seconds for a 90-second floor); time spent fetching is subtracted from the remaining sleep. Empty queues and `paused_until` exit cleanly. An uncleared challenge title, Cloudflare challenge markup, HTTP 403, or HTTP 429 stops the entire run after attempting to save evidence. The browser waits at most 30 seconds for a “Just a moment” title to clear. Browser failures produce sanitized error snapshots; a snapshot-delivery failure stops further fetching except for a stale-lease 409, which logs `stale_lease` and continues. Oversized **serialized JSON** (including metadata, UTF-8 and escaping) becomes `error: too_large`, `html: null`, with `outcome: error` for ordinary pages and `outcome: challenged` when any challenge was seen. An oversized challenge still stops the run and opens the server breaker when its live lease is accepted.

API calls have a 30-second timeout per attempt, up to three retries at 1/2/4-second backoff, for network errors and HTTP 5xx only. A 409 from snapshot POST is not retried: it means the lease was expired, consumed, or superseded; log and continue with the next item. A challenge still stops the whole run even if its snapshot receives 409. Authentication failures (401/403), other 4xx (including 429 or a 409 on work/heartbeat), invalid JSON, and unexpected success statuses fail immediately. Requests are signed again on each retry. Snapshot POST retries can repeat a request after an ambiguous network failure: the intake checks the per-lease token and returns 409 without altering current work. No ASJJF navigation is retried automatically.

SIGTERM/SIGINT stops pacing and closes an active browser, then attempts the final heartbeat. API delivery/final heartbeat can finish beyond the page/time cap; container shutdown allows 300 seconds. Counts: `fetched` is attempted work items, `challenged` counts detected challenges even if too large, `errors` counts error snapshots. Logs contain JSON events and counts, never HTML, secrets, or browser error messages. Exit codes: 0 clean, 1 configuration/API/page errors, 2 challenge (also when evidence delivery fails).

## Intake contract (PR #115)

Deploy the intake migrations and token-aware API before running this fetcher. Work items without a valid token fail before opening a browser. No live API or Mac mini deployment is performed by the regression tests.

Headers are `X-Asjjf-Fetcher-Id`, `X-Asjjf-Timestamp` (Unix seconds, ±300 seconds), and `X-Asjjf-Signature`. The unsigned fetcher ID is an operational label, not a separate credential; the API rate limit is 60 authenticated requests/minute per shared secret across all labels/processes. A 429 includes `Retry-After: 60`.

`GET /api/v1/internal/asjjf/work?limit=N` returns 200:

```json
{"requests":[{"id":123,"url":"https://asjjf.org/main/eventResults/2062","page_type":"event_results","lease_expires_at":"2026-11-02T12:45:00Z","lease_token":"<64 lowercase random hex characters>"}],"pacing_seconds":90,"paused_until":null}
```

Each lease lasts 45 minutes. The server rotates its 256-bit random token on every lease, and the fetcher echoes it unchanged inside the signed snapshot JSON. `page_type` is supplied by work, not posted back. Empty/paused work exits cleanly.

`POST /api/v1/internal/asjjf/snapshots` sends all fields below (`error` is optional on the API; this fetcher supplies it):

```json
{"request_id":123,"lease_token":"<token from work>","url":"https://asjjf.org/main/eventResults/2062","final_url":"https://asjjf.org/main/eventResults/2062","http_status":200,"fetched_at":"2026-11-02T12:01:00.000Z","outcome":"ok","error":null,"html":"<html>...</html>"}
```

Returns 201 `{"snapshot_id":456,"parse_status":"parsed"}`; parse status may also be `failed` or `skipped`. The API requires a matching live lease, fetcher label, original URL, and token. A consumed/expired/mismatched token gives 409 without state changes. Malformed or missing required fields give 422. A successful page needs a nonnull HTML string/status and a nonblank final URL preserving page identity; only HTTP 200 is parsed as success.

Error/challenged snapshots retain the same envelope and allow `html`, `http_status`, and `final_url` to be null. These exact result fields are tested on both sides:

```json
{"final_url":null,"http_status":null,"outcome":"error","error":"fetch_failed","html":null}
{"final_url":null,"http_status":null,"outcome":"challenged","error":"challenge_detected","html":null}
{"final_url":null,"http_status":403,"outcome":"challenged","error":"challenge_detected","html":null}
{"final_url":"https://asjjf.org/main/eventResults/2062","http_status":200,"outcome":"error","error":"too_large","html":null}
{"final_url":"https://asjjf.org/main/eventResults/2062","http_status":200,"outcome":"challenged","error":"too_large","html":null}
```

Errors save the attempt and return work to pending until the fifth attempt, then failed. Every accepted challenged snapshot blocks its request, opens/extends the breaker, and alerts once per pause episode, including absent/oversized HTML. The API allows 2 MiB HTML with a 2 MiB + 64 KiB early raw-body cap; the fetcher uses the stricter **2 MiB serialized JSON cap**, counting UTF-8 and escapes.

`POST /api/v1/internal/asjjf/heartbeat` sends:

```json
{"fetcher_version":"1.0.0","run_started_at":"2026-11-02T12:00:00.000Z","run_finished_at":null,"fetched":2,"challenged":0,"errors":0}
```

Returns 204. Final heartbeat supplies `run_finished_at`; counters count attempted items, detected challenges, and error outcomes respectively. Snapshot 409 is logged without claiming `snapshot_saved` or exposing the token.

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

Headers: `X-Asjjf-Fetcher-Id`, `X-Asjjf-Timestamp`, `X-Asjjf-Signature`. Query order and raw body bytes matter. These vectors are also asserted in Rails tests. The POST vector demonstrates signing only, not a complete heartbeat. The signing string is unchanged; `lease_token` is covered by the exact raw-body hash.
