# Visual refresh A acceptance and lead handoff

Implementation worktree: `/Users/leonshimizu/Desktop/ShimizuTechnology/.worktrees/mo-visual-a`, branch `agent/visual-refresh-a`, target `main`. Base `75622f0036575e6116bb301b663192b0f6217287`; early shared foundation `467d918`. Claude owns integration, CodeRabbit review, merge and Leon's sign-off. **Do not merge this slice independently.** No production writes or delegated work.

## Source and execution

Agent-executed affected-flow QA uses local Vite at `127.0.0.1:5361`, current public production GET responses, desktop Chrome 156 and the repository-pinned Playwright Core 1.56.1. The scripts add local CORS response headers only to public GET responses, following C1; all other API methods abort. External ASJJF choices are clicked and their actual new-tab destination URLs checked, then the tabs close. No registration is submitted. Screenshot dimensions describe responsive browser coverage, not physical iOS/Android or installed-PWA testing.

Reproduce with `npm ci` in `web/` and `fetcher/`, then start `VITE_API_URL=https://marianas-open-api.onrender.com npm run dev -- --host 127.0.0.1 --port 5361 --strictPort` in `web/`. Supply your lifecycle session as `DEV_LIFECYCLE_SESSION` to `node docs/design/2027-visual-refresh/browser-qa.mjs` from the root. `opening-locales-qa.mjs` checks the future-opening fixture in all seven locales; set `TASTE_SKILL_ROOT` to the installed Taste skill to collect its before/after browser measurements. These scripts claim their exact process tree and close their own contexts/browser in `finally`.

## Required route matrix

Each cell includes loaded-page inspection, translated UI, no horizontal overflow and screenshot evidence. Registration cells additionally exercise Enter, tab containment, Escape/focus recovery and actual Gi/No-Gi popup URLs. Calendar exercises both tabs and details navigation. Completed MO verifies results/gallery and absence of registration, tickets, travel sales and sticky registration. Archive verifies completed-only cards and honest result availability. 404 verifies recovery navigation is present.

| Route | en 390 | en 1440 | ja 390 | ja 1440 | zh-Hant 390 | zh-Hant 1440 |
| --- | --- | --- | --- | --- | --- | --- |
| Home | Passed | Passed | Passed | Passed | Passed | Passed after settled-source retest |
| Copa 2027 | Passed | Passed | Passed | Passed | Passed | Passed |
| MO 2026 completed | Passed | Passed | Passed | Passed | Passed | Passed |
| Calendar | Passed | Passed | Passed | Passed | Passed | Passed |
| Past events | Passed | Passed | Passed | Passed | Passed | Passed |
| 404 | Passed | Passed | Passed | Passed | Passed | Passed |

| Additional required case | Coverage | Status |
| --- | --- | --- |
| Off-season fixture, recap/result destination | en, both widths | Passed |
| Live event fixture | en, both widths | Passed |
| Future registration opening, no active registration/sticky action | en, both widths | Passed |
| `registration_not_open`, event-info state | en, both widths | Passed |
| Opening notice and ASJJF event info on home/calendar/event | All 7 locales, 390px, 21 combinations | Passed |
| Header language/mobile menus, Escape/focus | en/ja/zh-Hant, applicable widths | Passed |
| Desktop header Escape from child link | en/ja/zh-Hant, 1440px | Passed |
| Reduced motion and normal motion registration | Chrome emulation | Passed |
| Physical-device gestures/native keyboards/PWA | No physical-device execution | Not run; outside this responsive-web matrix |

The matrix was repeated while source moved from `f44bd68` to `f62e47c`; its assertion history is retained in [qa-results.json](qa-results.json). One home assertion coincided with a Vite reload after the editable-copy correction. The [settled-source retest](qa-retest-results.json) at `f62e47c` passed, including the compact journey, ASJJF choices, desktop menu recovery and normal/reduced-motion dialog behavior. A separate [provider-challenge retest record](qa-retest-cloudflare.json) retains an overly strict URL assertion: ASJJF appended a Cloudflare challenge query parameter after reaching the correct event page. The harness now checks the exact published anchor and canonical popup destination, ignoring only provider challenge parameters. The latest failed capture is `after/failure-cloudflare-destination-zh-Hant-1440.png`; assertions remain in the JSON records. No browser application errors or attempted API writes occurred in the accepted runs.

The first opening-locales harness run hit an in-flight route cancellation during navigation. It now waits for network idle and tolerates only already-handled/closed route cancellation; all seven locales were rerun from the beginning. [Opening locale results and Taste measurements](opening-locales-results.json) record 21/21 passed checks at `f62e47c`.


## Registration-date addition

`registration_opens_on` is typed in the web event JSON interface only; no Rails/API code changed. Future dates compare against Guam's calendar day, using the same boundary as the season helpers. The UI shows a localized non-clickable opening notice and a secondary ASJJF event-info link when one exists. Null/past dates retain registration unless `registration_not_open` or a closed event prevents it. A notice still renders when ASJJF links are absent. Home, cards, event hero and sticky bar share this policy; informational registration steps have no repeated registration buttons. Unit coverage includes future, today, past, null, explicit not-open and completed events.

## Automated checks and design audit

The initial gate passed npm ci, lint, tsc, 71 Vitest files/373 tests and build:no-translate. A later full run caught three English casing defaults that disagreed with #130's editable-copy seeds. Those defaults were restored; organizer-authored casing remains authoritative and CSS no longer forces uppercase. The settled source `f62e47c` passed full lint, `tsc -b` and **72 Vitest files / 377 tests**. The final `e31cdcc` change restores only the original Calendar/Past Events SEO descriptions and CollectionPage structured data; its affected files passed ESLint and the three Calendar/archive tests. The production-API `build:no-translate` (including a fresh `tsc -b`) passed at `e31cdcc`. [Validation results and command logs](validation/results.json) record the exact scope. No visible UI changed after the settled-source browser checks. The earlier parity failure is superseded, not reported as passing.

Impeccable 4.6.0, telemetry disabled, scanned the changed UI paths and returned `[]` (zero findings). No tool or hook was installed in the repository. [Raw result](impeccable.json).

[Taste scoped static report](taste-lint.json): 36 strict house-style flags and 23 warnings. These are advisory exceptions to its generic landing-page rules: this task explicitly retains the client's Outfit/dark/gold identity and the existing CMS content. Neutral photo scrims, loading shimmer, quiet card/section borders, fixed navigation/modal separation, literal booking codes, real registration-step numbering and existing ticket/travel artwork remain. Headings use source casing; no forced uppercase, clipped hero text, blue registration controls or long hero animation remains. The separate Taste browser probes record before/after measurements; they are run inside the fixture-aware QA browser so they see real event data despite production CORS. These reports are not presented as a clean Taste gate.

## Screenshots

[Before](before/) contains the lead's production captures. [After](after/) contains the local UI and named isolated fixtures, not production changes. Filename pattern: `<route>-<locale>-<width>.png`; journey and sticky captures show the same pages farther down. Representative comparisons:

- Home: [before phone](before/s-home-390-0.png), [after phone](after/home-en-390.png), [after desktop](after/home-en-1440.png), [compact journey](after/journey-en-390.png).
- Copa: [before phone](before/s-copa27-390-0.png), [after phone](after/copa-2027-en-390.png), [after desktop](after/copa-2027-en-1440.png), [sticky](after/sticky-en-390.png).
- Archives: [completed MO](after/mo-2026-en-390.png), [calendar](after/calendar-ja-390.png), [past events](after/past-events-zh-Hant-390.png), [404](after/404-en-390.png).
- States: [off-season](after/fixture-off-season-390.png), [live](after/fixture-live-390.png), [future opening](after/future-opening-zh-Hant-390.png).

## Integration notes and residuals

The shared primitive prop APIs from the foundation remain stable. `PublicEventCard` adds a compact variant for the journey; calendar/archive share the photographic variant. Matching removes edition years and the later optional leading Guam prefix, retaining series/city words. It borrows only from a completed earlier edition with a published hero image. Dumau has no matching earlier image in the current public data and retains the existing generic fallback. Unpublished stars remain hidden; no rating is invented for Manila/Taiwan. Existing editable statistics remain unchanged.

API/Web/Fetcher CI, Netlify preview, CodeRabbit review, combined worker integration and Leon's sign-off belong to the lead. Branch protection read returned `Branch not protected`; CI/review acceptance still applies. No production deployment was performed. Runtime cleanup and PR are recorded below.

Taste browser measurements at 1440/768/390px show the actual next-event title replacing the generic championship headline. At 390px the main title changes from three lines to two; clipped gradient hero text is removed. The strict report still flags inherited sponsor labels, body sizes and existing photographic/section treatments. Those supporting sections retain their CMS content and brand presentation; this slice does not claim a clean whole-site Taste audit.

## Final handoff

PR: [Visual refresh A: design foundation, home and event pages #134](https://github.com/Shimizu-Technology/marianas-open/pull/134), registered with this T3 thread. Branch `agent/visual-refresh-a`; shared foundation `467d91824c8a24ef0d2c11235b8440049cfbd10c`; final implementation `e31cdcc6c105891601e463dd68e7f9a6cc7eddd2`. Later commits contain evidence only. Recheck the current PR head, combined changes, required CI and CodeRabbit coverage before integration. The worker has not merged or deployed and has not assessed final-head reviewer coverage.

Cleanup: Vite PID **20195** on port **5361** was terminated through `dev-lifecycle cleanup --session 01a19b79-74f8-7a10-9003-f95c7936b2c3 --execute`. All task-created isolated Chrome contexts/popups/browser processes closed; the T3 preview tab was closed and released. Status reports **no active owned resources**. Removed only this worktree's `web/node_modules`, `web/dist` and `fetcher/node_modules`; rerun npm ci to reproduce. The generated sitemap was restored. Shared/baseline services were left unchanged. No runtime resource is handed off; this named worktree and source branch remain for Claude's integration.

Next action for the lead: integrate worker B onto the pushed foundation/final source, rerun affected journeys after integration, inspect final CI/CodeRabbit/Netlify preview, and obtain Leon's sign-off. Dumau's generic fallback and the documented Taste brand exceptions are the only visual residuals; physical-device acceptance is not claimed.
