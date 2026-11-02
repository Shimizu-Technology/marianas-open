# Visual refresh B evidence

Implementation starts at `75622f0` (origin/main, November 2, 2026). Isolated branch `agent/visual-refresh-b`; API read-only. The lead owns review, integration, merge and Leon's sign-off.

Sources: Phase C of `docs/2027-PLATFORM-PLAN.md`, `docs/qa/c1/README.md`, current result/profile/ranking/gallery code, production public GET results for Marianas Open and Hong Kong 2026, and Brain-Dump `work/shimizu-tech/marianas-open/2026-02-25-uncle-steve-meeting.md`. Historical point rules are superseded by #121's official ASJJF standings. Canonical API display names and #116 identity links must remain intact.

Fans and athletes need to find a division or person quickly on phones, read the full division and placement, then reach a profile or photo. Keep dark surfaces, gold accents, real records, seven locales and source attribution. Use A's foundation when available. Filter opening is a short upward transition with a still reduced-motion fallback; grouping and search update immediately. Photo controls retain focus and place.

Required agent-executed acceptance: complete web gate; parser, filter-sheet and sharing unit coverage; 390×844 and 1440×900 browser journeys in en, ja, zh-Hant for MO/HK Gi and No-Gi, rankings, athlete, academy, Teams and MO gallery/lightbox. Verify filters, search recovery, links, deep links, share/copy, focus recovery and no horizontal overflow. Responsive desktop Chrome does not establish physical-phone behavior. Run Impeccable and Taste checks on changed UI; record exceptions. No production writes.

Execution ledger and final source/evidence follow after implementation.

## Implementation and sources

Rebased on A's `467d918` (`Design foundation: shared dark and gold UI and registration control`). B's main implementation is `4af9d6c`; the album-selection regression fix and ranking-table measurement correction are `98eff20`. `8d713ac` puts responsive hiding on the filter-trigger wrapper so A’s unlayered button display rule cannot expose the phone sheet on desktop. B did not edit A's files. API, imports, admin writes and production configuration are unchanged.

The production fixture preflight returned 305 MO divisions / 769 placements (516 Gi, 253 No-Gi), and 149 Hong Kong divisions / 334 placements (230 Gi, 104 No-Gi). Labels recognize both `[NOGI]` and `[NO-GI]`. Unknown grammars retain the complete raw string. Every readable division retains its raw name in `title`. Canonical API names are kept in event results, directories, profiles and official rankings. No client-side name reordering was added.

Results now show discipline controls, belt and age groups with division counts, retained search, a phone filter sheet and inline desktop filters. The sheet traps focus, makes the background inert, closes with Escape/backdrop/button and restores the opener. Placements link to a matched competitor or the existing result-ID profile route. Medal colors and country flags remain semantic. Summary counts are labelled placements rather than unique competitors; the API supplies placement counts. Top academies and belt totals remain in a collapsible summary.

Profiles use wrapping medal-history cards, and directory/roster names wrap. Official ranking URL filters, source attribution and canonical display names remain intact. Gallery album/category data are unchanged. File-like captions are suppressed; original-photo downloads, Web Share/copy feedback and a manual selectable-link fallback are available. The active photo updates the URL, and deep links resolve beyond the first API page. Old thumbnails cannot be opened while an album is loading.

## Browser matrix

Agent-executed responsive Chrome 156 on macOS, reduced motion, local Vite on port 5362. All cells below mean both 390×844 and 1440×900 passed. This is responsive web QA, not physical iOS/Android or native Web Share-sheet testing.

| Journey | en | ja | zh-Hant |
| --- | --- | --- | --- |
| MO 2026: Gi/No-Gi, readable names, group navigation, filter sheet/inline filters, focus, search empty/recovery, expand/collapse | Passed | Passed | Passed |
| Hong Kong 2026: same result journey; source placements 230 Gi / 104 No-Gi | Passed | Passed | Passed |
| Rankings: standings, discipline selection and retained URL context | Passed | Passed | Passed |
| Gabrieli Pessanha `/competitors/2278`: canonical name, academy link, official no-standing state and readable medal history | Passed | Passed | Passed |
| Infight Japan `/teams/infight-japan`: roster, names, flags and medal totals | Passed | Passed | Passed |
| Teams: directory, search for Infight, then saved academy destination | Passed | Passed | Passed |
| Competitors: compact phone cards and search for Gabrieli Pessanha | Passed | Passed | Passed |
| MO gallery: day/category selection, lightbox, share/copy, actual downloaded bytes, keyboard next/Escape, opener recovery and deep-link reload beyond page one | Passed | Passed | Passed |

Final matrix: **48 passed, 0 failed, 0 blocked, 0 not run** for these required responsive cases; no horizontal overflow, page errors or attempted API writes. Physical phones and an OS-native Web Share sheet are explicitly not run. Clipboard fallback is browser-executed with an isolated clipboard stub, including the exact selected-photo URL; helper tests also cover native success, cancellation, failures and denied clipboard access.

`browser-results.json` records source commits by scenario and retained previous attempts. Unchanged result/directory/academy cases ran at `4af9d6c`; affected rankings, profile screenshot checkpoints and galleries were rerun at `98eff20`; all twelve result cases were then rerun at `8d713ac`, explicitly asserting a visible phone trigger and no visible desktop trigger. Gallery screenshots were refreshed after awaiting visible image completion. Later commits contain evidence only.

Production access follows C1: real public GET bodies, local CORS response headers only, and API write blocking. A local S3 GET response-header allowance lets the download test read the real original image bytes; production S3 CORS already allows `https://marianasopen.com` (verified with a read-only HEAD). Downloads were checked for a nonempty saved file and deleted. No ASJJF submissions, admin actions or production writes were performed.

T3 preview was tried first. Snapshot capture twice returned `Preview automation snapshot timed out after 15000ms.` The task-owned preview tab was closed/released, then QA used the repository's Playwright Core/C1 harness.

## Failures and retests

The first full suite caught cross-realm `AbortError` handling in the new share helper; this was fixed and focused tests passed. A later suite hit the unchanged Sponsors Admin timing test: its input was reset from `Updated sponsor` to `Hotel Tano` while the initial record loaded. Its isolated 14-test rerun passed without changing admin code; the final complete gate is recorded below.

Initial browser failures included a desktop locator resolving the hidden mobile ranking list and an incorrect profile-history screenshot ancestor. Both harness locators were corrected and all affected cases rerun. The gallery run exposed an actual category-loading race: an old thumbnail could open before the new image array arrived, causing a stale share URL. `98eff20` disables those thumbnails while loading; a deferred-request regression test and six browser gallery cases passed after the fix. Historical failed attempts remain in `browser-results.json` and `initial-browser-log.txt`; `failure-*.png` are failure evidence, not final screenshots.

## Design checks and critique

Impeccable 4.6.0, telemetry disabled, changed UI paths: **0 findings** (`impeccable.json`). No hooks/packages were added to the repository. Taste source lint: **0 FAIL, 5 WARN** (`taste-lint.txt`). Its outlined-control warnings concern existing loading/form controls; A's quiet borders and real data-table rules are intentional. Purple belt colors are documented semantic exceptions, not decorative accents.

Taste inspector ran at 390, 768 and 1440 on all seven page types. Final reports have **0 FAIL**. Allowed brand rules: quiet surface/control borders (`hairline`, `outlined-box`) and actual purple belts (`palette-purple`). On the event page, existing A-owned header micro-labels, the neutral photographic scrim, existing gradient title and an unshortened published event name are explicit scoped exceptions. Initial event measurements raced asynchronous loading; the final inspector copy added a results-ready wait before capture, and gallery capture waits for its first actual photo. No application code or original skill files were changed to enable those waits. Inspector Chrome used an isolated temporary profile and a local-only CORS relaxation; it performed read/scroll inspection. Raw pre-fix/pre-exception reports remain beside final reports.

ROUND 1
Seen in one second: an event results browser with clear Gi/No-Gi selection.
Idea (one sentence): preserve the tournament's dark/gold identity while making the actual division and athlete the focal point.
Live thing: switch discipline, choose filters, expand an age group, then open an athlete or share a selected photo.
Layout words by section: summary=compact totals / results=progressive groups / profiles=record cards / rankings=controls and standings / gallery=albums and photos.
Scores: design 7.8 · usability 8.2 · creativity 6.8 · content 9.0 → overall 8.0 (agent judgment, not measured research).
Caps applied: no marketing originality claim; official source wording and canonical athlete names are preserved.
Top three problems (most visible first), each with the screenshot it shows in and the fix:
1. `before-mo-results-390.png`: all-caps divisions lose their weight label to ellipses. The after `mo-gi-en-390.png` wraps the complete parsed label and keeps the source in its title.
2. `before-mo-placements-390.png`: hundreds of equally weighted rows make finding an age division slow. The after `mo-nogi-en-390.png` exposes belt and age counts before division cards.
3. Initial gallery capture showed placeholders because it preceded image loading. Final `gallery-*-*.png` and `gallery-lightbox-*-*.png` wait for real photo completion; no placeholder screenshot is counted as loaded-photo evidence.

## Requests for A and integration limits

A's `.ui-button`, `.ui-card` and `.ui-chip` rules are outside a Tailwind layer and override many utility `className` adjustments. Please place the primitives in `@layer components` or explicitly document that visual overrides require a variant. B uses actual button variants for ranking selection, places breakpoint visibility on a plain wrapper, and retains native semantic belt/medal badges where the default gold Chip would override the correct color. No primitive change is required to run B.

The lead should combine A's later page work with this branch, then check the integrated event/results anchors, header and footer. A's later commits are intentionally not rebased wholesale into B. Review, CI inspection, merge, deployment and Leon's visual sign-off remain with the lead. This worker did not merge or deploy.

## Screenshot inventory

Before evidence supplied by the lead: `before-mo-results-390.png`, `before-mo-placements-390.png`, `before-rankings-390.png`.

After evidence: `mo-{gi,nogi,results}-<locale>-<width>.png`, `hk-{gi,nogi,results}-<locale>-<width>.png`, `*-filters-<locale>-390.png`, `rankings-*`, `athlete-*`, `athlete-history-*`, `academy-*`, `teams-*`, `competitors-*`, `gallery-*`, `gallery-lightbox-*`. `<locale>` is en/ja/zh-Hant and `<width>` is 390/1440. Taste's fold/page sheets and machine-readable reports are under `taste/<page>/`.

## Final gate and cleanup

Final implementation `8d713acc53c41ed031d6b54e79621a5ac3161f76`: npm ci (same unchanged lockfile), lint, tsc -b, **398 tests / 75 files**, and build:no-translate passed. The 27 focused regressions across five files also passed. Production dependency auditing passed the high-severity threshold; one low and one moderate existing advisory remain. The frontend-only slice does not run or change the API/fetcher suites. The build-generated sitemap date change was restored rather than included in B. `verification.json` records the gate.

All task-owned preview tabs, Chromium processes and Vite on port 5362 were closed/stopped. Lifecycle cleanup executed and status reported **no active owned resources**. No runtime handoff or unresolved ownership. Shared/borrowed services and baseline simulators remain untouched. The branch and worktree are retained for Claude's review/integration.
