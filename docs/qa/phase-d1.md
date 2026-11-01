# Phase D1 implementation and QA

Initial base: `24f823e`; rebased onto `0a8b40b` (`main`, includes official rankings), 2026-11-02. Outcome: one PR, held for the parent/merge owner; no production data changes.

The public site serves athletes and fans; invited staff maintain event facts. ASJJF is the source for dates, venue, registration, fees and stars. The operational editor must let staff copy a season, review stale content and confirm schedule/prize rows before making an event public. The dark admin style is retained, with quiet section navigation and a persistent save action. No animation is needed for data entry; feedback uses visible state and accessible messages.

Sources: `docs/2027-PLATFORM-PLAN.md`, the current Event model/admin controller/public loader, PR #79 and its rollover/readiness/audit implementations, and Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` (2026-11-02). The older PR's attachment copying and unchanged prize amounts are deliberately replaced by an allowlist and cleared prices. Seasons are identified by year, with a date-year fallback for existing events, avoiding a second season-activation system while the parallel season-aware public work is underway.

Acceptance (agent executed on isolated local databases):

| Case | Expected saved/visible outcome | Status |
| --- | --- | --- |
| D1-1 Single and whole-season copy | Drafts only; explicit copy/reset table; lineage and actor audit; atomic failure | Passed in API/component coverage |
| D1-2 Confirmation/public isolation | Drafts 404/absent; unconfirmed rows excluded even after override | Passed in API/component coverage |
| D1-3 Readiness/publish | Facts, dates, safe registration or not-open, stale text, confirmation, slug, sourced stars checked; direct API transitions guarded | Passed in API/component coverage |
| D1-4 Authorization and override | Staff normal publishing; admin reason override records failed checks; viewer/anonymous denied | Passed in API/component coverage |
| D1-5 ASJJF facts | Parsed snapshot fills facts/provenance; missing snapshot queues and explains; wrong season rejected | Passed in API/component coverage |
| D1-6 Editor at 390/1440 | Section navigation, edits preserved, dirty save state, fix links, rollover and publishing flows | Passed in component integration and synthetic browser harness; real Clerk session blocked |
| D1-7 Existing admin integration | B3 badge/results links retained; gallery/hotels remain available | B3 links seen in browser; child editor and hotel readiness refresh component tests passed |

Clerk prevents actual local admin sign-in. Component integration and browser fixtures will cover the editor without weakening runtime authentication. Resized mobile browser coverage does not prove physical-device keyboard/gesture behavior.

Environment: test DB `marianas_open_test_d1`; public API QA copy `marianas_open_qa_d1`, cloned only after verifying zero source DB connections. All resources are scoped to lifecycle session `01a19925-ec8e-7373-a2de-4b41a411bf2b` (hook ID); shared baseline processes remain borrowed.


Executed evidence:

- API: full pre-rebase suite passed 337 tests / 5,335 assertions, zero failures or errors, one existing parser-intake skip. Affected readiness/override retest passed 11 tests / 68 assertions. The PR handoff records the combined full-suite result after rebase.
- Web: npm ci, lint, typecheck, build and full suite passed before the final hotel refresh fix (190 tests / 35 files). That fix passed 15 focused editor/child-editor tests. The PR handoff records the combined web gate after rebase.
- Ruby style, Brakeman (zero warnings), bundler-audit and production npm dependency audit passed before rebase. No dependency changes. Final integrated check results are recorded in the PR handoff.
- Real public API on the isolated QA copy: draft absent from index and 404 by slug; unconfirmed schedule/prize rows absent from index/detail, including a deliberately published fixture. [Recorded response checks](d1-public-api.json). QA copy and API process were removed afterward.
- Browser: real editor components in a temporary, local-only synthetic harness; all API methods stubbed and unmocked requests rejected. At CSS viewports 390×844 and 1440×900, edited text survived section changes and resizing; dirty feedback appeared, save cleared it, checklist Fix opened Schedule, and confirming/saving a schedule row persisted in the fixture. Whole-season 2026→2027 submission produced two new draft rows with blank dates/stars and success feedback. Existing B3 results links remained visible.
- Screenshots: [editor 390](screenshots/d1-editor-390.png), [editor 1440](screenshots/d1-editor-1440.png), [publishing 390](screenshots/d1-publishing-390.png), [publishing 1440](screenshots/d1-publishing-1440.png), [rollover 390](screenshots/d1-rollover-390.png), [rollover 1440](screenshots/d1-rollover-1440.png). These show synthetic data, not a signed-in admin session.
- Independent review round 1 found verified early-registration dates incorrectly flagged, facts IDs contaminating results sources, and a pre-lock draft guard race. All were fixed with regressions. Round 2 found hotel changes left parent readiness stale; the callback/metadata refresh and integrated regression address it. A narrow final static review of `d5e0305` found no material issues in the hotel fix, dirty-field preservation or schema rebase; it also verified the prior ASJJF fixes remain intact.

Limits: Clerk blocks actual local admin login. No physical phone, production writes, deployment or merge was performed. T3 preview automation repeatedly timed out ("Preview automation snapshot timed out after 15000ms"); native Chrome supplied the browser checks. Mobile screenshots use Chrome device emulation, not physical hardware. Full authenticated browser-to-API editor coverage remains for the operator; API authorization and saved outcomes are covered independently.

Runtime cleanup: owned Vite server and native Chrome QA window stopped/closed, original zoom restored; shared/baseline resources untouched. The QA database was dropped. The final handoff records disposal of the isolated test database after the combined suite. Branch/worktree remain available for the merge owner.

Advisory Impeccable 4.6.0 detection returned an empty findings array for changed UI paths.
