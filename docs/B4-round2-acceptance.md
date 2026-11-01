# B4 independent review round 2

2026-11-02. Implementation worker for PR #116; merge remains with the parent. No production data or settings were accessed or changed.

## Context and acceptance

Sources: repository README, `docs/B4-identity-acceptance.md`, PR #116 brief, Brain Dump `work/shimizu-tech/marianas-open/STATUS.md`, and the rebased code. The live platform serves tournament athletes/public visitors and Clerk-protected staff managing results, athlete profiles, and academies. Imported ASJJF names and gym labels must keep their source evidence while staff-approved identities and public labels remain stable across subsequent imports. Ranking points remain placement multiplier × event stars.

Final rebase base `b4c646bcbf7fbb414454c88c47a6ceebdb280cfd` also includes PR #114 (fetcher); it changes fetcher/ops files and CI only. Main `7d49a66` includes PR #115 snapshot intake (`asjjf_*` and `event_asjjf_sources`). Existing PR head before rebase: `2f3988cd740032629aabfe9b2c824f7a0df07e5d`. This worker uses the isolated `t3-ed7df0a5` worktree and local branch `t3/identity-merge-review-fixes`, because the PR branch is already checked out in another worktree. Push destination is the same remote `agent/identity-normalization`, protected by an explicit old-head lease.

Required affected-flow scenarios (agent execution on disposable local data):

1. Merge profile data: copy blank fields and attachments; display conflicts and keep choices; persist selected source values and default target values; retain attachment blobs and discarded-value audit evidence; roll back all changes on failure. Check component interaction at desktop and phone CSS widths.
2. Reviewed athlete merge and rename: retain old names and both orders as staff-approved aliases; reimport resolves the survivor; conflicting approved aliases roll back safely.
3. Encoded/decoded academy twins: merge in both directions; reviewed CSV dry run leaves data unchanged, apply completes transactionally and matches its projection.
4. Academy rename/merge: public athlete profile, list, name search, rankings, and result labels show canonical linked academy; raw result gym text remains available.
5. Country ranking headcounts use distinct linked competitor IDs across GU/GUM and both raw name orders, with normalized-name fallback for unlinked rows.
6. Admin result list preloads athlete and academy associations.

Scope: affected identity journeys only. Authenticated browser checks use the actual changed merge component in a temporary harness backed by the real test API and synthetic staff fixtures. This does not establish real Clerk sign-in or the entire admin edit-page journey. Phone coverage is responsive desktop-browser emulation, not physical phone/native input testing. Production deployment verification is outside this worker's scope because the PR must remain unmerged.

## Schema integration

Rebase produced a conflict only in `api/db/schema.rb`. Used main's schema as the initial DB baseline, loaded it into the empty owned `marianas_open_test_b4r2` DB, ran the identity migration, and let Rails regenerate the schema. Then ran the new competitor-alias migration and regenerated again. No column-list conflict was manually merged. Snapshot intake tables, their indexes/foreign keys, lease fields, and event sources remain present alongside identity attribution and aliases. Schema load and full test validation recorded below.

## Execution record

Application implementation tested in this worktree, rebased implementation head `1cbfac36a41ee713d5a78461e55361d8cd4df5aa`, followed by the nickname-alias correction in the final implementation/evidence commit. Rails/web source trees did not change during the second rebase onto fetcher main.

- Initial targeted identity run: 72 tests, 944 assertions, zero failures/errors after correcting an unlinking regression, request-parameter handling, and fixture warning acknowledgements found by the first run. All preexisting unlink/reassignment and stale-preview tests pass.
- Full Rails run after schema load: 269 tests, 4,826 assertions, zero failures/errors, one intentional parser isolation skip under Rails. The skipped assertion passed separately through `bundle exec ruby -Itest test/services/asjjf/parsers/intake_contract_test.rb --name test_parsers_do_not_load_rails_or_active_record`: one test, two assertions, no skip.
- Final full Rails rerun after nickname-alias/current-gym corrections: 270 runs, 4834 assertions, 0 failures, 0 errors, 1 skips. The sole skip is the parser isolation check already passed standalone.
- RuboCop: 272 files, no offenses. Brakeman with CI flags: no warnings/errors. Updated bundler-audit: no vulnerabilities.
- Web: `npm ci`, lint, `npx tsc -b`, all 94 Vitest tests, `build:no-translate`, and `npm audit --omit=dev --audit-level=high` pass. Audit retains existing low/moderate production advisories below the CI threshold. Impeccable advisory scan returned `[]`.
- Newly inherited fetcher gate: 47 Node tests pass; zsh syntax and all nine runner checks pass. Docker image build remains for Linux CI; no local Docker containers were started.

Browser QA on synthetic fixtures, real Rails test API (3216), and temporary Vite component harness (5316): all four saved-state cases passed (academy and athlete merges at measured 1440px and 390px). The UI required count confirmation, defaulted each conflict to the kept record, submitted source choices, locked controls while saving, and showed completion. Source description/logo selections persisted for both academy cases. Desktop athlete kept its target photo and adopted source bio; phone athlete kept target bio and adopted source photo; both copied the previously blank nickname. Keyboard Space selected the mobile photo/confirmation controls. No horizontal page overflow (measured scroll widths 1434/1440 and 384/390); phone layout was visually inspected. Source rows disappeared, all four surviving attachments referenced the expected blobs, and all eight fixture blobs still existed. Audit entries included actor ID, conflicts, and discarded field values/blob IDs. Merge aliases belonged to the surviving athletes and synthetic staff creator.

T3 preview snapshot failed twice with `Preview automation snapshot timed out after 15000ms.` Used Chrome computer-use fallback; a browser timeout during desktop save was recovered by reading current state and saved DB values before continuing. No duplicate mutation was submitted. The temporary harness and config were removed. This verifies the changed merge component and API, not real Clerk sign-in or the whole admin edit page. Real-device touch/keyboard behavior was not run.

Final inspection caught nickname aliases being run through the ASJJF surname-first parser as if they were raw result names. Corrected the merge to parse raw result names only; profile names now provide their explicit first/last and nickname orders. Regression asserts the correct reverse nickname alias and rejects the malformed alias. Current-gym fields are excluded from descriptive profile choices because latest-result attribution remains authoritative; a no-history merge retains a blank-profile gym fallback. Regression verifies both cases. A superseded verification run was stopped before starting the final suite with these corrections. Reimport coverage is rerun in that final suite.

## Merge-owner handoff

Do not merge or run production repair from this worker. Review PR #116's final head, checks, and these round-2 changes, then apply the parent's independent review/merge decision. Academy key uniqueness remains deferred. No production repair was executed. This worktree and local branch remain available for the parent; the existing checkout of `agent/identity-normalization` was not altered.

Lifecycle session: `01a198c2-47f5-7eb3-99b7-d1a3439e69c9` (session hook). Both exact owned servers and both owned browser tabs were closed; Chrome viewport override reset. Lifecycle status shows no active owned resources. Dedicated test DB is dropped at the end; no runtime handoff is intended.
