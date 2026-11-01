# Phase D1 implementation and QA

Base: `24f823e` (`main`), 2026-11-02. Outcome: one PR, held for the parent/merge owner; no production data changes.

The public site serves athletes and fans; invited staff maintain event facts. ASJJF is the source for dates, venue, registration, fees and stars. The operational editor must let staff copy a season, review stale content and confirm schedule/prize rows before making an event public. The dark admin style is retained, with quiet section navigation and a persistent save action. No animation is needed for data entry; feedback uses visible state and accessible messages.

Sources: `docs/2027-PLATFORM-PLAN.md`, the current Event model/admin controller/public loader, PR #79 and its rollover/readiness/audit implementations, and Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (2026-11-02). The older PR's attachment copying and unchanged prize amounts are deliberately replaced by an allowlist and cleared prices. Seasons are identified by year, with a date-year fallback for existing events, avoiding a second season-activation system while the parallel season-aware public work is underway.

Acceptance (agent executed on isolated local databases):

| Case | Expected saved/visible outcome | Status |
| --- | --- | --- |
| D1-1 Single and whole-season copy | Drafts only; explicit copy/reset table; lineage and actor audit; atomic failure | Pending |
| D1-2 Confirmation/public isolation | Drafts 404/absent; unconfirmed rows excluded even after override | Pending |
| D1-3 Readiness/publish | Facts, dates, safe registration or not-open, stale text, confirmation, slug, sourced stars checked; direct API transitions guarded | Pending |
| D1-4 Authorization and override | Staff normal publishing; admin reason override records failed checks; viewer/anonymous denied | Pending |
| D1-5 ASJJF facts | Parsed snapshot fills facts/provenance; missing snapshot queues and explains; wrong season rejected | Pending |
| D1-6 Editor at 390/1440 | Section navigation, edits preserved, dirty save state, fix links, rollover and publishing flows | Pending |
| D1-7 Existing admin integration | B3 badge/results links retained; gallery/hotels remain available | Pending |

Clerk prevents actual local admin sign-in. Component integration and browser fixtures will cover the editor without weakening runtime authentication. Resized mobile browser coverage does not prove physical-device keyboard/gesture behavior.

Environment: test DB `marianas_open_test_d1`; public API QA copy `marianas_open_qa_d1`, cloned only after verifying zero source DB connections. All resources are scoped to lifecycle session `01a19925-ec8e-7373-a2de-4b41a411bf2b` (hook ID); shared baseline processes remain borrowed.
