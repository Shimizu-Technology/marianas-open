# B4 web implementation handoff

Prepared November 2, 2026 (Guam). This file travels with the implementation commit returned by the worker.

## Scope and source

- Repository: Shimizu-Technology/marianas-open.
- Worktree: `/Users/leonshimizu/.t3/worktrees/marianas-open/t3-88ed9918`.
- Branch: `t3/web-admin-merge-reviews`; base: `3634aefa9f71a1b15b4d11a6e9cfa15e0b3d39b3`.
- Ownership: `web/**` only. No backend, ASJJF intake/parser files, production writes, PR, push, or merge.
- Integration owner will cherry-pick this commit and combine it with the separately implemented backend.

Orientation sources: repository `README.md`, the existing public country displays and admin editors at the base commit, `web/src/services/api.ts`, and the Brain Dump research at `/Users/leonshimizu/Desktop/ShimizuTechnology/Brain-Dump/work/shimizu-tech/marianas-open/research-2026-11-02/report.md`. The platform serves public tournament results, athlete profiles, and gym rankings; authenticated admins correct imported identities. The research distinguishes duplicate identities from separate branches and similar names. This implementation makes that distinction explicit and does not apply any research decisions to production records. Deployment/source availability was not checked in this child task.

## Implemented

- `countryFlagUrl` resolves all 249 ISO alpha-2/alpha-3 pairs, case-insensitively with surrounding whitespace removed. ASJJF aliases TAI/TPE, GUM, MNP, HKG, MAC, and KOS resolve to TW, GU, MP, HK, MO, and XK. XK is also supported. Unknown/malformed values return null.
- ISO code pairs are checked in, with the upstream Debian iso-codes source URL and snapshot date. No network call resolves country codes. Flag image requests still use the existing flag CDN.
- All five requested public views use the shared flag component. Unknown codes and failed image loads show a text badge; a later country change can load its flag normally.
- Academy editing supports renaming, location, two/three-letter country codes, unaffiliated state, and optional parent selection/removal. Parent selection searches server records and excludes the current academy. A parent preserves distinct branches; merging removes a duplicate.
- Both admin editors load authoritative detail independently of the current table page. They retain drafts on failed saves, offer detail retry, reject saving a missing/mismatched profile, and keep existing list filters/page context. Uploads refresh loaded media without resetting profile drafts.
- Academy and competitor merges search server records beyond the table page and require a preview. The UI names the removed and surviving IDs, displays result/athlete counts, and requires explicit irreversible confirmation. Each warning needs a separate acknowledgement. Blocked previews cannot proceed. Pending requests lock selection and editor controls; changing the selected target or saving changed profile data invalidates prior confirmation. Failed merge requests require a fresh preview before retrying.
- A successful merge opens the surviving record, including when it is outside the current table page.
- The academy review queue loads pending names on demand. Admins explicitly select the suggested gym or search for another gym, or approve a new distinct gym. Counts and consequences appear before confirmation. Errors preserve selection and require renewed confirmation; the queue can be refreshed to reconcile interrupted requests.
- New controls use visible focus outlines, wrapping content, 44px action targets, and 16px input text at narrow widths. The new operational panels add no motion; status and error text provide feedback immediately. Existing page motion remains in place.

## Backend integration contract

The web API client uses the supplied endpoints under `/api/v1/admin`:

- Academies: `GET /academies/:id/merge_preview?target_id=ID`; `POST /academies/:id/merge` with `{target_id,confirm:true}`.
- Competitors: `GET /competitors/:id/merge_preview?target_id=ID`; `POST /competitors/:id/merge` with `{target_id,confirm:true,confirm_warnings:true}`.
- Reviews: `GET /identity_reviews`; `POST /identity_reviews/:id/resolve` with either `{academy_id:ID}` or `{create_new:true,confirm:true}`.
- Preview responses are unwrapped `{source:{id,name},target:{id,name},results_count,warnings:[]}` plus academy `athletes_count` or competitor `blocked`.
- Academy detail must serialize `parent_id` and `unaffiliated`, and updates must accept them. They are sent alongside existing profile fields. Missing values currently display as no parent / false for compatibility with the base API; confirm serialization before integrated acceptance to avoid overwriting hidden values.
- Existing authenticated client behavior handles `{error:string}` and `{errors:[]}` and refreshes the Clerk token once after a 401. Tests exercise both error formats and eventual authorization failure. Real Clerk admin access has not been verified.

## Automated verification

All commands run from `web/`:

- `npm ci`: passed. npm reported existing dependency audit findings (20: 1 low, 14 moderate, 5 high) and a React peer warning. Lockfile/dependency versions were not changed.
- `npm run lint`: passed.
- `npx tsc -b`: passed.
- `npm test`: passed, 78 tests across 15 files. New tests cover the entire ISO table, aliases, unknown codes, failed flag loads, merge direction/count confirmations/warnings/blocking, stale preview and search recovery, pending-request locks, review linking/new-gym decisions, authenticated API payloads/errors, off-page detail loading, profile edits, and survivor navigation.
- `npm run build:no-translate`: passed. No translation workflow was invoked.
- `git diff --check`: passed.
- Advisory `IMPECCABLE_NO_TELEMETRY=1 npx --yes impeccable@4.6.0 detect --json` on all changed UI files: exit 0, output `[]`. No hooks or package were installed in the repository. This scan does not establish browser usability acceptance.

All new network-dependent tests use mocked API methods or mocked fetch. They do not use production data or credentials.

## Required integrated UI verification

Execution owner: integration owner or a coordinated agent. Each case requires both 390px and desktop browser coverage, keyboard/focus checks where applicable, and saved-state verification against an isolated local/staging backend. No case is accepted from component tests alone.

Current status: **0 of 7 browser cases executed**. All are `not_run` at both viewport sizes because this worker was explicitly told not to start servers or browsers until coordinated. Integrated admin cases also require a verified Clerk admin session and the new backend endpoints; neither prerequisite was established here. Physical-phone keyboard behavior is also unverified.

1. Public flags: render alpha-2, alpha-3, ASJJF aliases, unknown code, and failed image in the five affected views. Verify correct flag/text and no clipped names or horizontal page overflow.
2. Academy edits: open an off-page academy by `?edit=ID`, rename it, set location/country, set/remove parent, toggle unaffiliated, save, reload, and verify all fields persist. Verify a failed save retains the draft.
3. Academy merge: select a distinct source/target fixture, inspect counts/warnings, cancel/change selection, then confirm once. Verify source removal, surviving profile, moved results/athletes, and preserved list context.
4. Competitor edits and merge: rename first/last, reload, preview two fixture records, exercise a blocked merge and a warning merge, require both confirmations, and verify surviving profile/results after success.
5. Review existing gym: inspect a pending raw name/count, choose a suggested or searched gym, confirm, reload queue and verify the resulting links and resolved state.
6. Review distinct gym: approve a fresh pending name as a new gym, confirm, and verify exactly one new distinct academy and the resolved results.
7. Failure/recovery: interrupt search, preview, merge, review resolve, and profile save; exercise 401/403 and both API error formats. Verify visible errors, preserved drafts/selections, refreshed preview/queue before retry, and no duplicate mutation while pending.

Next action: cherry-pick the implementation commit, verify backend response serialization and routes, coordinate an isolated app runtime and admin fixture, then execute the seven cases. Do not call the combined change release-ready until required integrated acceptance passes.

## Resource disposition

Lifecycle session: `01a19897-dc17-7a31-9126-fd679f715ed0`. No servers, browser tabs, simulators, emulators, or containers were started or borrowed for this work. No runtime handoff is needed. Task-created dependency/build output is removed after verification; the clean worktree and commit remain available for cherry-pick.
