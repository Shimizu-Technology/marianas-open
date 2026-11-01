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

Evidence and remaining limits will be recorded below before PR handoff.
