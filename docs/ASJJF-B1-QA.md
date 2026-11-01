# B1 acceptance and verification

Context (2026-11-02): initial `main` b6eadb3, following CI/Sentry fe9adf4; refreshed and rebased onto `main` 3634aef (public/admin hardening). Sources: `docs/2027-PLATFORM-PLAN.md`, existing Rails scraper/admin/auth/email/job code, public captured HTML, and Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (historical product context; current behavior verified in repository). The site serves tournament athletes/fans and staff managing events/results; ASJJF is the source of truth. B1 adds intake evidence only. Main targets Render Rails + worker and Netlify React. Deployment and actual B2 transport are outside this unmerged PR.

Acceptance: signed intake rejects invalid authentication, safely leases/retries work, pauses on challenges, stores compressed snapshots, parses the captured public page types, and supports staff check/upload/status with admin-only reset. Published results and rankings remain unchanged. Backfill is repeatable and preserves legacy IDs.

Affected-flow executor: agent. Owned database `marianas_open_test_b1`; only synthetic records and public HTML. Browser target: local ports 3331/5331, at 390px and 1440px. Native devices and real ASJJF/Resend traffic excluded. Required browser scenarios:

| ID | Starting state, actions and expected outcome | Result |
| --- | --- | --- |
| B1-UI1 | Staff/admin event with ASJJF sources → Check ASJJF now → clear queued confirmation; reload status and verify persisted deduplicated queue | passed at 390px and 1440px |
| B1-UI2 | Upload real saved HTML with matching URL/type → saved ID and parsed status; status shows parsed snapshot/summary, public results stay unchanged | passed at 390px and 1440px |
| B1-UI3 | Invalid upload URL/type → recoverable error; entered form stays available for correction | passed at 390px and 1440px |
| B1-UI4 | Open breaker → status shows pause and admin resets → refreshed persisted closed state | passed at 390px and 1440px |
| B1-UI5 | Phone/desktop navigation, reachable controls, meaningful empty/error/loading states, keyboard focus and no page overflow | passed at 390px and 1440px |

Automated gate, parser counts, runtime evidence, limitations, and final tested SHA will be recorded before PR handback.

Browser execution used a process-local synthetic administrator (no repository auth bypass) on `marianas_open_test_b1`, ports 3331/5331. Collaborative preview snapshots timed out twice; Chrome fallback verified mobile navigation/check, then an isolated Playwright browser completed upload, recovery, status, and reset on both required viewports. Queue stayed at six active requests after repeated checks; real saved 2062 HTML parsed to 93/246; challenge upload skipped parsing and opened the pause; admin reset persisted. Published results stayed empty. No horizontal overflow or page JavaScript errors. Desktop keyboard focus and reduced-motion setting checked. This establishes browser layouts, not native touch/keyboard behavior or live Clerk authentication (role enforcement has request coverage).

Local screenshot evidence (task host): `/tmp/mo-b1-evidence/event-390.png`, `event-1440.png`, `status-390.png`, `status-1440.png`. No private customer data was used. All browser tabs and server/browser processes were stopped after this phase.

Independent review found and fixed redirect identity mismatch, lost ranking division intent on dedupe, and uploader deletion blocked by retained snapshots. Regression tests cover each. Integration tests also caught/fixed the reserved Active Record `errors` attribute (stored as `error_count`, exposed as `errors`), absent GET body streams, and heartbeat uniqueness validation on repeat requests.

Final tested source: `2eceea75fb889d2dac2af9abe8743785cd99af06` (subsequent verification-document updates do not change application code). Post-rebase UI execution used source `86a8058`; the later changes affect fetcher-only final URL validation and team parser category validation, both covered by new request/parser regressions. Final independent scoped review confirmed both fixes without remaining material findings. CodeRabbit status is reported in the PR handoff separately; independent review does not imply a CodeRabbit approval.

Final automated gate:

- API: 178 runs / 3,747 assertions / zero failures or errors. One intentional skip checks that Rails is absent; the same check passes standalone.
- Standalone parsers: 56 runs / 3,036 assertions / zero failures, errors, or skips.
- Fresh migration rehearsal: dropped/recreated only the owned test DB, loaded the current `main` schema, ran both B1 migrations, and verified the resulting foreign keys. Full tests passed both after migration and after schema load. Backfill regressions cover repeat runs and preservation of admin discipline overrides.
- RuboCop: 246 files clean. Brakeman: zero warnings/errors with the unchanged eight-fingerprint baseline. Bundler-audit: no vulnerabilities.
- Web: clean install, lint, TypeScript, 42 Vitest tests, production build, and production dependency audit at the CI high-severity threshold passed. Audit retains one low and one moderate inherited production advisory; dependencies are unchanged.
- Impeccable 4.6.0 advisory check over all changed UI source files: `[]`.

Fixture counts asserted: gi 2062 93 divisions / 246 placements / 16 alone; no-gi 2063 39 / 100 / 8; female adult 36 / 77 / 11; male kids 48 / 121 / 9; calendar 85 events / eight selected Marianas events; adults teams 217 rows; gi individual index 85 divisions / 39 default rows; no-gi index 57 / 10; individual division 20401 158 rows. Copa/Tokyo each have 12 fee tiers; Manila has zero published fees. The supplied team fixture is adults; kids uses a separate request, with category validation tested through a fixture mutation until a real kids capture is available.

Cleanup: all owned server/browser processes and tabs closed; viewport overrides reset; the owned `marianas_open_test_b1` database dropped and its absence verified. No shared database/server/device was stopped. The unmerged PR branch/worktree remains for the merge owner. Local evidence remains under `/tmp/mo-b1-evidence/`. Deployment, live Clerk sign-in, physical-device behavior, B2 transport, and live alert-email delivery were not run and remain outside B1 verification.

## Round 2 review fixes — 2026-11-02

Orientation refreshed from the sources above, Brain Dump `work/shimizu-tech/marianas-open/STATUS.md`, both PR contracts, and current repository state. Base remains `origin/main` 3634aefa9f71a1b15b4d11a6e9cfa15e0b3d39b3; starting intake head cb96a926. This round changes only the internal fetcher boundary and compressed snapshot reads. Agent executes affected API/queue/parser journeys against the owned `postgres:///marianas_open_test_b1r2`; public HTML and synthetic records only. UI code is unchanged; previous browser coverage is historical, not rerun or claimed for this round. Live ASJJF/Resend, production, Mac mini, and native devices are excluded.

Required acceptance scenarios, all passed through Rack/request/job tests:

- R2-1: unauthenticated oversized declared body reaches the whole Rails Rack stack → 413 with zero input reads; unknown/chunked or understated length → at most cap + 1 bytes read, then 413 before JSON parsing. Limit is 2 MiB + 64 KiB. Other routes remain untouched.
- R2-2: unknown-length Unicode/whitespace JSON passes through buffering → exact original bytes authenticate and heartbeat persists. Published GET/POST signing vectors agree with the fetcher.
- R2-3: lease → network error with null HTML/status → saved skipped snapshot and pending request; fifth error → failed. Exact fetcher result shapes for oversized pages and null-field challenges are accepted. Every challenged outcome blocks work and opens the breaker/alerts, including `too_large` with no HTML.
- R2-4: capture signed error POST → accept → re-lease → replay identical bytes and signature → 409; new lease/token and snapshot count unchanged. Current token subsequently succeeds. Expiry rotates tokens and clears exhausted leases.
- R2-5: credential rate bucket exhausted → changing unsigned fetcher label still returns 429 and Retry-After. Heartbeats retain operational labels separately.
- R2-6: stored compressed evidence expands beyond 10 MiB → recorded parse failure; exactly the cap is readable; incomplete compressed streams still fail with Zlib::BufError; normal compressed public fixtures still parse.

Validation on the final round-2 code: schema loaded, new migration rehearsed, then schema loaded again before the complete suite. Rails: **195 runs / 3,853 assertions / 0 failures / 0 errors / 1 existing skip** (standalone-only parser check intentionally skips under Rails). Focused initial regression run: 37 / 202 / zero failures, errors, skips. RuboCop: 250 files clean. Brakeman CI flags: zero errors/warnings, unchanged eight-warning ignore baseline. Bundler-audit: no vulnerabilities. Zeitwerk eager-load check passed. Web: npm ci, lint, tsc -b, 42 tests, build:no-translate, and production audit at high threshold passed; inherited low/moderate production advisories remain. Local libvips emits an inherited HEIF/x265 plugin warning; it did not fail these gates. No UI or dependency source changes.

This implementation is pushed for the merge owner; it is not merged or deployed. Round-2 CI status and exact final head are recorded in the PR summary comment. The owned test DB is dropped before switching to fetcher work. Test processes exit; no servers/tabs/devices/containers are left running. The session-hook lifecycle ID is 01a198ab-0590-7c80-8ee9-454e8fd08b9e.
