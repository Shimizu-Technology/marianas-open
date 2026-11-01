# Marianas Open 2027 platform plan

**Owner:** Shimizu Technology (Leon Shimizu)
**Started:** November 2, 2026
**Deadline that drives the order:** 2027 Guam Copa de Marianas, Saturday January 30, 2027 (ASJJF registration opened October 31, 2026)

This is the working plan and status tracker for the end-of-season overhaul. It records what we are doing, why, and how we will know each piece is done. Update the status column as pull requests merge.

## Principles

- **Accuracy over completeness.** The public site shows only facts we can source (ASJJF pages, the organizers, or verified data). Nothing invented, no placeholder numbers, no default copy that looks like real event data.
- **Easy and intuitive on phones and desktops** for three groups: athletes and fans, the Marianas Open team who run the admin, and Shimizu Technology who maintain it.
- **ASJJF is the source of truth** for events, results, star ratings, and rankings. We mirror it faithfully and link back to it.
- **Every change goes through the PR workflow**: isolated branch, local gate, runtime QA at 390px and 1440px, review, merge to `main`, production verification.
- **Production data changes** (re-imports, merges, renames) are rehearsed on a Neon branch first, then applied after a backup point with a before/after report.
- **`staging` stays parked** with the merchandise work. Fixes branch from `main`; `main` is merged into `staging` after releases.

## Key research findings (November 2, 2026)

- ASJJF blocks plain HTTP requests and headless browsers with a Cloudflare challenge (verified from a Mac and from the production Render worker). A real browser passes. ASJJF's robots.txt allows general access and only disallows AI-training crawlers.
- ASJJF publishes official **Marianas Pro rankings** (2026 gi ranking id 227, no-gi id 234) by division, kids/adults, and teams, including match bonus points. Our home-grown formula disagrees with them (e.g. ASJJF's #1 2026 team is Biba Jiu Jitsu with 5,351 points; our all-time formula shows Deftac first).
- ASJJF event pages state each event's star rating and the official points rule: gold/silver/bronze = 15/7/3 × stars, **alone in bracket = 0 points**, +3 per submission win, +1 per match win.
- Results import bugs: No-Gi results are labeled `[GI]` on six events; partial fetches can replace complete results; team rankings show the wrong academy names; Hong Kong 2026, Dumau 2026, and Marianas Open 2026 have no results.
- Duplicate data: 13 academy groups are confirmed duplicates (e.g. "Carbs Jiu Jitsu" and "Atos Jiu-jitsu Guam" are one gym, which ASJJF now lists as "Biba Jiu Jitsu"); 94 groups of duplicate athlete records, mostly caused by a hyphen-handling bug.

## Phases

### Phase A — Safety net

| Item | Status |
|---|---|
| A1 CI on `main` (API tests, RuboCop, Brakeman baseline, bundler-audit, web lint/typecheck/build/tests), CodeRabbit config | In progress |
| A2 Sentry (env-gated), root error boundary, stale-chunk reload, real 404 for missing assets, dependency security updates | In progress |
| A3 Hardening: pagination limits, last-admin guard, invite-only account linking, JWKS rotation, JSON-LD escaping, real 404 for unknown events, job cleanup, ASJJF rulebook link, invite-only admin sign-in | In progress |

### Phase B — ASJJF data pipeline

| Item | Status |
|---|---|
| 2027 events from the ASJJF calendar (Copa, Tokyo, Manila, Taiwan) | In progress |
| B0 Fetcher feasibility: real Chrome on an always-on machine | Planned |
| B1 Production intake: stored ASJJF page snapshots, signed ingest endpoint, server-side parsers, admin "upload saved page" fallback | Planned |
| B2 Fetcher service (real Chrome, human pace, no stealth tooling; stops on interactive challenges) | Planned |
| B3 Results import rebuild: explicit gi/no-gi sources, fail-closed, diff preview, keyed updates that keep manual edits | Planned |
| B4 Names and identity: one normalizer, hyphen fix, per-result academy, rename detection, merge tools, near-duplicate review | Planned |
| B5 Official ASJJF Marianas Pro rankings on the Rankings page and profiles | Planned |
| B6 ASJJF calendar watcher: new Marianas events appear as drafts for review | Planned |
| B7 Automation: scheduled syncs, review holds, email alerts, admin sync status | Planned |
| Data repair: re-import affected events, apply confirmed merges and renames | Planned |

### Phase C — Season-aware site and design

| Item | Status |
|---|---|
| C1 Season states (pre-event, live, post-event, off-season) | Planned |
| C2 Accessibility and performance (contrast, labels, layout shift, fonts, images, bundle) | Planned |
| C3 Translation completeness | Planned |
| C4 Visual refresh (keep the dark identity; Impeccable-led, Emil motion standards) | Planned |

### Phase D — Self-service admin

| Item | Status |
|---|---|
| D1 Season rollover with review checklist | Planned |
| D2 Sponsor placements and featured sponsor bar | Planned |
| D3 Editable copy for remaining hard-coded text | Planned |
| D4 Photo intake (zip upload, day albums from timestamps, review queue) | Planned |
| D5 "Needs attention" dashboard, analytics link, help page, viewer role decision | Planned |
| D6 Watch page upkeep (hide removed YouTube videos) | Planned |

### Phase E — Operations

| Item | Status |
|---|---|
| Ownership inventory for domain, hosting, database, storage, auth, analytics, and email | Planned |
| Backup restore test | Planned |
| Branch and worktree cleanup | Planned |

## Open questions for the Marianas Open team (not blocking)

Kept for the next conversation; uncertain items stay unchanged until answered.

1. Should "Carbs Jiu Jitsu" display as "Biba Jiu Jitsu" (ASJJF's current name), including on past results?
2. Fifteen academy groups that may or may not be the same gym (listed in the duplicate research notes).
3. Whether team rankings should roll branches up to a parent team, as ASJJF does.
4. Whether "Other" should be excluded from team rankings.
