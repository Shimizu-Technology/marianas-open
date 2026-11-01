# Identity repair services and local tasks

Marianas Open staff use this tooling to consolidate reviewed academy and athlete identities without losing tournament results. Team attribution belongs to each result's `academy_id`; an athlete's `academy_id` means their current gym. Imported academy text remains on the result.

The implementation follows the November 2, 2026 research (`research-2026-11-02/report.md`, `decisions.csv`, and `athlete_duplicates.csv` in the project's Brain Dump). This slice starts at main `3634aef`. The B4 change includes the identity schema, normalizer, country helper, models, linker, and admin endpoints. Deploying the code does not run a repair. Production data was not accessed or repaired during implementation.

## Merge service contract

Both `Identity::AcademyMerge` and `Identity::CompetitorMerge` expose:

```ruby
preview = Identity::CompetitorMerge.preview(source, target)
# { source: { id:, name: }, target: { id:, name: }, results_count:,
#   warnings: [], blocked: false }
# Academy previews also include athletes_count.

Identity::CompetitorMerge.call(
  source: source, target: target, confirm: true,
  confirm_warnings: false, actor: current_user
)
```

Calls return the reloaded target. `confirm` must be boolean `true`. Invalid/self/unpersisted pairs, missing confirmation, blocked identities, and unacknowledged warnings raise `ArgumentError`. Other validation/deletion failures propagate and roll back the transaction. Records are locked in ID order and rechecked inside the transaction.

Academy merges move result academy links, competitor current-gym links, child academy parents, and pending/resolved review references. They combine aliases and preserve the source name, delete the source, and leave result academy text unchanged. When merging a parent into its child, the target inherits the source's parent. The target's other profile fields stay in place.

Competitor merges move every source result to the target and delete the source. Result details, raw names, academy links, and the target profile stay in place. `identity_separate` on either record blocks every merge, including a call with `confirm_warnings: true`.

`Identity::HistoryCheck.call(source, target)` returns warning strings for missing histories, undated events, possible truncation, differing raw names, conflicting genders, belt regression, and kid/adult divisions at one event. Ellipses, single-token names, and names exactly 20 characters long receive conservative truncation warnings; a legitimate complete name at that length may need manual review. Belt comparisons use event dates, do not treat different divisions on one date as regression, and allow a youth-colored-belt to adult-white transition. These checks flag risks; they do not prove two records belong to one person.

Admin athlete previews include an expiring signed `review_token`. The merge endpoint requires this token and rechecks names, counts and warnings under the merge locks. Changed/expired previews must be reloaded. Manual merges can acknowledge warnings with boolean `confirm_warnings: true` only after the operator reviews those warnings. CSV and hyphen cleanup never acknowledge them automatically. Merge/rename audit lines are JSON with the action, source/target or rename details, counts, and actor ID. They are emitted only after the outermost transaction commits; rolled-back repairs do not emit successful-merge lines. Rake runs have no actor ID.

## Local rake commands

Use a dedicated local database and reviewed CSV copies. These tasks refuse `RAILS_ENV=production`. The CSV IDs must refer to the intended dataset; do not reuse research IDs against an unrelated database. Preserve a backup before applying a real local repair and pause imports while comparing reports. A merge has no automatic undo.

From `api/`, on a prepared **local** database:

```sh
RAILS_ENV=test DATABASE_URL=postgres:///marianas_open_test_b4_tools \
  bin/rails identity:repair DECISIONS=/absolute/path/decisions.csv ATHLETES=/absolute/path/athlete_duplicates.csv

# Apply only after reviewing the dry-run report:
RAILS_ENV=test DATABASE_URL=postgres:///marianas_open_test_b4_tools \
  bin/rails identity:repair DECISIONS=/absolute/path/decisions.csv ATHLETES=/absolute/path/athlete_duplicates.csv APPLY=1

RAILS_ENV=test DATABASE_URL=postgres:///marianas_open_test_b4_tools \
  bin/rails identity:repair_hyphen_duplicates

RAILS_ENV=test DATABASE_URL=postgres:///marianas_open_test_b4_tools \
  bin/rails identity:backfill
```

Only the exact environment value `APPLY=1` enables writes. All commands default to dry run. `DECISIONS` and `ATHLETES` are independently optional for `identity:repair`, but at least one is required. Both files must have the research CSV headers. Academy IDs and competitor IDs are distinct positive integers separated by whitespace. Invalid headers or accepted-row IDs fail before writes. Small anonymized examples live in `api/test/fixtures/files/identity/`.

Academy repair admits only `MERGE_SAME_GYM` and `RENAME_ONLY`. It picks the existing canonical-name record as target, or the first surviving CSV ID. Current names/aliases must match the supplied CSV identity names; stale IDs are reported and skipped. Missing sources allow safe reruns; missing groups and overlapping admitted groups are reported and skipped. Renames retain the previous name as an alias and use the explicit canonical country after country-code normalization. A canonical name containing a question, parentheses, or “confirm” is reported as needing a display-name decision. A verified merge can proceed while retaining the existing target name. No country is inferred from an athlete's nationality.

Athlete repair admits only `SAME_PERSON` with `high` confidence and consistent complete histories. Any other verdict for an ID in that CSV protects it, including a conflicting high-confidence `SAME_PERSON` row elsewhere. `KEEP_SEPARATE*`, `UNCERTAIN*`, and `DIFFERENT_PEOPLE_LIKELY` are skipped. Skipped rows do not change persistent identity flags: staff must set `identity_separate` to protect known different people across future runs and imports.

Hyphen cleanup requires an exact nonblank normalized profile key, a hyphen in at least one profile/result spelling, complete consistent histories, and no `identity_separate` flag anywhere in the group. It groups the same first/last order; it does not guess reversed profiles or fuzzy matches. Pass `ATHLETES=/absolute/path/athlete_duplicates.csv` to also protect every ID with a separate, uncertain, or lower-confidence CSV verdict. This option supplies exclusions only; it does not enable other CSV merges. Staff must preserve known-different-person flags before using this task.

Repair reports `before`, actual `after`, and `projected` totals for academies, athletes, results, and points, plus result/athlete/point counts per academy, operations, and skipped reasons. Dry-run `after` equals `before`; `projected` describes the admitted changes. Apply runs the whole repair in one transaction and checks that result count and total points remain unchanged. It uses the existing `RankingCalculator` formula unchanged. Reruns skip deleted sources and already-completed renames.

## Backfill

`Identity::Backfill.call(apply: false, io: $stdout)` resolves every result from its own raw `academy` text through `AcademyLinker.resolve(raw, create: apply)`. `create: false` must be strictly read-only, including the review queue. Apply can create new academies or pending reviews through the linker. Ambiguous/unresolved text receives no academy link and remains in the report for staff review. Existing incorrect links are corrected; raw text is preserved.

Current gym is the academy of the most recent dated result, then the greatest event ID and result ID for ties. Undated results sort before dated results and are counted in the report. An unresolved latest result clears a stale current-gym link. Athletes with no results retain their manually entered gym. Reports count scanned results, changed result links/current gyms, missing raw-name saves, country normalizations, undated rows, and unresolved raw labels. Current-gym display text also follows the latest result. Unknown names are reported during preview; a preview does not promise whether apply will create a record or queue a near-duplicate review.

## Acceptance and validation

This backend slice uses agent-executed affected-flow checks against anonymized legacy fixtures. Required scenarios cover academy links/aliases/children/reviews and deletion rollback; competitor result preservation, warning acknowledgement, protected identities and deletion rollback; CSV dry run, skips, whole-run rollback, reruns and per-academy totals; exact-key hyphen safety; backfill raw attribution, latest gym, unresolved reviews, idempotency and rollback; and the rake dry-run/apply boundary.

Tests run only against `marianas_open_test_b4_tools`, with the parent's B4 dependencies loaded read-only into the process. No migrations, models, controllers, or schema files are changed by this slice. After integration, run the normal Rails suite with the completed parent schema and models:

```sh
RAILS_ENV=test DATABASE_URL=postgres:///marianas_open_test_b4_tools \
  bin/rails test test/services/identity
bin/rubocop app/services/identity lib/tasks/identity_repair.rake test/services/identity
```

Admin browser/mobile acceptance and full-project checks belong to the parent B4 integration. This worker starts no servers, accesses no production API/database, and creates no PR. Its temporary database and dependency loader are removed after validation.

Worker validation on November 2, 2026: 22 tests / 132 assertions passed with no failures or errors; scoped RuboCop passed; Brakeman reported zero warnings and zero errors. An additional transaction check verified that a rolled-back merge emits no successful audit line and a committed merge emits action/source/target/counts/actor. Local boot printed an existing libvips HEIF/x265 dependency warning; these tests exercise no image processing. Full integrated Rails and UI acceptance remain with the parent worker.

Integrated verification and merge-owner limits are recorded in [B4 identity acceptance](B4-identity-acceptance.md). The final suite has 155 Rails tests / 1,418 assertions and 80 web tests; the earlier worker-only evidence above remains a historical slice.
