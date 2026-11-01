# B4 identity acceptance

Baseline: 2026-11-02, main `3634aef`. Marianas Open serves athletes and spectators viewing event results, rankings and gym/athlete profiles; staff import ASJJF results and maintain these identities. Sources: API linkers, ranking calculator, public/admin controllers, root CI, and Brain Dump `work/shimizu-tech/marianas-open/research-2026-11-02/report.md` and its CSVs. The research is read-only; deployment state and production counts have not been independently rechecked for this implementation.

This change preserves the placement × event-stars points formula. Each result's gym determines team attribution; an athlete's gym means their latest result's gym. Academy country is gym location, never athlete nationality. Ambiguous/truncated athlete identities and close gym names require staff judgment. Branch roll-ups are stored but do not affect rankings. No repair runs on production and no existing identity rows are changed by the migration.

Agent-executed affected-flow acceptance:

1. Reimport hyphenated/HTML/Unicode name variants without creating twins; retain source names and hyphens, search in both name orders. Ambiguous and separately flagged athletes remain unmerged.
2. Attribute two events for a gym-changing athlete to their respective gyms, update current gym by event date, and show canonical gym labels/stats. Preserve formula and hidden-event exclusions.
3. Normalize known ISO/ASJJF countries; unknown codes render a text fallback without invalid flag requests.
4. Staff can preview and confirm gym merges with counts, edit name/location/country/parent/unaffiliated, and resolve a queued near-duplicate. Non-staff cannot mutate identities.
5. Staff can preview athlete history warnings, explicitly acknowledge warnings, merge duplicates and rename display names. Separately flagged people are blocked.
6. CSV repair and exact-key cleanup are dry-run by default, skip excluded verdicts/unsafe histories, report changes and points, transact applies, and are idempotent. Only task-owned test databases may be used.
7. Admin flows at 390px and 1440px: selection, warning/confirmation, saved result, error/recovery. Clerk may block authenticated runtime QA; report that dimension separately from component/API tests.

## Implementation and verification handoff

Repository: `Shimizu-Technology/marianas-open`; PR: https://github.com/Shimizu-Technology/marianas-open/pull/116; target: `main`; branch: `agent/identity-normalization`; worktree: `/Users/leonshimizu/.t3/worktrees/marianas-open/t3-4a6134f5`. This worker is not the merge owner. Preserve the branch/worktree for that owner. No production deployment or repair was performed.

Tested API source: `7a469fe92a477cbcf118f1e383a5a17c88ac1b16`; tested web source: `8fd6fff874b40ad131de1f09b0702548abfb4473` (unchanged in the later API fix). The following documentation commit changes no application code.

Automated checks passed: schema load and B4 migration against the dedicated `marianas_open_test_b4` created from template0; Rails **155 tests / 1,418 assertions**, zero failures/errors/skips; RuboCop clean; Brakeman zero warnings/errors; bundler-audit clear. Web `npm ci`, lint, `tsc -b`, **80 Vitest tests**, and `build:no-translate` passed. The production npm audit passes CI's high-severity threshold; existing low/moderate advisories remain. Impeccable returned `[]` for the changed admin/flag/profile/ranking UI. Local libvips prints an existing missing HEIF/x265 plugin warning; image processing was outside these identity scenarios.

Acceptance 1–6 passed at the API/component/service level, including persisted result ownership, dry-run immutability, rollback, alias preservation on repeated saves, exact/stable profile lookup, stale-preview rejection and projected/apply parity for resolved-review mappings. These tests are separate from authenticated browser acceptance.

Public browser checks used Chrome after two T3 preview snapshot timeouts. At measured **390px and 1440px CSS widths**, academy lists, academy profiles, competitor lists, athlete profiles and event results rendered names and alpha-2 flag URLs without horizontal page overflow. Guam/Japan/Brazil flags loaded; unknown-code and failed-image states are covered by component tests. Search for `Cruz Anthony` returned the single `Anthony Cruz` profile. Academy-specific athlete points differed from that athlete's overall profile total, as expected for historical attribution. Final ranking links were inspected and used stable competitor IDs. One attempted ranking-link click timed out in browser automation before dispatch, so click-through is not recorded as passed; direct athlete profiles and API routing were verified.

Acceptance 7 is **blocked for authenticated saved-state browser journeys**. The local development shell renders the new academy queue at both widths, but its API calls return `Missing authorization header` because a verified Clerk staff session is unavailable. Queue error and retry controls are visible and usable at 390px/1440px. Merge/rename/parent/athlete-warning/review-resolution saved outcomes are covered by API and component tests, not a real Clerk browser session. Physical-phone keyboard/touch behavior was not tested. The merge owner must retain this limitation and execute the authenticated cases listed in `web/docs/B4-implementation-handoff.md` before claiming full UI acceptance.

The first independent core review found eight material issues; the integrated review verified those fixes and found seven more around edit/navigation/confirmation boundaries. Those fixes were verified, followed by a targeted correction for resolved-review forecast parity. The final targeted review found no remaining material objection in that scope. Reviews were source inspection and isolated probes, not authenticated UI QA. CodeRabbit did not review: its OSS quota was exhausted, and its PR comment reported the next included review in 48 minutes at the time of inspection. No CodeRabbit approval is claimed.

## Isolated QA dry runs

A copy was created only after confirming zero active connections to the source development database. The task-owned `marianas_open_qa_b4` contained **313 academies, 2,004 athletes, 3,804 results and 129,369 points**. It is older than the research dataset. No repair/backfill APPLY run was performed on this copy.

- CSV repair: `apply: false`; actual before/after and projected totals identical; **0 operations, 203 skipped rows**. Newer research IDs/names did not identify admissible matching records in the older copy. The tool checks names as well as IDs to avoid repairing an unrelated dataset.
- Backfill: **3,804 results scanned**, **3,676 result gym links** and **131 current gyms** projected to change; **3,804 raw-name saves** and **3,804 country normalizations**; **128 rows across 13 labels unresolved**; zero undated results. Preview did not create academies or queue entries.
- Fixture-based APPLY tests verify real transactions, conservation of result counts/points, exclusions, projections and repeat-run idempotency.

## Deployment and next action

The migration adds nullable attribution/normalization fields, review storage and flags. It does not merge, rename, relink or country-correct existing identities. Academy key indexes are deliberately non-unique; new primary names and newly added aliases are validated while unchanged legacy collisions remain editable. Imports serialize automatic academy creation. A database unique constraint remains deferred until staff complete repair and a collision audit.

Merge-owner steps: inspect final PR checks/review status; complete or explicitly retain the Clerk UI acceptance limitation; integrate schema changes if the concurrent ASJJF intake PR lands first; merge only under the owner's gates. For future data work, verify the dataset, inspect dry-run output and approve uncertain display names/location countries before any separate repair authorization. Optional parent storage has no ranking roll-up behavior. The points formula and future official ASJJF ranking replacement are outside this PR.

Lifecycle session: `01a19896-cfa6-7233-ab34-481a1040a7db`. Owned Rails/Vite processes were terminated, the created T3/Chrome tabs closed, and browser viewport overrides reset. No runtime resource is handed off. The task-owned test/QA databases are dropped before the final report; shared PostgreSQL, baseline services, other worktrees and production remain untouched. The clean held worktree and PR are the only implementation handoff.
