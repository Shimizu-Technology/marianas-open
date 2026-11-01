# API and public hardening acceptance

Orientation: 2026-11-02, base e9cf217. The live platform serves multilingual tournament information and rankings; a small invited admin/staff team manages content. Sources: README.md, docs/AUTH-SYSTEM.md, the controllers/pages in this change, and Brain-Dump work/shimizu-tech/marianas-open (Steve's ASJJF rules decision supplied in the task). Main deploys web to Netlify and API/worker to Render. This PR is held for the parent/merge owner; production configuration and staging are excluded.

Agent-executed affected-flow QA uses an isolated Postgres database marianas_open_test_w2. Provider requests in tests are stubbed. Browser QA uses local web with production public API GETs only, plus isolated mocked browser fixtures for empty/loading/error event data and the Clerk render contract. No production admin sign-in, invitations, uploads, or writes.

Required cases:
- P1: Public/admin pagination rejects no requests with invalid offsets; page >= 1, sizes 1..200 (gallery retains 96 cap), rankings capped.
- A1: Last-admin and self-demotion return clear 422 errors; another admin can change a different user's role; UI announces API errors.
- A2: Pending invitation links once; accepted/revoked/expired or existing real Clerk IDs cannot be relinked.
- A3: A new JWKS key verifies after rotation; repeated unknown kids are throttled.
- S1: Hostile JSON-LD remains valid JSON without raw HTML delimiters or line separators.
- E1: Unknown event slug waits during loading, then displays noindex 404; /event selects current main event; missing/failed API cannot render fake event details. Check 390px and 1440px.
- R1: Rules primary CTA points at official ASJJF rulebook, secondary SJJIF reference works, no bundled PDF/env fallback, all seven locales translated. Check 390px and 1440px.
- I1: Normal admin login shows SignIn with signup hidden and invitation guidance; ticket + sign_up selects SignUp; other query strings do not. Local render only at 390px and 1440px, no production sign-in.
- J1: Weekly cleanup purges only unattached blobs older than two days; preserves recent uploads/attached blobs; recurring finished-job cleanup configured.
- D1: Invalid invite roles yield validation errors without sending an invite; URL precedence and ticket-bearing email link verified using stubs; viewer has no admin access.

Execution results and evidence will be recorded after the local gate. Resized desktop Chromium does not establish real-device keyboard/touch behavior or external Clerk delivery.

## Executed results

Tested branch `agent/api-and-public-hardening`, base e9cf217 plus this PR's implementation, 2026-11-02 (Guam). Agent executed all cases above. P1/A1/A2/A3/S1/J1/D1 passed via Rails and frontend tests; E1/R1/I1 passed with the limitations below.

- Isolated database create/schema load succeeded. Full Rails suite: **55 tests, 397 assertions, zero failures/errors/skips**. Log: `/tmp/marianas-w2-rails-tests-final.txt`.
- `npm ci`, `npm run lint`, `npx tsc -b`, and `npx vite build` passed. No dependency manifest or lockfile changes. npm reported existing dependency audit advisories; dependency work belongs to the other worker.
- `node --test tests/hardening.test.mjs`: **5 passed**, including actual SEO script rendering, hostile structured data, invitation flow selection, hidden signup props, and all seven rulebook translations. Clerk widgets are explicit local render stubs.
- `tests/browser-hardening.mjs`: **16 scenarios passed** in cached headless Chromium at **390×900 and 1440×900**, with no page runtime errors. Production public API was GET-only; no production admin sign-in or writes. Production currently has no active main event, so `/event` redirected to `/calendar`. An isolated current-main-event fixture verified that `/event` renders the selected event. Delayed empty and failed API fixtures verified loading and the absence of fake event details.
- Full `bin/rubocop`: **655 offenses** in 73 files. Every offending file is byte-for-byte unchanged from e9cf217; all **18 changed Ruby files pass**. This is a baseline gate failure, not a clean full-repo lint result. JSON: `/tmp/marianas-w2-rubocop-final.json`.
- `bin/brakeman --no-pager` stopped at the binstub's ensure-latest check (installed 8.0.2 vs advertised 8.1.0). `bundle exec brakeman --no-pager` completed: zero scan errors, **8 warnings**. All eight warning fingerprints match e9cf217 exactly. JSON: `/tmp/marianas-w2-brakeman.json`, base comparison `/tmp/marianas-w2-brakeman-base.json`. No dependencies were changed to bypass the gate.
- Impeccable advisory: two existing gradient-text warnings on the event heading (including its now-unreachable fallback), retained as the site's established gold heading treatment. No material new UI finding. JSON: `/tmp/marianas-w2-impeccable-final.json`.

Evidence: `/tmp/marianas-w2-qa/results.json`; screenshots in the same directory: `unknown-390.png`, `unknown-1440.png`, `rules-390.png`, `rules-1440.png`, `event-390.png`, `event-1440.png`, `main-fixture-390.png`, `main-fixture-1440.png`, `admin-normal-390.png`, `admin-normal-1440.png`, `admin-invite-390.png`, `admin-invite-1440.png`. Unknown-page recovery text and the back-home action, primary CTA focus styling, and admin wrapper layout were visually inspected. Admin screenshots explicitly label the local Clerk stub; external Clerk delivery/acceptance and real phone behavior were not exercised.

Runtime impact: no migrations. The existing Solid Queue worker/scheduler gains daily finished-job cleanup at 03:12 (500-row batches, 0.3s pause) and weekly unattached-blob cleanup Sunday 04:20 in the scheduler's configured timezone. Blob cleanup excludes the newest two days, rechecks attachments, and relies on Active Storage's FK protection during purge. Normal deploy/restart of API and worker is required. Production frontend-origin requirements are in AUTH-SYSTEM.md; production environment values were not inspected or changed. The 36,880,536-byte PDF, its obsolete compression helper, and its environment fallback are removed.

Main has no root `.github/workflows` at this base (only nested `api/.github`, which GitHub does not execute). Actual PR checks/reviewer status must be inspected after opening; this work does not install CI. Required full-repository lint/security gates remain visibly blocked by the baseline findings above. The PR is held for the parent/merge owner.
