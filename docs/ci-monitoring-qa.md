# CI, monitoring, and deploy recovery verification

Verified on 2026-11-02 in the isolated `agent/main-ci-and-monitoring` worktree, starting at `e9cf217`. Results apply to the implementation committed with this record. Production settings and the `staging` branch were not changed.

## Context and acceptance

The public platform serves tournament calendars, results, competitor profiles, galleries, and role-protected content administration. Sources: root README, `web/src/App.tsx`, API configuration, and Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (historical notes were checked against current code). Web is deployed by Netlify; API and a separate Solid Queue worker deploy through Render from `main`, per the implementation brief. This PR adds CI and opt-in monitoring and lets visitors recover when an old tab requests a chunk removed by a deploy. No tournament data or controller/service behavior is changed.

Agent-executed affected-flow acceptance: CI must exercise API/web checks, absent DSNs must leave Sentry uninitialized, job failures must reach Sentry's test transport, and lazy-import failures must recover once without a reload loop. The recovery screen must fit 390px and desktop layouts with working Reload and Home actions.

## Local gate

- API database: only `marianas_open_test_ci_monitoring_59aedf20`, created and schema-loaded through `DATABASE_URL` with `RAILS_ENV=test`.
- `bin/rails test`: 39 runs, 193 assertions, no failures/errors/skips. A first test run failed because Sentry decorates the exception message with its class; the assertion was corrected and the entire suite rerun.
- `bin/rubocop`: 200 files, no offenses after recording 684 inherited offenses as file-specific exclusions. No cop is disabled globally.
- `bin/brakeman --no-pager`: eight inherited warnings. Round 2 replaces the original count gate with `api/config/brakeman.ignore`, containing these eight warning fingerprints and an inherited-debt note for each. CI runs `bin/brakeman --no-pager --exit-on-warn --exit-on-error`: every warning outside that file and every scan error fails. Both the original and updated scanner counted eight. Existing findings remain security debt; this is not a clean security scan.
- `bin/bundler-audit check --update`: no vulnerabilities after Rack 3.2.8 and Crass 1.0.8 updates.
- Web: `npm ci`, `npm run lint`, `npx tsc -b`, `npx vite build`, and `npm test` passed. Vitest: four files, ten tests. Production npm audit has no high/critical findings; inherited low/moderate findings remain.
- Impeccable advisory scan of the changed ErrorBoundary: no findings (`[]`).

The Mac's libvips emits a warning about an unavailable HEIF plugin / `libx265.216.dylib`; it did not prevent the API suite from passing. Ruby 3.3.7 and Node 22.22.3 were used by the API/frontend commands respectively.

## Browser scenarios

Executed with headless Chrome after T3 preview snapshot inspection timed out twice and the computer-use browser was unavailable. Test fixtures and browsers were temporary; DSNs were unset. No production API writes were performed.

| Case | Result | Observable outcome |
| --- | --- | --- |
| Render failure at 390px | Passed | On-brand recovery UI, both controls visible, document width equals viewport width |
| Render failure at 1440px | Passed | Recovery UI remains centered, both controls visible, no horizontal overflow |
| Keyboard Reload at both widths | Passed | Enter on the focused button reloads and returns to the boundary for the deliberately broken fixture |
| Home action | Passed | Browser navigates to `/` |
| Missing production lazy chunk | Passed | Intercepted built HomePage chunk with HTTP 404; exactly two document navigations (initial load plus one automatic reload), then boundary with sessionStorage build guard |
| Persistent chunk failure | Passed | Repeated import failure reaches the boundary rather than automatically reloading again |
| Manual recovery | Passed | Removing the simulated chunk failure and clicking Reload returns to the app |
| Disabled/enabled Sentry | Passed (automated) | Web initialization/capture are skipped without DSN; API client is uninitialized without DSN; enabled ActiveJob error reaches DummyTransport without network transport |

Evidence produced locally: `/tmp/mo-recovery-390.png`, `/tmp/mo-recovery-1440.png`, `/tmp/mo-ui-qa.log`, `/tmp/mo-production-qa.log`. Screenshots were inspected. Physical phones, native keyboard/gesture behavior, live Sentry delivery, and production deployments were not tested. Leon must provision the two projects and set DSNs before live capture can be verified.

Netlify's missing-asset rule was checked against [documented 404/file-shadowing behavior](https://docs.netlify.com/manage/routing/redirects/redirect-options/): the unforced asset rule precedes the SPA fallback, so existing assets win and missing ones return 404. Vite preview verifies the built application and reload logic but does not emulate Netlify routing.

## Runtime and cleanup

Monitoring adds an SDK to each app; without DSNs no Sentry client is initialized. API traces default to 1%; browser performance tracing and replay are not enabled. Queue arguments, browser cookies, request bodies, user details, and URL query values are excluded from collection. Reload/Home can discard unsaved edits.

Task-owned QA servers, preview tab, and headless browser processes were stopped. The isolated test database is dropped before handoff. Shared PostgreSQL and other sessions' resources are left running. PR review and GitHub CI status are reported separately; this record does not claim deployment acceptance.

## Round 2 review fixes — 2026-11-02

Starting head: `674ac2d`. Work is isolated in `t3-ae4ca359` on local branch `agent/main-ci-monitoring-r2`, because the PR branch is already checked out in `t3-59aedf20`. Push destination remains `agent/main-ci-and-monitoring`; base remains `main`. The parent owns merge and release verification.

Agent-executed affected-flow acceptance covers safe API boot with bad sampling configuration, the fingerprint gate, per-deploy reload identity, and the Reload/preload listener tests. Product context above was refreshed against the current README, production build scripts, Netlify configuration, and Brain Dump status. This round changes no tournament/admin data behavior or recovery-screen layout.

- Both CI jobs use Ubuntu 24.04, avoiding the Ruby 3.3.7 prebuilt-runtime gap on Ubuntu 26.04.
- Brakeman: eight ignored fingerprints, zero active warnings, zero scan errors. A temporary ignore file with one fingerprint replaced failed with exit 3 and printed that warning, proving a same-count identity change fails. The checked-in ignore file was unchanged by that negative check.
- API sampling: missing rate defaults to 0.01; blank, malformed, and non-finite rates default with a warning; finite rates outside 0..1 clamp with a warning. Tests cover these cases and valid endpoints/fractions. No DSN still skips initialization. The disabled test also passed in a separate process with a DSN set at boot (one test / one assertion). Environment and logger state are restored after tests; the disabled test always clears the DSN and closes an initialized SDK before reloading.
- Build identity combines commit with Netlify `DEPLOY_ID`, then `BUILD_ID`, then a timestamp computed once per build. Loading Vite config twice with the same commit produced different fallback identities; explicit deploy/build ID precedence also passed.
- Web CI uses `npm run build:no-translate`. Netlify's `npm run build` adds `translate:safe` before the same SEO generation, TypeScript, and Vite steps. CI exercises those deterministic build steps and the checked-in translations without translation API credentials, remote calls, or generated translation updates. SEO output was verified in the build; date-dependent generated changes to tracked public files were restored after testing.
- Reload recovery now has a click-and-assert test using an optional callback; production still uses `window.location.reload`. A first unmarked preload event is cancelled and stores its guard; the existing repeat-event test verifies that subsequent failures are not suppressed.

Final local gate on the round 2 changes: isolated database `marianas_open_test_w1r2` created and schema-loaded; Rails **51 tests / 229 assertions**, zero failures/errors/skips; RuboCop **200 files clean**; Brakeman and bundler-audit pass. Web `npm ci`, lint, `npx tsc -b`, `npm run build:no-translate`, and `npm test` pass (**4 files / 11 tests**). Production npm audit has no high/critical findings; one low and one moderate remain. Impeccable advisory: no findings. Ruby 3.3.7 and Node 22.22.3; inherited libvips HEIF warning remains nonblocking. Initial sample-rate tests failed because Minitest 6 lacks built-in mocks; logger capture now uses `StringIO` and the full suite passed.

Round 2 verification is automated. The earlier browser-layout evidence remains historical; browser/device journeys, live Sentry delivery, Netlify routing, and production release acceptance were not rerun this round. GitHub check status is recorded in the PR/handoff after push. The owned test database and generated build/dependency output are removed before handoff; no servers or browsers were started, and shared services remain untouched.
