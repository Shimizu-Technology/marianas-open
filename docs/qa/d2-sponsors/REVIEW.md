# CodeRabbit review resolution

CodeRabbit first reported an OSS rate limit, then reviewed `93dcbcc` after the allowance reset. The earlier limit is not the final review outcome. Its 14 inline findings and five follow-ups were checked against the current implementation.

| Finding | Disposition and verification |
| --- | --- |
| Unknown upload variants replace the regular logo | Fixed: allowlist light/dark, keep the missing-variant light default, return 422 before mutation for unknown values. Request regression preserves the existing logo and audit count. |
| Draft-event placement metadata is publicly accessible | Fixed: event lookups use `Event.publicly_visible`; draft-event request returns 404. |
| Duplicate YouTube IDs differ between validation and player | Fixed: reject duplicate `v` values and conflicting path/query IDs. Backend and parser regressions cover ambiguity. |
| Unchanged legacy websites block unrelated edits | Fixed before the review was read: changed/new URL validation only; editor supplies HTTPS for scheme-less websites. Request/component regressions cover it. |
| Legacy logo formats block unrelated edits | Fixed: validate only changed attachments; request regression retains a historical SVG through placement edits and verifies a new regular upload. |
| NULL historical sponsor names abort the migration | Fixed: normalize `name.to_s`; migration regression preserves the null record and creates its placements. The actual QA source has no null names. |
| Cross-organization sponsors disappear from event pages | Verified data: all 20 QA-source sponsors belong to the 2026 event's organization; zero are outside it. Keep the organization boundary. Evidence is in `backfill-comparison.json`; this is a local-copy compatibility proof, not a production data audit. |
| Whitespace CTA prevents website fallback | Fixed: normalize CTA and website independently before choosing a destination; component regression covers blank CTA. |
| Placement load failure hides sponsors without recovery | Fixed: translated error/retry UI, preserved last successful list, stale-response protection. Hook/component tests and real API recovery checks pass at both widths. |
| Vimeo privacy hash is dropped | Fixed: retain a single valid alphanumeric privacy hash; reject malformed/duplicate values in model and parser tests. |
| Hotel Tano global fallback duplicates on a later backfill | Fixed: preserve an existing global event row when the historical event is added later; regression retains its ID and staff message. |
| Open pages do not refresh scheduled placements | Fixed: visible-tab interval and visibility refresh, timer/listener cleanup, and latest-response guard. Real API scheduling-window changes update an open page at both widths. |
| Missing editor target creates a new sponsor | Fixed: explicit missing-target state and save-identity guard preserve fast upload retry without creating duplicates. Component and rendered fixture checks cover missing targets. |
| Fields/files remain editable during save | Fixed: disabled fieldset covers every editor control; regression and fixture checks verify name/logo inputs remain locked until completion. Sticky feedback remains visible on the phone. |
| Reorder writes unchanged sponsors | Fixed: send only placements whose dense order changed; regression verifies unchanged sponsors are skipped. |
| Event reorder rows are indistinguishable | Fixed: visible row text and both move labels include the event name or translated all-events scope; component regression covers multiple event rows. |
| Admin index runs per-sponsor placement/audit queries | Deferred, nonblocking: confirmed linear admin-only reads at the current 20-sponsor scale. Public sponsor reads remain bounded and both logo associations are eager-loaded. A batched top-ten-per-sponsor history query can follow when needed; this review provides no observed timeout at realistic counts. |
| Successful delete is obscured by a failed refresh | Fixed: remove the committed deletion from local state immediately and report success independently of refresh; component regression covers refresh failure. |
| Event-lineup evidence is too broad | Clarified: compatibility evidence covers home membership/order/effective links and 2026 event membership, plus the explicit Hotel Tano exclusion check on Copa 2027. It does not claim a per-event comparison across all 29 events. |

The combined gate on integrated base `60aac4b` passes: 373 API tests/5,580 assertions (zero failures/errors, one skip), 251 web tests, Ruby style, Brakeman, bundler-audit, lint, TypeScript, and production build. The final local web run used temporary timing allowances under heavy host load; see README.md. All 14 inline threads are resolved. CodeRabbit reviewed the earlier source and was not treated as final-head approval; the backend fixes received an independent advisory review, and the isolated frontend slice was inspected on integration. The implementation parent owns final browser acceptance and cleanup. Earlier independent reviews do not stand in for verification of these later fixes; the final changed-code review and exact gate results are recorded in PR #122.
