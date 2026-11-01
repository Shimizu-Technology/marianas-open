# Official rankings B5 acceptance

Owner: implementation agent. Target: `main`; PR held for merge owner. No production writes.

Context verified November 2, 2026 against main `1472f17b14cfe637627eba8a6c115b156a3f31aa`. Athletes and fans need season/division standings that agree with ASJJF, while staff need controlled source selection. The current public page computes all-time medal points; this work publishes only confirmed Marianas Pro source lists. Sources: `docs/2027-PLATFORM-PLAN.md`, `docs/ASJJF-PIPELINE.md`, existing parser fixtures/tests, Brain Dump `work/shimizu-tech/marianas-open/marianas-open-research.md` and `ROADMAP.md`. Current ASJJF ids: gi 227, no-gi 234; adults team 227. Kids must be fetched separately; the repository has no captured kids fixture. Current main includes identity aliases and canonical academy names. Results import and season-aware event pages are owned by other workers and excluded.

Experience: retain the dark Marianas identity; prioritize readable positions, points, source/date and small native filter controls. Filter changes settle immediately; no decorative entry motion. Preserve selections in the URL. Label local medals as history. Source identities stay unmatched when ambiguous.

Agent-executed affected-flow acceptance (required at 390px and 1440px):

1. Load official 2026 individual standings with source/date, default Male Adult Black; switch gender/age/belt and Gi/No-Gi; verify selected division and points, pagination and URL restoration.
2. Teams shows Biba Jiu Jitsu #1 at 5,351, with working matched academy links; kids appear only with data.
3. Matched athlete link opens profile with official current-season position/points and medal history, with no locally computed ranking points.
4. EN and JA individual/team views remain readable without horizontal overflow. Keyboard labels/focus work.
5. Pending season, empty division, unavailable source, loading and error/retry states do not imply fabricated standings.
6. Admin can edit confirmed season IDs/select current season; staff cannot. Suggestions remain inert until confirmation.

Automated acceptance: fixture counts (85 gi/57 no-gi divisions, 158 division rows, 217 adult team rows); idempotence; incomplete/zero protection; ambiguity and aliases; API/cache/pagination; weekly and post-results scheduling; picker/rendering. Full Rails/style/security and web CI gates. Runtime fixtures use owned QA DB only. Native phone behavior is outside browser-width QA.

Execution ledger: implementation at `0ada857`, plus the final hold-pagination regression fix, was tested against owned `marianas_open_qa_b5` on API port 3271 and Vite 5371. Real fixture counts and API pagination were checked independently. Public fixtures: Gi default 39 + White Adult 158; No-Gi default 10; adults teams 217. Current-season profile 289 has official Gi #1 / 187 and No-Gi #2 / 84. Missing copied logo storage was detached in the QA copy so the existing public logo fallback renders; no shared/production data changed.

Automated checks: Rails 299 runs / 5,063 assertions / zero failures or errors / one expected skip (parser contract requires a standalone runner rather than preloaded Rails). Web 131 tests / 30 files, lint, typecheck and production build passed, including the last-page hold-queue regression. RuboCop inspected 288 files with no offenses. Brakeman found no warnings; bundler-audit found no vulnerabilities. Production dependency audit has existing moderate findings and no high/critical findings. Impeccable returned `[]`.

Runtime passed: default and White division facts; URL-preserved selection, page 2 of 158 entries, linked profile with official Gi/No-Gi standings and medal history, and return-to-division link. Teams show Biba #1 / 5,351 with a matched academy destination; kids stay hidden without published data. Unavailable No-Gi teams show an explanatory message, and returning to Gi restores populated standings. EN/JA individual and team cards/tables and the profile were rendered at CSS widths 390 and 1440 without horizontal overflow. Screenshots below use Chrome device emulation at DPR 2. T3 preview snapshot failed twice (15-second timeout), followed by intermittent Chrome extension dispatch failures; native Chrome controls supplied final captures.

Coverage limits: this is browser-width QA, not physical-phone testing. Full gender/age keyboard interaction, loading/error retry and authenticated admin save/review journeys were covered by API/component tests, not a complete live operator walkthrough; local Clerk authentication was not configured. No production rollout or historical login-gated source was exercised.

| View | 390px | 1440px |
| --- | --- | --- |
| Individual EN | [Screenshot](rankings-b5/individual-en-390.png) | [Screenshot](rankings-b5/individual-en-1440.png) |
| Individual JA | [Screenshot](rankings-b5/individual-ja-390.png) | [Screenshot](rankings-b5/individual-ja-1440.png) |
| Teams EN | [Screenshot](rankings-b5/teams-en-390.png) | [Screenshot](rankings-b5/teams-en-1440.png) |
| Teams JA | [Screenshot](rankings-b5/teams-ja-390.png) | [Screenshot](rankings-b5/teams-ja-1440.png) |
| Profile EN | [Screenshot](rankings-b5/profile-en-390.png) | [Screenshot](rankings-b5/profile-en-1440.png) |

Review: independent backend, combined and guard-focused static rounds found incomplete row reductions, identity-merge association loss, schema pollution, misleading apply status, removed division inventory and inaccessible older holds. These were fixed. The last guard review identified last-page pagination shrinking; Previous now remains available and a regression proves the 26-to-25 hold case. CodeRabbit reported an OSS review rate limit and has not supplied a completed review. CI and final cleanup are reported with the PR handoff.
