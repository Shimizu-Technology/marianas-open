# B4 independent review round 2

2026-11-02. Implementation worker for PR #116; merge remains with the parent. No production data or settings were accessed or changed.

## Context and acceptance

Sources: repository README, `docs/B4-identity-acceptance.md`, PR #116 brief, Brain Dump `work/shimizu-tech/marianas-open/STATUS.md`, and the rebased code. The live platform serves tournament athletes/public visitors and Clerk-protected staff managing results, athlete profiles, and academies. Imported ASJJF names and gym labels must keep their source evidence while staff-approved identities and public labels remain stable across subsequent imports. Ranking points remain placement multiplier × event stars.

Main verified at `7d49a66` includes PR #115 snapshot intake (`asjjf_*` and `event_asjjf_sources`). Existing PR head before rebase: `2f3988cd740032629aabfe9b2c824f7a0df07e5d`. This worker uses the isolated `t3-ed7df0a5` worktree and local branch `t3/identity-merge-review-fixes`, because the PR branch is already checked out in another worktree. Push destination is the same remote `agent/identity-normalization`, protected by an explicit old-head lease.

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

Pending final validation.
