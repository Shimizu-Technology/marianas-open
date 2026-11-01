# C1 season-aware public site QA

## Scope and sources

Implementation branch: `agent/season-aware-site`, base `1472f17` (main, November 2, 2026; rebased over C2 and B4). Agent-executed affected-flow QA; public GET requests only. No production data changes.

Sources: `docs/2027-PLATFORM-PLAN.md`, current public event/list/gallery/results APIs, `api/app/models/event.rb`, `api/app/services/public_event_loader.rb`, and the five affected public pages. Product context also checked against Brain-Dump `work/shimizu-tech/marianas-open/2026-02-25-uncle-steve-meeting.md`; current plan/data take precedence over historical plans.

Athletes, academies, parents and fans need an accurate next event, results and photos across seven languages, chiefly on phones. Keep the dark/gold/Outfit identity and existing hero structure. Use Guam calendar days for phase boundaries, stored status for explicit completion/cancellation, published URLs/counts for actions, and no inferred dates/prizes/ratings. Archived sales copy is retained in the database and omitted from completed/cancelled views. Global C2 files are excluded.

## Required scenarios

Each case requires 390×844 and 1440×900 browser dimensions unless stated otherwise. Desktop browser resizing checks responsive web behavior, not real-phone gestures or installed PWA behavior.

| Case | Starting state and actions | Expected outcome | Status |
| --- | --- | --- | --- |
| C1-01 | Home → next published event → event detail | Copa 2027, source date/city and actual ASJJF links; only current cycle journey | Passed at both widths |
| C1-02 | Calendar → upcoming/past tabs and event details | Current cycle only; no completed 2026 qualifying poster strip | Passed at both widths |
| C1-03 | Open Marianas Open 2026 | Completed hero/date; pending results with official sources, 884-photo gallery, short recap; no sales/travel/promises | Passed at both widths |
| C1-04 | Open Hong Kong 2026 | Completed, official result sources; no old prize promise or registration | Passed at both widths |
| C1-05 | Open Copa 2026, search and expand results | Published results are usable and lead the archive layout | Passed at both widths |
| C1-06 | Open Copa 2027 | Upcoming hero; data-backed registration links and useful details | Passed at both widths |
| C1-07 | Past events → compare Copa/MO/Hong Kong | Results chips only when count >0; pending for zero; useful detail links | Passed at both widths |
| C1-08 | Event preview photo → gallery lightbox → next/close; gallery category/load more | Correct selected photo opens; captions omit file IDs; keyboard/scroll/focus recover | Passed at both widths |
| C1-09 | Japanese home and completed event, gallery | New UI/date/counter copy translated, no new English fallback | Passed at both widths |
| C1-10 | Controlled off-season/no-events and cancellation fixtures | Recap/empty actions, follow links and no old posters or sales | Passed at both widths |

Production data has 2027 upcoming events. Off-season, cancellation and unavailable-summary cases require isolated browser fixtures or automated rendering tests; they are never simulated by writing to production.

## Automated gate

Initial run: web npm ci, lint, tsc -b, 64 Vitest tests, build:no-translate passed. API isolated DB `marianas_open_test_c1` created/schema loaded; 197 runs/3,885 assertions, 0 failures/errors, 1 existing skip. RuboCop 250 files clean, bundler-audit clean, Brakeman no warnings. Local libvips emits a missing optional HEIF/x265 module warning; PNG fixtures passed.

Final-head gate, screenshots, interactions and cleanup are recorded below after execution. Impeccable reported three existing gradient-text warnings in the home/event heroes. These are intentional existing brand styling; C4 owns the visual refresh. No hooks or packages were added to the repository.

## Final integration and review

Runtime source: `6f7587f` (the following `9c75d06` commit completes one test fixture only). The final evidence commit changes only QA artifacts. C2 global files remain unchanged in this PR. API gate after integration: **279 runs, 4,925 assertions, 0 failures/errors, 1 skip**; RuboCop **273 files clean**; Brakeman no warnings. Final web gate: npm ci, lint, tsc -b, **134 Vitest tests across 27 files**, and the production-API build all passed. The event helper suite also passed under `TZ=America/Los_Angeles` (14 tests). Production-dependency audit passed the high-severity threshold (one low and one moderate existing advisory).

Independent Codex review at `3b0cf8e` found two P2s: optional summary failure discarded valid divisions, and the off-season result anchor did not scroll after loading. Both were fixed in `6f7587f`; round 2 reviewed those changes and reported no material findings. The added test fixture initially lacked a required belt field; `9c75d06` supplies it. Browser fixtures cover summary HTTP 503 with real production result divisions and the actual latest-results click/scroll.

The first post-rebase web run hit a timing failure in C2's unchanged GlobalSearch keyboard test. Its isolated three-test run and the following full 133-test run passed without changing C2 files. This transient is recorded rather than treated as a C1 fix.

The T3 preview loaded production pages but screenshot capture timed out twice (`Preview automation snapshot timed out after 15000ms.`). QA used isolated headless Chrome 156 via the repository's pinned Playwright Core. Production CORS does not allow local port 5351: the harness adds CORS response headers to **GET `/api/v1/*` responses only**, preserving real production response bodies. Image requests go directly to production/S3. No admin, registration submissions, ASJJF scraping or production writes were performed.

Controlled fixtures are clearly named `fixture-*`: they override event-list responses only in the isolated browser. Off-season uses real MO/Copa 2026 data/counts; cancelled/live fixtures alter Copa 2027's state/date only inside that browser. The summary-error fixture returns a local 503 for summary statistics while fetching actual result divisions from production. The harness closes contexts only after removing route handlers; an early cleanup race was corrected and rerun.

Coverage: all eight requested English routes at 390×844 and 1440×900; Japanese home, MO 2026 and gallery at both widths; no horizontal overflow. Home details navigation, calendar tabs, result search with empty/recovered filter, preview-photo deep link, next/Escape lightbox controls, scroll restoration, gallery load more and category selection checked. Off-season results/gallery destinations, no-events note, cancelled/live phases and summary failure recovery verified at both widths. Fixtures do not assert real-world event changes.

Limits: responsive desktop headless Chrome, not physical iOS/Android hardware. External ASJJF registration URLs were verified against event data; no registrations submitted. Production API currently omits list result counts, so the compatibility summary fallback was exercised. The new grouped-count API is tested locally; it has not been deployed by this PR.

No C1 behavior descoped. C3 translation auditing, C4 visual changes, result imports and production data repair remain separate planned work. Impeccable's three existing gold-gradient hero warnings are retained intentionally under this task's brand constraint.

## Screenshots

Before screenshots show deployed production. All after/fixture screenshots show the local C1 UI against the sources described above.

- [before-hong-kong-390.png](screenshots/before-hong-kong-390.png)
- [before-mo-2026-390.png](screenshots/before-mo-2026-390.png)
- [calendar-1440.png](screenshots/calendar-1440.png)
- [calendar-390.png](screenshots/calendar-390.png)
- [copa-2026-1440.png](screenshots/copa-2026-1440.png)
- [copa-2026-390.png](screenshots/copa-2026-390.png)
- [copa-2026-results-1440.png](screenshots/copa-2026-results-1440.png)
- [copa-2026-results-390.png](screenshots/copa-2026-results-390.png)
- [copa-2027-1440.png](screenshots/copa-2027-1440.png)
- [copa-2027-390.png](screenshots/copa-2027-390.png)
- [fixture-calendar-empty-1440.png](screenshots/fixture-calendar-empty-1440.png)
- [fixture-calendar-empty-390.png](screenshots/fixture-calendar-empty-390.png)
- [fixture-cancelled-1440.png](screenshots/fixture-cancelled-1440.png)
- [fixture-cancelled-390.png](screenshots/fixture-cancelled-390.png)
- [fixture-empty-1440.png](screenshots/fixture-empty-1440.png)
- [fixture-empty-390.png](screenshots/fixture-empty-390.png)
- [fixture-live-1440.png](screenshots/fixture-live-1440.png)
- [fixture-live-390.png](screenshots/fixture-live-390.png)
- [fixture-off-season-1440.png](screenshots/fixture-off-season-1440.png)
- [fixture-off-season-390.png](screenshots/fixture-off-season-390.png)
- [fixture-results-link-1440.png](screenshots/fixture-results-link-1440.png)
- [fixture-results-link-390.png](screenshots/fixture-results-link-390.png)
- [fixture-summary-error-1440.png](screenshots/fixture-summary-error-1440.png)
- [fixture-summary-error-390.png](screenshots/fixture-summary-error-390.png)
- [gallery-1440.png](screenshots/gallery-1440.png)
- [gallery-390.png](screenshots/gallery-390.png)
- [gallery-ja-1440.png](screenshots/gallery-ja-1440.png)
- [gallery-ja-390.png](screenshots/gallery-ja-390.png)
- [gallery-selected-1440.png](screenshots/gallery-selected-1440.png)
- [gallery-selected-390.png](screenshots/gallery-selected-390.png)
- [home-1440.png](screenshots/home-1440.png)
- [home-390.png](screenshots/home-390.png)
- [home-ja-1440.png](screenshots/home-ja-1440.png)
- [home-ja-390.png](screenshots/home-ja-390.png)
- [home-next-1440.png](screenshots/home-next-1440.png)
- [home-next-390.png](screenshots/home-next-390.png)
- [hong-kong-2026-1440.png](screenshots/hong-kong-2026-1440.png)
- [hong-kong-2026-390.png](screenshots/hong-kong-2026-390.png)
- [hong-kong-2026-results-1440.png](screenshots/hong-kong-2026-results-1440.png)
- [hong-kong-2026-results-390.png](screenshots/hong-kong-2026-results-390.png)
- [mo-2026-1440.png](screenshots/mo-2026-1440.png)
- [mo-2026-390.png](screenshots/mo-2026-390.png)
- [mo-2026-ja-1440.png](screenshots/mo-2026-ja-1440.png)
- [mo-2026-ja-390.png](screenshots/mo-2026-ja-390.png)
- [mo-2026-results-1440.png](screenshots/mo-2026-results-1440.png)
- [mo-2026-results-390.png](screenshots/mo-2026-results-390.png)
- [past-events-1440.png](screenshots/past-events-1440.png)
- [past-events-390.png](screenshots/past-events-390.png)

## Merge-owner handoff

Implementation and acceptance are complete. One PR targets `main`; this worker has no merge authority. The parent/merge owner should inspect final CI/reviewer state, then decide when to merge. No deployment or production data changes are authorized or performed by this worker. The branch and worktree remain available for review. Runtime resources will be cleaned and the isolated C1 database dropped before returning the PR.
