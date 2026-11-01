# ASJJF snapshot pipeline (Phase B1)

B1 stores public ASJJF pages, queues browser fetches, and parses saved HTML. It does not apply results to `event_results`, change athletes/academies, or compute/publish rankings. The existing import path is unchanged; B3 and B5 will consume the saved parser output.

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

The event results admin page includes check/upload controls and a link to status. Uploads save evidence; they do not overwrite public results. Never upload a login/session page containing private credentials. Download public HTML from ASJJF in a regular browser when automatic fetching is unavailable. Confirm the page type and original URL, then inspect the parse status and summary. Staff cannot resume a safety pause; an administrator reviews it first.

## Retention and recovery

`PruneAsjjfSnapshotsJob` runs daily at 04:00 through the existing recurring Solid Queue schedule. It preserves the latest `outcome=ok` snapshot for every URL forever (including pages awaiting a parser fix) and removes other snapshots older than 120 days. Request references to pruned snapshots are nullified. The latest success is ordered by fetched time, then ID. There is no automatic deletion of queue/history/heartbeat records.

To retry a parse after a parser fix: `ParseAsjjfSnapshotJob.perform_later(snapshot_id)`. Ranking reparses enqueue the B5 apply job for confirmed sources; other page types retain their separate apply/review flow. To resume fetching: investigate challenge evidence, reset the breaker as admin when appropriate, then requeue the event. This PR does not deploy/configure B2 or verify email delivery with a live Resend send.

## Official ranking mirrors (B5)

Confirmed sources live in `asjjf_ranking_seasons`; `current` is an explicit admin choice. The migration configures 2026 Gi individual/team 227 and No-Gi individual 234, with pending lists and no imported standings. Admins edit these IDs at `/admin/asjjf`. Menu links found in saved pages become suggestions only. Selecting a suggestion fills the form; saving confirms it. No discovery result changes the current season automatically.

After parsing ranking pages, `ApplyRankingSnapshotJob` publishes configured lists, division inventories, and official entries. Each division/table replacement runs under a list lock and transaction. It preserves the source text, decimal points, medal counts where published, normalized and raw country codes, and snapshot provenance. Matching uses canonical names and approved aliases; ambiguity stays unmatched, and no athlete or academy is created. Identity merges transfer ranking links to the surviving record. Older snapshots cannot overwrite newer tables. Division snapshots received before their index are replayed when the index establishes the mapping.

Malformed, incomplete, and empty replacements preserve previous data. Any decrease in row count, or any removal from the division inventory, is held for review, since a closed HTML table alone cannot prove completeness. The persistent, paginated held-snapshot queue shows the reason and loads each saved summary on demand; it is independent of the 20 most recent uploads. After checking the smaller table against ASJJF, an administrator can explicitly approve it; an empty replacement remains blocked. Verified division removals delete the removed divisions and their entries atomically. Failed or login-required sources are unavailable when there is no published data; a failed fetch does not erase a previously published table. Referenced source snapshots and outstanding held snapshots survive retention.

`PlanRankingSyncJob` runs nightly at 23:00 in the existing recurring schedule. It queues confirmed current-season lists once per seven days during that calendar season, plus once for each new `results_imported_at` observed within the previous three days for events dated in that season. It waits while any relevant index, team, or division request is pending/leased. This retains the existing 90-second pacing and challenge breaker; a full 2026 crawl is about 146 requests (roughly 3.7 hours). It does not change results-import jobs or enqueue additional daily crawls. The three-day event-results check also runs outside the calendar-season window.

Public API (five-minute public caching and conditional ETags):

- `GET /api/v1/rankings` and `/rankings/lists`: confirmed seasons and source list inventory.
- `GET /api/v1/rankings/lists/:id/divisions`: ordered divisions and gender/age groups.
- `GET /api/v1/rankings/lists/:id/entries?division_id=:id&page=1&per_page=50`: official rows, capped at 100 per page; omit division for a team list.
- `GET /api/v1/rankings/standings?competitor_id=:id`: matched current-season official standings.

The public page no longer uses `RankingCalculator`. Legacy profile and academy APIs retain their medal-stat fields for compatibility; public pages label medals as history and do not display calculated points. There is no public country-ranking substitute for ASJJF standings.

After merge, deploy migrations and the worker, then enqueue one full check for 227 and an individual-only check for 234:

```ruby
planner = Asjjf::FetchPlanner.new(requested_by: "B5 rollout")
planner.plan_ranking(227)
planner.plan_ranking(234, include_team: false)
```

Run this once in the deployment environment after checking the fetcher/breaker state. The existing fetcher fills snapshots over its next run; division requests fan out from each index. Inspect `/admin/asjjf` for parse/apply outcomes. A kids team tab appears publicly only after its separate table becomes available. A 2025 login-required page can stay unavailable; do not submit session or credential-bearing HTML. Confirm the 2027 IDs and explicitly select 2027 when its official sources are published.

For isolated local acceptance, use the owned `marianas_open_qa_b5` database and `bin/rails runner script/seed_official_rankings_qa.rb`. The script refuses any other database name and uses only the saved public ranking fixtures. Never run fixture seeding on production.
