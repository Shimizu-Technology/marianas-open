# ASJJF snapshot and results pipeline (B1 / B3)

B1 stores public ASJJF pages, queues browser fetches, and parses saved HTML. B3 assembles complete results evidence, previews changes, and safely updates ASJJF results with review holds. Rankings remain a separate B5 pipeline. No Rails results importer makes outbound ASJJF requests.

## Production setup

Rails/API and the existing Solid Queue worker remain on Render; the separately deployed B2 browser fetcher polls this API. No outbound ASJJF HTTP requests run in B1. Deploy the migrations before using the new admin panel or token-aware fetcher. The round-2 migration adds lease tokens and a credential rate bucket; leases created before that migration cannot submit and must expire/re-lease. Six new tables store requests, snapshots, heartbeats, credential rate-limit state, breaker state, and explicit event sources. Indexes support leasing and prevent duplicate pending/leased URLs. Existing tables only gain an association; `events.asjjf_event_ids` stays in place.

The backfill uses migration-local models without application callbacks. It is repeatable: existing array IDs create unknown-discipline sources; HTTPS `registration_url_gi/nogi` eventInfo links supply gi/nogi discipline. It does not change public event data or existing results. Parsing a results/info title fills only unknown source disciplines. Explicit administrator sources are preserved by planning. New/changed legacy source IDs and registration links are reconciled when planning an event check.

Configure:

- `ASJJF_FETCHER_SECRET`: shared HMAC secret on Rails and the fetcher. Without it, every internal endpoint returns 404. Rotate on both sides together.
- `ASJJF_ALERT_EMAILS`: comma-separated admin recipients. Uses existing `RESEND_API_KEY` and `RESEND_FROM_EMAIL` (or `MAILER_FROM_EMAIL`). Without email configuration, alerts go to the Rails log.
- `ASJJF_BREAKER_HOURS`: optional challenge pause, default 12 hours, bounded 1–168.

B2 must use an authorized, real headed browser and a human pace. Stop on interactive challenges. Never work around a challenge or poll more quickly to recover.

## Signing (HMAC only)

Send `X-Asjjf-Fetcher-Id` (1–80 ASCII letters/digits/underscore/dot/hyphen), `X-Asjjf-Timestamp` (Unix seconds), and `X-Asjjf-Signature` (lowercase hexadecimal). Compute:

```text
body_hash = sha256_hex(exact_raw_request_body)
message = timestamp + "\n" + HTTP_METHOD + "\n" + path_with_query + "\n" + body_hash
signature = hmac_sha256_hex(ASJJF_FETCHER_SECRET, message)
```

Use uppercase HTTP methods and the exact encoded path/query order sent over the wire. GET has an empty body, whose SHA256 is `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. There is no trailing newline in the message. Sign serialized JSON bytes, then send those same bytes. Rails rejects timestamps more than 300 seconds in the past or future and compares signatures in constant time. Synchronize clocks. Timestamp validation bounds replay exposure; do not reuse signed requests. Fetcher identity is an operational label under the shared credential, not a separate credential.

Authenticated requests are limited to 60/minute per shared credential using database state, including across API processes. The bucket uses the SHA256 digest of the configured secret; changing the unsigned fetcher label does not reset it. A 429 includes `Retry-After: 60`. Invalid authentication is 401; oversized bodies are 413; invalid payloads are 422; nonexistent requests are 404; stale/foreign/mismatched leases are 409. Only HTTPS URLs on `asjjf.org` or `dumau.asjjf.org`, default port 443, without userinfo/fragments, are allowed. Enqueue/upload paths must match the selected page type and a positive numeric ID.

Published cross-language vectors use secret `test-secret`, timestamp `1793577600`:

| Method | Path | Exact raw body | HMAC-SHA256 hex |
| --- | --- | --- | --- |
| GET | `/api/v1/internal/asjjf/work?limit=1` | empty | `21bc697d9810c337c4777bde2328ea6dfa2e82a4656a99688a8cd0b9d36c0848` |
| POST | `/api/v1/internal/asjjf/heartbeat` | `{"fetcher_version":"1.0.0","run_finished_at":null}` | `3cb94907bb4f7fd6c75ddffcf2dc41d4fe260080624ff28d0a5ec431527820e8` |

The second vector demonstrates signing only, not a complete heartbeat payload. `lease_token` is authenticated through the raw body hash; the signing string has not changed.

## Fetcher API

### Lease work

`GET /api/v1/internal/asjjf/work?limit=N` defaults to 10, caps at 20.

```json
{"requests":[{"id":123,"url":"https://asjjf.org/main/resultsList/2062?gender=FEMALE&age=ADULT","page_type":"results_list","lease_expires_at":"2026-11-02T12:45:00Z","lease_token":"<64 random lowercase hex characters>"}],"pacing_seconds":90,"paused_until":null}
```

A lease lasts 45 minutes. Every new lease generates a fresh 256-bit random `lease_token`, stored with the lease and returned only to the authenticated fetcher. Echo it in the signed snapshot body. It is cleared on consumption/expiry and rotated on re-lease, so replaying an earlier attempt cannot consume a new lease. Polling reclaims expired leases; each lease increments attempts. After five attempts, abandoned/error work becomes `failed`. Errors before that return to pending. Challenge work becomes `blocked`; success becomes `done`. The queue leases higher priority first, oldest first within a priority. Enqueue deduplicates exact URLs while pending/leased; terminal requests allow a fresh check. API workers serialize queue/breaker transitions with a short database row lock, and a partial unique index also enforces active URL uniqueness.

An open breaker returns `requests: []` and its ISO8601 `paused_until`. The pause expires automatically. Closing it does not automatically retry blocked requests: review the incident, then queue a fresh event check. A fetcher that already leased a batch must stop its remaining fetches when challenged; the server also stops new leases.

### Save a snapshot

`POST /api/v1/internal/asjjf/snapshots`, JSON, maximum **2 MiB HTML**, with an early Rack cap of **2 MiB + 64 KiB total raw request body** (2,162,688 bytes, including JSON overhead). Oversized Content-Length is rejected without reading; unknown/chunked or understated lengths read at most cap + 1 bytes before rejection, before Rails parameter parsing. The fetcher may use a stricter 2 MiB serialized-body cap:

```json
{"request_id":123,"lease_token":"<token returned by work>","url":"https://asjjf.org/main/resultsList/2062?gender=FEMALE&age=ADULT","final_url":"https://asjjf.org/main/resultsList/2062?gender=FEMALE&age=ADULT","http_status":200,"fetched_at":"2026-11-02T12:01:00Z","outcome":"ok","error":null,"html":"<!DOCTYPE html>..."}
```

Response: HTTP 201 `{"snapshot_id":456,"parse_status":"parsed"}`. Status is `parsed`, `failed`, or `skipped`. The request must have a live lease for the signing fetcher and the same URL and lease token. Missing, mismatched, consumed, or expired token values are rejected without changing the queue; missing required fields are 422 and invalid lease values are 409. `page_type` comes from the request. Successful redirects must preserve page type, numeric ID, and category (results gender/age or team rankType); equivalent host, query ordering, and trailing-slash changes are accepted. Redirects to a different page are rejected with 422 before saving or changing the lease. A successful fetcher submission requires a nonblank final URL; admin uploads and network errors may omit it. Supply actual final URL/status/time and `outcome` of `ok`, `challenged`, or `error`. `error` is optional. For `error` or `challenged`, `html` and `http_status` may be null (the keys remain required). For example, a network failure sends `final_url=null`, `http_status=null`, `outcome=error`, `error=fetch_failed`, `html=null`. A latched challenge sends `outcome=challenged`, `error=challenge_detected`, with null HTML/final URL/status if unavailable. Oversized pages send `html=null`, `error=too_large`, preserving `challenged` if any challenge was seen. Null HTML is stored as empty compressed evidence, with outcome/error/status retained. Errors save an attempt and return to pending until the fifth attempt, which becomes failed. Non-200 responses cannot be parsed as successful pages. A 403, a “Just a moment…” title, or recognized Cloudflare challenge markers override an `ok` claim.

Snapshots retain original HTML compressed with zlib in a binary column, its uncompressed SHA256/size, URL/query/ASJJF ID, fetch metadata, parser status/error/time, and parsed hashes in `parsed_summary`. HTML is never rendered in admin. Parsing uses `ParseAsjjfSnapshotJob.perform_now` after intake commits, before the 201 response, so this contract can return a final parse status. Inflation is streamed with a 10 MiB output cap; exceeding it records a parse failure. Parser failures are caught and saved; they do not undo intake or raise into the request. The job can also be run later to reparse a stored snapshot. HTTP success and parse success are separate: a saved but unrecognized page is a failed parse, never a replacement for results.

A challenged outcome always marks its request blocked, even with null HTML/status, and opens/extends the shared breaker. Send one admin alert per pause episode, with log fallback; another alert becomes eligible after expiry or explicit reset. Retrying an already-completed lease is rejected with 409; reconcile the queue/status rather than submitting it as a new request.

### Heartbeat

`POST /api/v1/internal/asjjf/heartbeat`:

```json
{"fetcher_version":"1.0.0","run_started_at":"2026-11-02T12:00:00Z","run_finished_at":null,"fetched":2,"challenged":0,"errors":0}
```

Returns 204. Subsequent heartbeats replace the latest run values for that fetcher. Times use ISO8601, finished may be null, and counters are nonnegative integers. `received_at` identifies the latest real heartbeat separately from rate-limit activity.

## Page types and parsers

| page_type | URL path |
| --- | --- |
| `event_results` | `/main/eventResults/<id>` |
| `results_list` | `/main/resultsList/<id>?gender=MALE\|FEMALE&age=ADULT\|KIDS` |
| `event_info` | `/main/eventInfo/<id>` |
| `season_calendar` | `/main/eventsBySeason/<id>` |
| `team_ranking` | `/ranking/teamRank/<id>` |
| `individual_ranking` | `/ranking/individualRanking/<id>` |
| `individual_ranking_division` | `/ranking/individualRankingDivision/<id>` |

Parsers under `api/app/services/asjjf/parsers/` accept saved HTML and its source URL, return plain Ruby hashes, and do not write application results. Call `Asjjf::Parsers.parse(page_type:, html:, url:)`. The calendar selector matches Marianas titles and Dumau Open events whose published place is Guam; title/place patterns and explicit inclusion/exclusion IDs are configurable. The captured team page contains adults only; kids require the separate query and have no captured fixture yet. Their fixture tests establish actual divisions/placement/ranking counts and source-specific field extraction. Names, academy text, raw country codes, tied bronze placements, and alone-in-bracket status remain available for later import work. Decimal ranking points avoid floating-point arithmetic; stored JSON uses decimal strings. Unrecognized structures and challenges fail closed.

`Asjjf::FetchPlanner` supports `plan_event_results(event)` (eventResults plus four resultsList categories for every source), `plan_event_info(event)`, `plan_season_calendar(season_id)`, and `plan_ranking(ranking_id, include_divisions: true)` (individual index plus adult and separate `?rankType=kids` team rankings). A parsed index planned with divisions enqueues its division links; index-only plans and manual index uploads do not fan out. Division fan-out intent is stored explicitly and promoted atomically when an index-only request is deduplicated with a later full plan. Reasons and requester identity are recorded.

## Admin operations

Staff can view `/admin/asjjf` and use:

- `GET /api/v1/admin/asjjf/status`: latest heartbeats, counts by queue status, breaker, 20 recent snapshots with parser output/errors.
- `POST /api/v1/admin/events/:id/asjjf_check`: enqueue results and information; repeated checks deduplicate active URLs.
- `POST /api/v1/admin/asjjf/snapshots`: multipart `file` (`.html`, at most 2 MiB), `page_type`, `url`. The same intake/parser records `source=admin_upload` and uploader identity (nullable if the user is deleted; snapshots remain). A challenge upload also opens the breaker.
- `POST /api/v1/admin/asjjf/close_breaker`: administrator only.

The event results admin page includes check/upload controls and a link to status. Results uploads save evidence and trigger evaluation. Only complete evidence passing the guards can update public results; held proposals require administrator approval. Never upload a login/session page containing private credentials. Download public HTML from ASJJF in a regular browser when automatic fetching is unavailable. Confirm the page type and original URL, then inspect the parse status and summary. Staff cannot resume a safety pause; an administrator reviews it first.

## Retention and recovery

`PruneAsjjfSnapshotsJob` runs daily at 04:00 through the existing recurring Solid Queue schedule. It preserves the latest `outcome=ok` snapshot for every URL forever (including pages awaiting a parser fix) and removes other snapshots older than 120 days. Request references to pruned snapshots are nullified. The latest success is ordered by fetched time, then ID. There is no automatic deletion of queue/history/heartbeat records.

To retry a parse after a parser fix: `ParseAsjjfSnapshotJob.perform_later(snapshot_id)`. It never applies published data. To resume fetching: investigate challenge evidence, reset the breaker as admin when appropriate, then requeue the event. This PR does not deploy/configure B2 or verify email delivery with a live Resend send.


## Results synchronization (B3 and results automation in B7)

Deploy migration `20261102160000` before starting the new code/worker. Existing results become `source=asjjf`; only exact `[GI] ` / `[NOGI] ` prefixes infer discipline. Unprefixed rows retain null discipline. Historical source IDs, alone-in-bracket facts, and division keys remain null until saved evidence establishes them. Any change involving these legacy rows requires an initial administrator review, because pre-B3 manual additions/corrections cannot be identified reliably. Staff can mark a curated row as edited before refreshing the review to protect it. Future admin-created results default to `source=manual`. No migration rewrites division labels, links identities, removes medals, or performs imports. Rolling back drops the added metadata/run tables; export the run audit before rollback if it is needed. The old labels remain visible until an approved repair runs.

`Asjjf::ResultsAssembler.new(event).call` requires the latest attempt for all five pages per source: eventResults and all four gender/age resultsList categories. A newer failure/challenge/parser failure or unfinished planned fetch prevents falling back to older successful evidence. URLs are matched by source/category, allowing the supported ASJJF hosts and query order. The eventResults category must agree with its resultsList duplicate, which is counted once. Unknown source discipline is filled from the parsed event title; `(no - Gi Event)` is recognized. Complete empty category tables are valid; missing or malformed tables fail closed.

`Asjjf::ResultsSync` compares normalized source/discipline/division/placement/name keys as a multiset (including tied bronzes). It updates matching rows in place, inserts additions, and removes only absent, unprotected ASJJF rows in one transaction. Admin edits record an immutable original sync key and `manually_edited_at`; sync never overwrites those rows or manual rows. Conflicts hold the proposal for resolution. Competitor linking uses approved aliases and ambiguity rules; unresolved identities remain unlinked and are listed in the run. Each result uses the academy normalizer/linker. Division parts and alone-in-bracket facts are retained; this work does not change ranking math or invent match bonuses.

Review guards:

- Incomplete evidence never applies, even with approval.
- Unknown/mismatched discipline, category disagreement, malformed rows/divisions, invalid medal counts (>1 gold/silver or >2 bronze), protected conflicts, and projected duplicate public medals block approval until fixed.
- Uncertain historical provenance, a total ASJJF row-count drop greater than 10%, a known source becoming empty, and the first No-Gi relabel hold for administrator review. Approval may acknowledge these count/relabel guards.
- Ambiguous mixed-provenance repair candidates block approval instead of becoming ordinary removals/additions. Label repairs preserve matching row IDs and explicitly report how many Gi-labeled divisions are actually No-Gi. No relabel auto-applies before its first approval.
- Approval requires the reviewed evidence, source configuration, and existing results to remain unchanged. A stale proposal must be refreshed. Discard leaves published results alone and suppresses automatic reapplication of the same proposal; new evidence creates a fresh proposal. Intervening failed evaluations do not erase the discard decision.

`results_sync_runs` records the trigger, status, totals and per-division diff, missing pages, conflicts, unlinked identities, guards, snapshot IDs/fingerprint, errors and approval/discard timestamps. Events retain their latest sync status/check time and fetch planning time. The admin event results card reads `GET /api/v1/admin/events/:event_id/results_sync`; POST `results_sync/preview` reviews saved evidence without applying. POST `results_sync/:run_id/approve` and `discard` require an administrator. Existing `import_results_preview` and `import_results` routes use the same pipeline; import requires the reviewed `run_id`. Staff can preview/queue/upload but cannot approve/discard. No delete-and-replace importer remains.

`PlanResultsSyncJob` runs daily at 15:00 UTC (01:00 ChST), ahead of the 02:30 ChST nightly browser fetch. Completed, non-draft/non-cancelled events fetch daily for 1–21 days after their end date, weekly for 22–60 days, and daily as catch-up when they have zero results and sources. `end_date` falls back to `date`. Planner timestamps and pending-URL deduplication avoid duplicate work. Each result snapshot parse (including failure) queues `EvaluateResultsSyncJob`, with concurrency limited to one evaluation per event and a transactional event lock. Source-scoped transaction advisory locks also serialize snapshot writes/reparsing with evaluation; review fingerprints use the exact evaluated content and source configuration. Removing a derived source ID or registration link stops future planning and invalidates prior reviews; explicit admin sources are preserved. Intermediate snapshots remain incomplete until all queued pages finish.

Existing `ASJJF_ALERT_EMAILS`, `RESEND_API_KEY`, and `RESEND_FROM_EMAIL` (fallback `MAILER_FROM_EMAIL`) configure alerts. First imports, new holds, and failed evaluations alert; no-change and ordinary updates stay quiet. Missing email configuration falls back to logs; delivery failure does not roll back results.

Rollout: deploy schema/code, allow the next complete nightly fetch, inspect first-import runs for Marianas Open 2026, Dumau Open 2026 and Hong Kong 2026, then review the held No-Gi repairs for Korea/Taiwan/Manila 2026, Taiwan/Manila 2025 and Korea 2024. This PR does not perform production data repair. Rehearse on a database copy/Neon branch and retain a backup point before production approval. If any required page is challenged or unrecognized, keep published results and inspect the exact missing-page report; use saved-page uploads as needed.
