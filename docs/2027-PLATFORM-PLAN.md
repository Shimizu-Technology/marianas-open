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

Status as of November 2, 2026. "Live" means merged to `main`, deployed to Render and Netlify, and checked in production.

### Phase A: Safety net

| Item | Status |
|---|---|
| A1 CI on `main` (API tests, RuboCop, Brakeman, bundler-audit, web lint/typecheck/build/tests), CodeRabbit config | Live (#111) |
| A2 Sentry (env-gated), root error boundary, stale-chunk reload, real 404 for missing assets, dependency updates | Live (#111). Sentry has no DSN yet, deferred by Leon. |
| A3 Hardening: pagination limits, last-admin guard, invite-only account linking, JWKS rotation, JSON-LD escaping, real 404 for unknown events, job cleanup, rulebook link, invite-only admin sign-in | Live (#112) |

### Phase B: ASJJF data pipeline

| Item | Status |
|---|---|
| 2027 events from the ASJJF calendar (Copa, Tokyo, Manila, Taiwan) | Live (#113). Facts checked against ASJJF event pages on Nov 2; evidence linking in #134. |
| B0/B2 Fetcher: real Chrome on the Mac mini, human pace, stops on challenges | Live (#114, #117, #127, #133) |
| B1 Production intake: stored snapshots, signed ingest, server-side parsers, admin upload fallback | Live (#115, #132) |
| B3 Results import rebuild: explicit Gi/No-Gi sources, fail-closed, diff preview, keyed updates | Live (#120, #125, #131) |
| B4 Names and identity: normalizer, per-result academy, merge tools | Live (#116) |
| B5 Official ASJJF Marianas Pro rankings | Live (#121) |
| B6 ASJJF calendar watcher | Live (#128). First check on Nov 2 proposed 4 changes. |
| B7 Automation: scheduled syncs, review holds, alerts, admin sync status | Live (#120) |
| Data repair: all 2026 events | Done. All eight 2026 events have results split into Gi and No-Gi, with no division showing two golds. Hong Kong 2026 imported Nov 2 (334 results, matching ASJJF). |
| Data repair: Korea 2024, Manila 2025, Taiwan 2025 Gi/No-Gi relabel | Blocked. ASJJF redirects these pages outside the fetcher boundary; #133 logs the target for a decision. |

### Phase C: Season-aware site and design

| Item | Status |
|---|---|
| C1 Season states (pre-event, live, post-event, off-season) | Live (#119) |
| C2 Accessibility and performance | Live (#118) |
| C3 Translation completeness | Live (#130) |
| C4 Visual refresh (design brief, shared building blocks, home, event pages, results, profiles, gallery) | In progress: two workers. Needs Leon's sign-off on before/after before merge, then Steve and Carm's review. |
| Registration opening date on public pages (no Register buttons before ASJJF opens registration) | In progress, part of C4 |

### Phase D: Self-service admin

| Item | Status |
|---|---|
| D1 Season rollover with review checklist | Live (#124) |
| D2 Sponsor placements and featured sponsor bar | Live (#122) |
| D3 Editable copy for remaining hard-coded text | Live (#130) |
| D4 Photo intake (zip upload, day albums, review queue) | Live (#123) |
| D5 Needs attention dashboard, help page, read-only viewer role | Live (#129) |
| D6 Watch page upkeep | Live (#126) |
| Carm's phone walkthrough (set up an event, upload photos, add a sponsor) | Waiting on scheduling (draft message ready) |

### Phase E: Operations

| Item | Status |
|---|---|
| Ownership inventory for domain, hosting, database, storage, auth, analytics, email | Done; kept privately in Brain-Dump with items for Leon to confirm |
| Backup restore test | Passed Nov 2 (Neon point-in-time branch, compared with production, deleted) |
| Failed background jobs | 43 stale jobs from May cleared Nov 2 |
| Branch and worktree cleanup | Ongoing after each merge |
| Merge `main` into `staging` | Scheduled after C4 merges (30 conflicting files with the merchandise work) |

## Open questions for the Marianas Open team (not blocking)

Kept for the next conversation; uncertain items stay unchanged until answered.

1. Should "Carbs Jiu Jitsu" display as "Biba Jiu Jitsu" (ASJJF's current name), including on past results?
2. Fifteen academy groups that may or may not be the same gym (listed in the duplicate research notes).
3. Whether team rankings should roll branches up to a parent team, as ASJJF does.
4. Whether "Other" should be excluded from team rankings.
