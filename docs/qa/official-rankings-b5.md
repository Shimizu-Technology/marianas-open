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

Execution ledger (in progress): implementation complete. Real fixture counts and API pagination were independently checked against owned `marianas_open_qa_b5` on API port 3271 and Vite 5371. Current public fixtures: Gi default 39 + White Adult 158; No-Gi default 10; adults teams 217. Current-season profile 289 has official Gi #1 / 187 and No-Gi #2 / 84. Missing copied logo storage was detached in the QA copy so the existing public logo fallback renders; no shared/production data changed.

Automated checks: a completed 297-test Rails run passed (one expected skip: parser contract test requires a standalone runner rather than preloaded Rails). The latest inventory/hold-queue changes are in a new full run. Web 130 tests/29 files, lint, typecheck and production build passed; dependency audit has only existing moderate findings, no high/critical production findings. Brakeman and bundler-audit passed; final refresh is running. Impeccable returned `[]`.

Runtime: confirmed default and White division facts; URL-preserved selection, page 2 of 158 entries, linked profile with official Gi/No-Gi standings and medal history, and return-to-division link. Rendered EN mobile cards and JA desktop table, with no horizontal overflow at verified CSS widths 390/1440. Additional screenshots and remaining scenario coverage are in progress. T3 preview snapshot failed twice (15-second timeout); Chrome fallback has intermittent CDP dispatch timeouts and required fresh task-owned tabs. No physical-device/native keyboard claim.

Review: two independent static rounds. Fixed incomplete row reductions, identity-merge association transfer, schema pollution, apply status reporting, verified removal of division inventory, and persistent hold discovery. Final inventory/hold changes have automated regressions; final review/check state will be recorded before handoff.
