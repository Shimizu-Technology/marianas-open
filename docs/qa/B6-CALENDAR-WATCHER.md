# B6 calendar watcher acceptance

Implementation base: `origin/main` at `d7103b6`, November 2, 2026. One PR against main; parent owns merge. No production data changes or fetcher changes.

Context: athletes/fans use the public tournament site; staff manage events in the admin. ASJJF is authoritative, and uncertain facts stay blank or in review. Sources: `docs/2027-PLATFORM-PLAN.md`, `docs/ASJJF-PIPELINE.md`, saved `season_calendar_381.html`, the 2027 event migration, `Event`, `EventReadiness`, and the Brain Dump Marianas project index. Recent main includes D1's publish checks/rollover and the established B1/B3 snapshot pipeline. Production versions were not inspected; production actions are excluded.

Agent-executed affected-flow scope:

1. Saved calendar → parser → four paired factual drafts; repeated application is quiet and creates nothing twice. Existing-ID and unambiguous name/date matching; conflicting matches stay held.
2. Published events stay unchanged until admin applies; stale proposals fail; dismissal survives equivalent evidence; watcher drafts refresh automatically until published.
3. Missing listings preserve saved/public events and IDs; source snapshots survive retention.
4. Staff read, admin decides, viewer/anonymous blocked; one combined email for changed runs, none for replay/no-change. Mail delivery is mocked.
5. Weekly planner targets evidenced current/next season IDs and deduplicates pending/leased requests; unknown future season IDs are never guessed.
6. At 390px and 1440px, inspect factual drafts and old→new changes, apply/dismiss, refresh queue, open draft; verify wrapping, control sizes, and keyboard/focus. Component harness mocks API decisions and draft navigation; Rails integration tests establish persisted changes separately. Real Clerk admin session, production email delivery, actual fetcher timing, and native phone input are excluded.

UI direction: existing dark admin palette and ASJJF control styles, quiet operational layout, explicit draft/review language, 44px controls, stacked phone actions. No new animation; feedback appears immediately in the settled state. Reduced motion needs no special transition.

Verification results are recorded in the PR with the tested head. The T3 preview snapshot endpoint timed out twice; local headless Chromium fallback rendered the actual React component with app CSS, not a static mockup.
