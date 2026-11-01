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

Final results and screenshot links are recorded below after execution.
