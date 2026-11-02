# Phase D2 sponsor placement verification

Date: November 2, 2026. Starting source: `8dd17ad` (`origin/main`). Branch: `agent/sponsor-placements`; PR remains unmerged for its merge owner.

The public site serves athletes and fans; staff Steve and Carm maintain content through `/admin`. The primary task is to add a sponsor, select its locations and dates, preview it, and save without a developer. The editor follows the existing dark brand, uses visible labels and native controls, and keeps touch targets at least 44 CSS pixels. Sponsor sections have no automatic movement. The native video dialog supplies keyboard focus containment and returns focus to its trigger.

Sources: `docs/2027-PLATFORM-PLAN.md` D2; existing HomePage and EventDetailPage sponsor rules; sponsor model/controller/admin editor at the starting commit; PR #79 (`codex/admin-self-service`) scheduling, URL-validation, media-validation, and audit patterns; Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (November 2 update and Carm's outstanding featured sponsor request).

Execution owner: implementation agent. Scope: affected sponsor journeys, rather than a whole-site audit. Public QA uses only `marianas_open_qa_d2`, copied from the local development database while it had zero connections. API: 3381; Vite: 5381. Automated API tests use `marianas_open_test_d2`. Production data is untouched.

## Required scenarios

| Case | Expected outcome | Coverage |
| --- | --- | --- |
| Backfill compatibility | Same home tier membership/order/URLs, preserved 2026 event membership, Hotel Tano scoped to 2026, repeated backfill creates no duplicates | Migration test and QA copy comparison |
| Scheduling | Inclusive first/last day in Guam time; future/expired placements hidden; open-ended windows work | Model and public request tests |
| Scope and validation | Event placements select only global/current-event entries; cross-organization scopes rejected; safe CTA/video URLs only | Model and request tests |
| Staff saves | Sponsor and placements save together, audit identifies actor/time, errors permit retry | Request and component tests |
| Authorization/deletion | Anonymous/viewer writes blocked; staff deletion requires UI confirmation and retains audit record | Request and component tests |
| Logos/tiers | Correct logo surface, consistent boxes, fallback name badge, no dimming; home/event labels correct | Component tests and 390/1440 browser checks |
| Featured/video | Multiple featured sponsors, no autoplay, allowed provider only, keyboard dialog open/close/focus restoration | Component tests and browser checks |
| Phone editor | Fields/preview readable at 390px, no overflow, save/errors/reorder/confirmation usable | Component tests plus isolated rendered editor fixture |

Real admin sign-in is blocked locally by Clerk, as anticipated in the task. Admin component tests exercise save, retry, and deletion flows with mocked services; screenshots use an isolated component harness with sponsor/event data read from the QA copy. They are not evidence of a real authenticated admin session. Browser widths are CSS viewport checks, not a physical phone/keyboard test.

The development copy included empty legacy PR #79 placement tables. Only the obsolete placement table in the task-owned QA copy was removed before applying current main's migrations. The committed schema was generated from a fresh main schema in the dedicated test database, not that historical development lineage.

## Executed results

Final integrated base: `60aac4b`, including main's results sync, official rankings, and D1 event publishing/season rollover. Sponsor implementation and review fixes are present in `a08c587`. The combined schema retains main's tables and columns; the latest integration conflict was limited to the schema version header. A structured comparison confirms that every main locale value and all sponsor translations remain unchanged. Full automated gates and real-API public acceptance were rerun after this integration. Admin fixture evidence covers the same sponsor editor source; D1 changes are scoped to the separate event editor.

- **Passed:** home tiers, preserved Hotel Tano link, featured keyboard activation, no iframe before activation, no autoplay, Escape dismissal, focus restoration, full-opacity 2026 event tiers, and Hotel Tano exclusion from Copa 2027, at both 390 and 1440 CSS pixels. No horizontal overflow was observed. Content remains available with standard and reduced-motion preferences. See [the nine browser cases](browser-results.json).
- **Passed:** editor fixture layout, labels, logo previews, featured/grid previews, and sticky save placement at both widths. Component tests cover create/save, dates, placement reorder, delete cancellation/confirmation, initial-load recovery, video preview without submission, and failed upload retry without duplicate sponsor/placement creation. Real authenticated browser saves remain **blocked by local Clerk sign-in**; request tests cover persisted writes and audit outcomes separately.
- **Passed:** [backfill comparison](backfill-comparison.json) shows identical home tier membership, order, and effective URLs; unchanged sponsor records; the same 2026 event membership; and 39 placements after repeated backfill execution. GVB remains presenting, Ready H2GO remains secondary, official sponsors remain official, and the legacy ASJJF partner stays outside the home grid. Hotel Tano retains its official home link and becomes explicitly scoped to the 2026 event. No featured placement is created automatically. Event grouping/labels and logo treatment intentionally improve after deployment.
- **Passed:** [locale verification](locale-verification.json), with 69 new keys present in all seven locales and interpolation tokens preserved. The original 67 keys use GT-generated translations; the two later recovery messages are translated in all seven locales. Native-speaker editorial review was not performed.

The featured screenshots use a clearly marked QA-only Hotel Tano placement and an existing local tournament video to demonstrate the optional bar. This fixture was added only to the disposable QA copy and was not included in the migration.

## Screenshots

| Surface | Before, 390 / 1440 | After, 390 / 1440 |
| --- | --- | --- |
| Home sponsors | [390](home-before-390.png) / [1440](home-before-1440.png) | [390](home-after-390.png) / [1440](home-after-1440.png) |
| Event sponsors | [390](event-before-390.png) / [1440](event-before-1440.png) | [390](event-after-390.png) / [1440](event-after-1440.png) |
| Admin editor | [390](admin-before-390.png) / [1440](admin-before-1440.png) | [390](admin-after-390.png) / [1440](admin-after-1440.png) |
| Featured bar | — | [390](featured-after-390.png) / [1440](featured-after-1440.png) |
| Actual admin viewport | — | [390](admin-viewport-390.png) / [1440](admin-viewport-1440.png) |

Before screenshots render the original components from starting main `8dd17ad` against the same local sponsor data. For tall section captures only, the fixed public header was hidden to prevent screenshot overlay artifacts and the admin save footer was unstuck. The admin viewport screenshots and browser interaction checks retain the real sticky layout.

T3 preview screenshot calls twice failed with `Preview automation snapshot timed out after 15000ms.` Chrome extension automation also lost its connection. Isolated Playwright supplied the public/browser evidence after those failures. Temporary before/after harness files were removed.

## Review and advisory checks

Two independent review rounds found and prompted fixes for preview buttons submitting forms, upload retry losing pending files/identities, scoped event deletion, Hotel Tano's legacy home link, and integration of main's schema. A final independent static review found no material findings at `733b5d6`, followed by a clean delta review through `a06572e` covering both-logo eager loading, initial-load retry, and placement reorder tests. A further bounded review verified unchanged-legacy-URL compatibility, HTTPS editor normalization, and preservation of main schema/locale data after rebasing to `0a8b40b`, with no material findings. These are advisory code reviews; runtime acceptance and test execution belong to this implementation agent.

CodeRabbit initially reported its OSS review limit, then reviewed `93dcbcc` after the allowance reset. Its 14 inline findings and five follow-ups were triaged; see [review resolutions](REVIEW.md). Material findings were fixed and verified. The only deferred item is a nonblocking admin-list query optimization at the current 20-sponsor scale. Independent review of backend fix `22a6c0e` found no material findings; the frontend slice was reviewed separately on integration, including URL parity. Final rereview availability is recorded in the PR handoff. Impeccable 4.6.0 reported three existing gradient-heading findings in HomePage/EventDetailPage, with no new sponsor/editor findings; those existing brand headings were retained.

## Engineering gate and cleanup record

The final local gate passes: **373 API tests, 5,580 assertions, zero failures/errors, one skip; 251 web tests in 46 files; Ruby style (321 files), Brakeman, bundler-audit, lint, TypeScript, and production build.** CI state, exact head SHA, and cleanup result are recorded in [PR #122](https://github.com/Shimizu-Technology/marianas-open/pull/122). The gate is:

- Dedicated `DATABASE_URL=postgres:///marianas_open_test_d2`, `RAILS_ENV=test`: schema load, full `bin/rails test`, `bin/rubocop`, `bin/brakeman --no-pager --exit-on-warn --exit-on-error`, and `bin/bundler-audit check --update`.
- Web: `npm ci`, lint, `npx tsc -b`, full Vitest execution and `npm run build:no-translate`. The latest-main local run uses one worker, a 20-second test timeout, and a temporary five-second Testing Library DOM wait because unchanged sibling tests exceeded default waits under extreme workstation load. No assertions or test files were changed or skipped, and the temporary configuration was removed afterward. CI uses the committed default configuration. Earlier sponsor-source gates passed 221 tests in 39 files with standard DOM waits. Production npm audit also uses CI's high/critical threshold.

An earlier full API run before rankings integration had 327 tests/5,221 assertions, zero failures, one ASJJF evidence-lock timeout, and one skip under very high workstation load. The isolated retry passed all 17 tests/114 assertions, including that lock test and all sponsor/query/migration cases. A newly added both-logo URL assertion initially lacked a test URL host; the test now configures and restores its own host. The full gates were then restarted against the combined main and sponsor code. The new legacy website editor assertion waits for the asynchronous loaded form value rather than asserting during initial editor setup.

Task-owned Puma 3381, Vite 5381, headless browsers, and T3 preview were stopped/closed after public QA; temporary harness files and copied logo blobs were removed. Both QA phases stop their owned servers and headless browsers. The exact fallback Chrome tab was closed after D1 released native Chrome. Both disposable databases are dropped before the final handoff; the verified status is in the PR. Shared services and other workers' tabs/windows are preserved. The isolated branch/worktree remain available for the merge owner.


## Retest after CodeRabbit fixes

Backend fixes originally reviewed at `22a6c0e` and the isolated frontend recovery slice were rebased without implementation changes; the combined sponsor source is `a08c587`, including the trailing-slash YouTube parser parity correction. The latest-main gates run against that source. [Twelve public cases](browser-review-results.json) cover both 390/1440 widths with real API reads, selective request failures, Retry recovery, retained last-good data, actual QA scheduling-window changes on an open page, video keyboard behavior, home links/tiers, and event scope. [Eight rendered editor cases](browser-admin-review-results.json) cover both widths, sticky Save/feedback, pending-save field locking, retained failed edits/retry success, missing targets, and event-scope labels. Editor writes are mocked; authenticated admin browser writes remain blocked by Clerk.

The first recovery runner used the wrong button label; after correcting it, the restarted API was found to be missing port 5381 in its local CORS allowlist. The local launch was corrected and preflight verified before the passing final public run. These were runner/environment failures, not accepted product behavior. After integrating D1, a temporary QA-only URL initializer corrected Active Storage redirects from the development default port 3000 to 3381; uploaded logos were verified with successful final HTTP responses before all 12 public cases and captures passed again. The initializer was removed after stopping the QA API.

Additional evidence: public recovery [390](public-recovery-390.png) / [1440](public-recovery-1440.png), and visible save failure [390](admin-save-error-390.png) / [1440](admin-save-error-1440.png). After screenshots were refreshed against the final sponsor UI. The guarded [backfill verifier](verify_backfill.rb) reproduces the comparison on the named QA copy and rolls back its changes; its output includes the before/after 2026 sponsor names. It intentionally does not claim a per-event comparison of all 29 events.
