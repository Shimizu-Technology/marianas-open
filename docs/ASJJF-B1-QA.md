# B1 acceptance and verification

Context (2026-11-02): `main` b6eadb3, following CI/Sentry fe9adf4. Sources: `docs/2027-PLATFORM-PLAN.md`, existing Rails scraper/admin/auth/email/job code, public captured HTML, and Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (historical product context; current behavior verified in repository). The site serves tournament athletes/fans and staff managing events/results; ASJJF is the source of truth. B1 adds intake evidence only. Main targets Render Rails + worker and Netlify React. Deployment and actual B2 transport are outside this unmerged PR.

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
