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
| C2-01 Public routes | Home, calendar, Copa 2026, rankings, competitors, teams at 390×844 and 1440×900 | Live data loads, no serious/critical axe issues, no horizontal overflow | In progress |
| C2-02 Search | Both widths, keyboard and pointer, real public results | Full-viewport dimming, named dialog/input/close, focus remains in modal, Escape restores opener and scroll, result opens its public destination | In progress |
| C2-03 Mobile nav/language | 390px, English/Japanese | 44px language target, translated navigation, no FAB or public mobile Admin link, locale persists | In progress |
| C2-04 Loading/navigation | Four measured routes, cold load plus client navigation | Immediate route changes, scroll resets without smooth-scroll race, full-height fallback, reserved Impact slot | In progress |
| C2-05 Public/admin boundary | Unit tests and production build graph; public network inspection | Public routes never import Clerk; direct and client-side admin entry load lazy boundary, fail closed without configured auth | In progress |
| C2-06 Analytics | Unit tests | SDK loads after paint/idle, pageview once with current route, admin identity remains functional | In progress |
| C2-07 Motion/input | Emulated touch/reduced motion and source checks | Mobile inputs ≥16px, focus/press feedback, no route animation, local images select responsive source | In progress |

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

## Results

Pending final measurement and gate evidence.
