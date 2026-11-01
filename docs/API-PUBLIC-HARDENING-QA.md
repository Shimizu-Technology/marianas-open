# Round 3 acceptance — 2026-11-02

Implementation starts from PR #112 head `3c14476d121ee38559439ef5056d08c69b944acb`, containing main `b6eadb3`. The PR branch is already checked out in a borrowed worktree, so this agent uses isolated local branch `agent/api-and-public-hardening-r3` in `/Users/leonshimizu/.t3/worktrees/marianas-open/t3-44bbcf82` and pushes HEAD explicitly to `agent/api-and-public-hardening`. No merge or deployment is authorized for this sub-agent.

App brief refreshed from README.md, docs/AUTH-SYSTEM.md, the current authentication controllers/service, PR #112's round-2 evidence, and Brain-Dump `work/shimizu-tech/marianas-open/{README,STATUS}.md`. Marianas Open provides public tournament information; locally invited admin/staff users manage content. Required acceptance is verified ownership before one-time linking, immediate JWKS rotation, and cached known-key availability during refresh. Public frontend behavior is unchanged in this round.

Agent-executed affected-flow API scenarios use disposable local records in `marianas_open_test_w2r3`, signed RSA JWTs for JWKS cases, and stubbed Backend API responses matching Clerk's `primary_email_address_id` / `email_addresses[].verification.status` structure. JWT verification alone is stubbed for controller linking scenarios. Provider requests, signup, and email delivery are simulated in this round; the real round-2 invitation evidence below remains historical.

- **R3-1 passed:** verified primary email links a pending invitation and preserves role; ticket-verified signup without a JWT email gains admin access and persists `accepted`. Unverified primary and matching unverified secondary addresses return 403 without changing the placeholder. Backend HTTP/DNS errors fail closed. Existing real identities are preserved, including a simulated concurrent link during provider lookup. Denial logs contain no email, subject, or provider message. Tests: `ClerkLinkingTest` (11 cases), `ClerkLinkingFlowTest` (5 cases), and the existing admin-create integration scenario.
- **R3-2 passed:** `unknown kid refreshes immediately after an ordinary successful fetch` verifies old then new signed tokens without advancing time. Unknown-key rate limiting is separate from the failure backoff; tests cover retries, cold failure/recovery, and concurrent requests.
- **R3-3 passed:** `known kid verification completes while an unknown kid refresh is slow` verifies the cached old token before releasing the blocked refresh. `waiters fail closed within the wait bound while refresh is in flight` covers bounded waiting; slow-trickle deadline/recovery, streamed oversize rejection/backoff, and immutable snapshot tests pass. Bounds: 4 seconds overall HTTP; 1/2-second open/read; 256 KiB; 0.5-second shared waiter budget. Limits are per Puma process.

Full local gate passes: schema load; **96 Rails tests / 575 assertions**, zero failures/errors/skips; **209 RuboCop files**, zero offenses; Brakeman CI flags, zero errors/active warnings with eight inherited ignores; bundler-audit, no vulnerabilities. Web `npm ci`, lint, `npx tsc -b`, **29 Vitest tests**, and `build:no-translate` pass. Production npm audit passes the CI high-severity threshold (one low / one moderate advisory remain). The existing optional libvips HEIF plugin warning remains; codec support was not tested.

Initial focused execution found that two JWT loader callbacks could each wait 0.5 seconds; both now share one monotonic deadline, and the full suite passes after that fix. An initial schema command was launched from the repository root and failed; test preparation and a later explicit schema load then overlapped on the owned test database. Those attempts are superseded by the successful sequential schema-load/full-gate run. No shared database was changed.

No new UI, browser, physical-device, live Clerk, deployment, or production acceptance was run in round 3. Final-head independent review and merging belong to the parent/merge owner. Lifecycle ownership uses this session's injected hook ID `01a19882-eca3-7973-8d10-65201bbdcb74`, superseding the parent session ID in the task brief. Test database cleanup, CI head/status, and final handoff are recorded in the PR round-3 comment and the local handoff.

---

## Round 2 historical evidence

# API and public hardening acceptance

## Scope and source

Agent-executed affected-flow QA, 2026-11-02 (Guam), for PR #112. Rebased original head `dc266c8` onto `fe9adf411fe0db71c520b2895ffd9b2049dbe1ab` (main, PR #111). Then rebased onto `b6eadb3` after PR #113 merged during QA, preserving the 2027 events, venue formatting, and season helpers/tests. The only conflict was `web/.env.example`: retained Sentry configuration and removed the obsolete PDF delivery configuration. Main's CI, ErrorBoundary, monitoring, test framework, and scanner baselines remain intact.

Marianas Open serves multilingual tournament information and rankings. Invited admin/staff users manage content; viewers cannot access administration. Sources: README.md, docs/AUTH-SYSTEM.md, current controllers/pages, and Brain-Dump `work/shimizu-tech/marianas-open/marianas-open-research.md`. ASJJF is the federation partner. Acceptance covers one-time identity linking, invitation routing, bounded JWKS requests, and recoverable event loading. No production writes, deployment, merge, or shared development database changes are in scope.

## Review findings and regression coverage

1. **Legacy and seeded admin linking:** seeds now explicitly set `pending`. An unlinked `pending_*` ID with `pending` or legacy-default `accepted` status can link once. Explicitly revoked/expired placeholders remain blocked. A real Clerk ID can never be replaced through an email match. Row locking rechecks the saved identity. Tests cover the actual admin-create path, a seed-shaped legacy admin, a returning linked admin, revoked/expired placeholders, changed identities, and missing/uninvited subjects.
   History checked: initial Clerk scaffolding `588a0d5`; invitation implementation/migration `6461ec5` (existing users default to accepted); Resend invitation service `f1b074f`; logging and invitation timestamp fixes `64d671b`; Backend API profile lookup `b396a88`. Admin UI invitations explicitly used pending placeholders; seeds retained the default accepted status. No production records were read or repaired.
2. **Ticket-only invitations:** a nonempty `__clerk_ticket` selects SignUp unless `__clerk_status=sign_in` explicitly selects SignIn. Ordinary login and status-only URLs retain invite-only SignIn. The previous Node test suite moved into Vitest, so CI now runs the invitation, JSON-LD, SEO rendering, and seven-locale checks.
3. **JWKS outage throttling:** cache misses and unknown-key refreshes share a mutex and one-minute attempt marker written before HTTP, including failed attempts. Cached known keys remain usable during the cooldown; unknown keys fail closed. Connect/read timeouts are 2/3 seconds. Production uses a per-process memory cache, so the bound is per Puma process. Rotation immediately following a fetch can wait up to the cooldown. Tests cover cold-cache timeouts, repeated failures, DNS failure and recovery, rotation/unknown IDs, eight concurrent cold failures, and eight concurrent refreshes.
4. **Event API errors:** after automatic retries fail, the event page shows an on-brand error and retry action, translated in all seven locales. Retry preserves the event URL. Only a successful response missing the slug renders the noindex 404. Vitest exercises the real provider's retries, error state, retry, and subsequent successful empty response.
5. **ASJJF link:** the lead manually verified `https://asjjf.org/main/rules?pagesType=RULE_BOOK` in a real browser on 2026-11-02. The page exists and ASJJF's own menu links it as “Rules Book.” This is lead-provided evidence; the implementation agent did not independently pass its Cloudflare challenge.

## Local gate

- Own database: `DATABASE_URL=postgres:///marianas_open_test_w2r2`, created and schema loaded, then dropped. Shared `marianas_open_development` was not modified. No QA development database was needed.
- Rails: **81 tests, 516 assertions, zero failures/errors/skips**.
- RuboCop: **208 files, zero offenses**, using main's baseline.
- Brakeman: `bin/brakeman --no-pager --exit-on-warn --exit-on-error`: **zero errors, zero active warnings**, eight baseline ignores from main.
- `bin/bundler-audit check --update`: no vulnerabilities.
- Web: `npm ci`, `npm run lint`, `npx tsc -b`, `npm test` (**29 passed**), and `npm run build:no-translate` pass. Production dependency audit passes the CI high-severity threshold (one existing low and one moderate advisory).
- Impeccable advisory: two existing event-heading gradient warnings, retained as established site styling. No new material finding. `/tmp/marianas-w2r2-qa/impeccable.json`.
- Local libvips emits an existing optional HEIF-plugin warning about missing `libx265.216.dylib`; the full Rails suite still passes. HEIF codec support was not tested.

## Runtime evidence

Headless Chromium used the real local Vite app, with a 390×844 Clerk viewport and 390×900 / 1440×900 public-page viewports. T3 preview snapshots twice timed out, so the runtime checks used Playwright Chromium. Resizing a desktop browser does not establish physical-device keyboard/touch behavior.

**I2 — real Clerk development invitation: passed, with test-helper limitation.** Copied the canonical checkout's ignored web/API `.env` files, checked `pk_test_`/`sk_test_`, and verified the frontend instance matched the JWKS hostname. Created exactly one invitation for `mo-invite-test+clerk_test@example.com` with `notify=false` and redirect `http://127.0.0.1:5312/admin`. No email was sent.

The invitation URL redirected to local admin with both ticket and sign-up status. Initial unassisted headless access stopped at Clerk's Cloudflare bot challenge before the form loaded. Used a short-lived development testing token and the official `@clerk/testing` 2.2.53 `setupClerkTestingToken` helper (downloaded to private scratch, not added to this repository). That helper appends the testing token to real Clerk requests and overrides the client's captcha-bypass flag. No Clerk signup response, user, or invitation status was fabricated.

Removed `__clerk_status` and loaded the **ticket-only** local URL. The real SignUp widget displayed “Fill in missing fields,” with only Password required. Clerk's client confirmed `missing_requirements`, the exact invited email, and email verification `verified`. Submitted a generated disposable password through the UI. Clerk signed in and redirected to `/admin` without query parameters. Backend API independently confirmed invitation `accepted` and user `user_3LWA1Pl2cQfyN8zLstMnYDnC5A5` with a verified email. Code `424242` was not requested because the invitation ticket verified the email automatically.

Cleanup: revocation of the already accepted invitation returned HTTP 400. Deleted the test user through the Backend API and confirmed zero users remain for the address. A subsequent revoke returned HTTP 404 `resource_not_found` for the invitation, and it was absent from the invitation listing after user deletion. The invitation was consumed and removed; it was **not successfully revoked**. Unassisted CAPTCHA completion and Rails admin authorization were not verified. No local API was started; the final admin screen correctly reported that the API could not be reached.

Evidence: `/tmp/marianas-w2r2-qa/clerk-invitation-390.png` (initial challenge), `clerk-ticket-only-390.png` (real form), and `clerk-complete-390.png` (signed-in API-unavailable recovery screen). Invitation/testing tokens and passwords are excluded from repository evidence.

**E2 — outage and recovery: passed at both widths.** Isolated browser API fixtures returned 503 through all retries, then 200 with an empty list after keyboard activation of Try again. Verified the friendly error, no premature 404/noindex, visible focus, no horizontal overflow, preserved slug URL, and noindex 404 only after successful recovery confirmed absence. React StrictMode produced five failed requests followed by one retry request in the settled run; a parallel build caused an earlier HMR reload, which was retested after the build finished. An initial incomplete announcements fixture triggered ErrorBoundary; the fixture was corrected to the real response shape before both passing runs. This was a fixture error, not an application change.

Evidence: `/tmp/marianas-w2r2-qa/events-results.json`, `events-error-{390,1440}.png`, `events-recovered-{390,1440}.png`. Both error screens were visually inspected. Real valid-event recovery with a live API and real phone behavior were not run in round 2.

Round 1's 55 Rails tests and 16 browser scenarios remain historical evidence in `/tmp/marianas-w2-qa`; its Clerk widgets were stubs. The round 2 results above supersede round 1's invite-routing, linking, error-state, lint/security, and CI claims.

## Runtime and handback

No new dependencies or migrations. Daily Solid Queue finished-job cleanup and Sunday unattached-blob cleanup from round 1 still require normal API/worker restart on deployment. Sentry/ErrorBoundary and root CI from main are preserved. Netlify/Render delivery and independent final-head review belong to the parent/merge owner. This implementation agent must not merge.

Owned Vite/Chromium resources are cleaned through lifecycle session `01a1986c-2201-7871-bb4b-eeb6284f901a` (the actual hook-supplied session; the task brief contained an older session ID). The failed T3 preview tab was closed/released. Test database dropped; no dev database clone or local API created. Branch/worktree retained for the parent.
