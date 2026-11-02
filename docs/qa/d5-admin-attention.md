# D5 admin workspace acceptance

Starting point: `d7103b6` on `origin/main`, November 2, 2026. Branch: `agent/needs-attention`. One held PR against main; the parent task owns merge. No production writes.

Sources: `docs/2027-PLATFORM-PLAN.md`, `docs/AUTH-SYSTEM.md`, `docs/ASJJF-PIPELINE.md`, `docs/photo-intake.md`, current admin components and schema. Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` supplies team context; its earlier rollout notes are historical, while the repository has D1/D2/D4 merged.

Steve, Carm and staff need to discover work from phones without checking every admin page. ASJJF remains the source for event/results facts. Holds preserve published results; only administrators approve protected proposals. Viewers should browse shared admin content without mutation access. Existing users keep their roles; users/settings remain administrator-only.

Design: existing navy/gold admin styling, compact plain-language grouped rows on desktop and stacked cards with 44px actions on phones. Routine status checks have no entrance animation. Errors retain the last successful check and support retry. A read-only banner explains viewer permissions; write controls are disabled while links, filters and pagination remain available.

Required agent-executed scenarios:

1. Attention aggregation includes each implemented source with counts, severity and working destination. Resolved/superseded and recent/healthy fixtures stay absent. Dashboard reads do not write settings or event state. Query count does not grow per event.
2. Admin/staff/viewer can read attention; anonymous requests are 401. Every routed admin write rejects viewer before controller work (403), including uploads, imports, reordering, invites and approval actions. Existing admin-only restrictions remain.
3. Dashboard loading, empty/time, grouped items, error/retry, and optional analytics link render correctly. Help has task guides and accurate destinations.
4. Synthetic browser at 390px/1440px: open an attention destination, help topic/navigation, retry an error, check long titles for overflow, inspect viewer write controls and usable read controls. Clerk/provider delivery and physical phone input are outside synthetic coverage.
5. Complete API/web engineering gates on owned `marianas_open_test_d5`; CI and actual CodeRabbit status recorded on PR.

Execution results will be recorded below before handoff.

Implementation notes:

- All 13 requested source types are implemented from the starting schema. Results holds use the current undiscarded proposal, failed-fetch counts use unresolved URLs after successful retries, photo issues group by event, and D1 uses the same publish checks with batched associations/snapshot summaries. No new ASJJF calendar tables existed at the base commit, so calendar drafts/changes are left to that worker. Extend `AdminAttention::SOURCES` with a new source method returning the same item shape; no controller or dashboard changes are needed for a source in an existing area.
- Failed/incomplete results use the last-check timestamp (strictly over 24 hours). Photo imports are stalled after 24 hours without an update. Heartbeat uses `received_at`, not rate-accounting updates, with a strict 36-hour threshold. Sponsor windows include today and day 14.
- No schema migration, production data changes, or new locale keys. Admin help follows the current English admin UI. Optional web build setting: `VITE_POSTHOG_DASHBOARD_URL`.
- Independent review round 1 found a batch GET write, recovered fetch alerts and immediate viewer upload/settings controls. All three were fixed with regression tests. Round 2 verifies the fixes.
- T3 preview snapshot timed out twice, then its transport briefly failed. CUA also could not complete tab creation. Responsive interaction evidence uses the repository's existing isolated Playwright harness pattern, with an owned browser process and the development-only `web/vite.attention-qa.config.ts` entry. It renders the actual dashboard/help/layout and event editor against synthetic data. The results-page destination is a synthetic route; actual route permissions and saved outcomes are covered by API tests.

Responsive acceptance: PASS at 390×844 and 1440×1000 using reduced-motion emulation and synthetic staff/viewer identities. Verified grouped/long-title layout, attention deep link, help topic link and return navigation (mobile drawer included), empty state/time, failed request without false all-clear, successful retry, and disabled viewer save/publish/file controls in the real event editor. No horizontal overflow or page errors. Screenshots and machine-readable results: `docs/qa/d5-attention/`. The early browser script runs stopped on overly broad/exact test locators; the final run passes after selecting the mobile editor's native section dropdown. These were harness locator fixes.

Automated checks in progress: final full API/web suites after reviewer fixes. Earlier focused attention/authorization run: 34 tests, 406 assertions, no failures. First full web run: 56 files, 317 tests passed; final includes additional regression/auth tests. Brakeman: zero warnings/errors; bundler-audit: no vulnerabilities; npm production audit meets the high-severity gate (one low, one moderate advisory remain in unchanged dependencies). Impeccable advisory scan of dashboard/help/write controls: no findings. No real Clerk invitation send, external fetch, production upload, or deployment was performed.
