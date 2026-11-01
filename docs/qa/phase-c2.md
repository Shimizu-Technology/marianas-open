# Phase C2: accessibility, performance, and interaction quality

Implementation owner: C2 worker. Merge owner: parent worker. Target: `main`.
Baseline: `e02e4be`. Production data: GET-only API at `https://marianas-open-api.onrender.com`.

## Product and scope

Marianas Open is a public, multilingual BJJ event site serving athletes, teams, spectators, and event staff across Asia-Pacific. Public journeys include finding tournaments, results, athlete profiles, academies, and registration links; administration is restricted to staff. Preserve the near-black/gold brand and Outfit/DM Sans typography. Navigation must be immediate, controls named and reachable, text readable, and search usable by keyboard and touch.

Sources: repository `README.md`, `web/src/App.tsx`, public API models, recent main commits #111–117, and Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (August 2026), `ROADMAP.md`, and the user's November 2 C2 audit. The older Brain Dump launch snapshot is historical; the live API and current source establish present behavior. Website public build source cannot be matched to a production deployment SHA from the available public page; baseline measurements use the exact local main commit instead.

C1 owns HomePage, EventDetailPage, CalendarPage, PastEventsPage, EventGalleryPage, JourneySection, and utils/events. This PR does not edit those files. API behavior and production data are unchanged.

## Agent-executed acceptance

| Case | Required coverage | Expected outcome | Status |
| --- | --- | --- | --- |
| C2-01 Public routes | Home, calendar, Copa 2026, rankings, competitors, teams at 390×844 and 1440×900 | Live data loads, no serious/critical axe issues, no horizontal overflow | Passed |
| C2-02 Search | Both widths, keyboard and pointer, real public results | Full-viewport dimming, named dialog/input/close, focus remains in modal, Escape restores opener and scroll, result opens its public destination | Passed |
| C2-03 Mobile nav/language | 390px, English/Japanese | 44px language target, translated navigation, no FAB or public mobile Admin link, locale persists | Passed |
| C2-04 Loading/navigation | Four measured routes, cold load plus client navigation | Immediate route changes, scroll resets without smooth-scroll race, full-height fallback, reserved Impact slot | Passed |
| C2-05 Public/admin boundary | Unit tests and production build graph; public network inspection | Public routes never import Clerk; direct and client-side admin entry load lazy boundary, fail closed without configured auth | Passed |
| C2-06 Analytics | Unit tests | SDK loads after paint/idle, pageview once with current route, admin identity remains functional | Passed |
| C2-07 Motion/input | Emulated touch/reduced motion and source checks | Mobile inputs ≥16px, focus/press feedback, no route animation, local images select responsive source | Passed |

No sign-in to production admin and no production mutations. No API test DB is needed. Physical iOS/Android keyboard, browser chrome, and touch hardware are not available; emulation and CSS checks do not establish those hardware behaviors.

## Measurement method

Scratch dependencies are installed under `/tmp/marianas-c2-qa`, outside the app. Headless Chrome uses fresh contexts and blocked service workers for each route. Mobile: 390×844, 150ms network latency, 200,000 bytes/s download (1.6 Mbps), 93,750 bytes/s upload, 4× CPU slowdown. Desktop: 1440×900, no throttling. Observe Performance APIs from document start; report maximum CLS session window (1s gap, 5s duration) and final observed LCP. Screenshots and axe run after load plus a 16s mobile / 6s desktop settling window. These are single-run lab observations, not field percentiles or a guarantee about production devices.

The API does not allow the preview's port 5361 CORS origin. An isolated temporary Chrome context bypasses origin enforcement for this QA only, with production API requests restricted to GET/HEAD/OPTIONS. No production/server CORS configuration changes. The initial CORS-blocked run is retained as diagnostic evidence and excluded from before/after results.

Initial JS gzip means the sum of gzip-compressed local JS resources actually requested by a fresh `/` load, including the lazy Home chunk. Build graph analysis separately verifies auth/admin are absent from the initial static graph. No Clerk/PostHog keys are configured in the local preview; configured behavior is covered by focused tests.

## Follow-ups owned elsewhere

- HomePage headline remains hidden until its 0.8s entrance finishes; HomePage scroll indicator and JourneySection infinite movement need reduced-motion handling (C1 exclusion).
- C1's 10–11px information labels and hero viewport units remain for that owner.
- Event and site hero uploads expose original `image_url`/`hero_image_url` via the API concern, with no public resize/variant URL. Gallery thumbnails have variants, but those do not resize event/site heroes. Add an API contract for responsive hero variants in a separately scoped change.
- Physical-device verification remains outstanding.

## Review and engineering gate

Independent review round 1 found three material regressions: overlapping mobile/search scroll locks, retained profile state after removing pathname remounts, and retained PostHog staff identity after an anonymous admin remount. Each was corrected with regression tests. Round 2 reviewed the fixes and reported no remaining material findings. Real provider sign-out and cross-tab session behavior are not exercised against production; tests verify state reconciliation and redirect configuration.

`npm ci`, `npm run lint`, `npx tsc -b`, `npm test` (53 tests, 17 files), and `VITE_API_URL=https://marianas-open-api.onrender.com npm run build:no-translate` passed for implementation commit `33c021207ba635501668f9e5cbe4202f25b9cff2`. Production dependency audit passes its high-severity gate, with one pre-existing moderate and one low advisory. Impeccable 4.6.0 returned `[]`; no package or hooks were added to the app. The build's initial static JS graph is 234,803 bytes gzip and contains React in the React chunk, with no auth/admin/analytics chunk. Initial page JS including lazy Home is measured separately below.

Muted `#9098a5` contrast: 6.80:1 on page `#0a0a0b`, 6.39:1 on surface `#111318`, 5.86:1 on surface-light `#191c24`, 6.18:1 on navy-800, 5.09:1 on navy-500, and 4.82:1 on a white/10 raised surface. See `c2/contrast.json`. Existing bronze sidebar values and visible athlete fallback initials also required brighter colors. Loading reserves now cover route chunks and rankings/directory data so the mobile sidebar and footer stay below the first viewport.

## Results

The final production build from implementation commit `33c0212` passes all 12 route/viewport checks: zero serious/critical axe nodes (431 before), no runtime exceptions, no horizontal overflow, and CLS below 0.1 on every named route. Initial `/` JS is **383,528 → 248,458 bytes gzip (−35.2%)**, including lazy Home; static startup graph is 234,803 bytes. Fonts now come from the same origin and no Google font request is needed. No Clerk or analytics SDK is in the static startup graph.

Event desktop LCP increased 2.02s → 2.14s in this single run, while the throttled event page improved 9.61s → 8.72s. The event remains slow due to its original media and C1-owned presentation; this is not a claim that LCP is solved. Home headline/scroll motion and uploaded hero variants remain the follow-ups above.

Raw summarized evidence: [before](c2/before.json), [after](c2/after.json), [chunk graph](c2/chunk-graph.json), [contrast calculations](c2/contrast.json), [Impeccable](c2/impeccable.json). Full raw observer/axe output and route screenshots remain in `/tmp/marianas-c2-qa/before-live` and `/tmp/marianas-c2-qa/final` on the implementation machine.

Screenshots: [search before](c2/search-before.png), [search after](c2/search-after.png), [mobile navigation before](c2/nav-before.png), [mobile navigation after](c2/nav-after.png).

Final interaction QA passed at 390px and 1440px: search portals outside the header with full-viewport dimming; search input receives focus; Shift+Tab/Tab wrap; Escape restores opener and scroll; real Copa results navigate with scroll reset; public routes request no Clerk assets; local production `/admin` fails closed without a configured key. At 390px the language target is ≥44×44px, the public mobile nav has translated Japanese labels and no Admin/FAB, Japanese persists across navigation, headings use auto-phrase/keep-all without horizontal overflow, mobile inputs are ≥16px, primary press feedback responds, and reduced-motion disables smooth scrolling. Mobile menu → Ctrl+K → Escape restores body styles. Known local image sources expose srcset/sizes; uploaded originals remain untouched. See [interaction results](c2/interactions.json), [Japanese nav](c2/nav-ja.png), and [Japanese home](c2/home-ja.png).

| Width | Route | CLS before → after | LCP before → after | Serious/critical axe nodes before → after |
| --- | --- | --- | --- | --- |
| 390 | / | 0.451 → 0.050 | 4.65s → 4.41s | 9 → 0 |
| 390 | /calendar | 0.160 → 0.000 | 4.72s → 3.81s | 11 → 0 |
| 390 | /events/copa-de-marianas-2026 | 0.160 → 0.000 | 9.61s → 8.72s | 15 → 0 |
| 390 | /rankings | 0.588 → 0.021 | 3.45s → 2.62s | 112 → 0 |
| 390 | /competitors | 0.428 → 0.008 | 3.40s → 2.24s | 13 → 0 |
| 390 | /teams | 0.279 → 0.008 | 2.94s → 2.34s | 15 → 0 |
| 1440 | / | 0.391 → 0.058 | 2.17s → 1.64s | 8 → 0 |
| 1440 | /calendar | 0.083 → 0.000 | 0.86s → 0.61s | 12 → 0 |
| 1440 | /events/copa-de-marianas-2026 | 0.084 → 0.000 | 2.02s → 2.14s | 13 → 0 |
| 1440 | /rankings | 0.083 → 0.000 | 0.88s → 0.43s | 165 → 0 |
| 1440 | /competitors | 0.287 → 0.000 | 0.76s → 0.47s | 26 → 0 |
| 1440 | /teams | 0.277 → 0.000 | 0.87s → 0.48s | 32 → 0 |


## Resource and integration disposition

Owned preview server and temporary browser processes are cleaned at handoff; no resource is intentionally transferred. The worktree and `agent/a11y-performance` branch remain for parent-owned merge/integration. PR #118 must not be merged by this implementation worker. Re-check current CI and CodeRabbit on the final documentation head before integration; code validation refers to implementation `33c0212`, and later commits only add evidence.
