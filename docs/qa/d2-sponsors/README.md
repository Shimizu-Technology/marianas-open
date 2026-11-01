# Phase D2 sponsor placement verification

Date: November 2, 2026. Starting source: `8dd17ad` (`origin/main`). Branch: `agent/sponsor-placements`; PR remains unmerged for its merge owner.

The public site serves athletes and fans; staff Steve and Carm maintain content through `/admin`. The primary task is to add a sponsor, select its locations and dates, preview it, and save without a developer. The editor follows the existing dark brand, uses visible labels and native controls, and keeps touch targets at least 44 CSS pixels. Sponsor sections have no automatic movement. The native video dialog supplies keyboard focus containment and returns focus to its trigger.

Sources: `docs/2027-PLATFORM-PLAN.md` D2; existing HomePage and EventDetailPage sponsor rules; sponsor model/controller/admin editor at the starting commit; PR #79 (`codex/admin-self-service`) scheduling, URL-validation, media-validation, and audit patterns; Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (November 2 update and Carm's outstanding featured sponsor request).

Execution owner: implementation agent. Scope: affected sponsor journeys, rather than a whole-site audit. Public QA uses only `marianas_open_qa_d2`, copied from the local development database while it had zero connections. API: 3381; Vite: 5381. Automated API tests use `marianas_open_test_d2`. Production data is untouched.

## Required scenarios

| Case | Expected outcome | Coverage |
| --- | --- | --- |
| Backfill compatibility | Same home tier membership/order/URLs, preserved event lineup, Hotel Tano scoped to 2026, repeated backfill creates no duplicates | Migration test and QA copy comparison |
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

Final integrated base: `0a8b40b` (main's results sync and official rankings). Browser checks exercised the final sponsor rendering in `a06572ec192a3c1390fbc2070c611fda8a38197d`; the later API test-host setup and evidence commits do not change the UI. The combined schema retains main's results-sync and ranking tables and columns. Rebase conflicts were limited to the schema version and adjacent locale additions; a structured comparison confirms that every main locale key and every sponsor translation was retained unchanged. The rankings integration changes no sponsor UI component or public home/event sponsor path. Full automated gates were restarted after integration; the browser evidence predates that integration.

- **Passed:** home tiers, preserved Hotel Tano link, featured keyboard activation, no iframe before activation, no autoplay, Escape dismissal, focus restoration, full-opacity 2026 event tiers, and Hotel Tano exclusion from Copa 2027, at both 390 and 1440 CSS pixels. No horizontal overflow was observed. Content remains available with standard and reduced-motion preferences. See [the nine browser cases](browser-results.json).
- **Passed:** editor fixture layout, labels, logo previews, featured/grid previews, and sticky save placement at both widths. Component tests cover create/save, dates, placement reorder, delete cancellation/confirmation, initial-load recovery, video preview without submission, and failed upload retry without duplicate sponsor/placement creation. Real authenticated browser saves remain **blocked by local Clerk sign-in**; request tests cover persisted writes and audit outcomes separately.
- **Passed:** [backfill comparison](backfill-comparison.json) shows identical home tier membership, order, and effective URLs; unchanged sponsor records; the same 2026 event membership; and 39 placements after repeated backfill execution. GVB remains presenting, Ready H2GO remains secondary, official sponsors remain official, and the legacy ASJJF partner stays outside the home grid. Hotel Tano retains its official home link and becomes explicitly scoped to the 2026 event. No featured placement is created automatically. Event grouping/labels and logo treatment intentionally improve after deployment.
- **Passed:** [locale verification](locale-verification.json), with 67 new keys present in all seven locales and interpolation tokens preserved. GT generated translations; native-speaker editorial review was not performed.

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

CodeRabbit reported its OSS review limit at the earlier head; a success-labelled skipped check is not a completed review. Its final available status is recorded in the PR handoff. Impeccable 4.6.0 reported three existing gradient-heading findings in HomePage/EventDetailPage, with no new sponsor/editor findings; those existing brand headings were retained.

## Engineering gate and cleanup record

The final executed counts, CI state, exact head SHA, and cleanup result are recorded in [PR #122](https://github.com/Shimizu-Technology/marianas-open/pull/122). The gate is:

- Dedicated `DATABASE_URL=postgres:///marianas_open_test_d2`, `RAILS_ENV=test`: schema load, full `bin/rails test`, `bin/rubocop`, `bin/brakeman --no-pager --exit-on-warn --exit-on-error`, and `bin/bundler-audit check --update`.
- Web: `npm ci`, lint, `npx tsc -b`, full `npm test -- --maxWorkers=2`, and `npm run build:no-translate`. Worker count is capped to reduce contention on the shared workstation; all test files run. Production npm audit also uses CI's high/critical threshold.

An earlier full API run before rankings integration had 327 tests/5,221 assertions, zero failures, one ASJJF evidence-lock timeout, and one skip under very high workstation load. The isolated retry passed all 17 tests/114 assertions, including that lock test and all sponsor/query/migration cases. A newly added both-logo URL assertion initially lacked a test URL host; the test now configures and restores its own host. The full gates were then restarted against the combined main and sponsor code. The new legacy website editor assertion waits for the asynchronous loaded form value rather than asserting during initial editor setup.

Task-owned Puma 3381, Vite 5381, headless browsers, and T3 preview were stopped/closed after public QA; temporary harness files and copied logo blobs were removed. The QA database copy was dropped. The remaining test database and exact fallback Chrome tab are cleaned before the final handoff, whose verified status is in the PR. Shared services and other workers' tabs/windows are preserved. The isolated branch/worktree remain available for the merge owner.
