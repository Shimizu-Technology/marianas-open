# B2 implementation and acceptance record

2026-11-02. Implementation agent; branch `agent/asjjf-fetcher`, based on `origin/main` at `b6eadb3`. See the PR head for the tested implementation version.

## Product brief and scope

The live platform serves tournament athletes/fans and Marianas Open administrators with event information, results, profiles and rankings ([repository README](../README.md)). The [2027 plan, Phase B](2027-PLATFORM-PLAN.md#phase-b--asjjf-data-pipeline) makes ASJJF the source of truth. The local Brain Dump's `work/shimizu-tech/marianas-open/marianas-open-research.md` identifies ASJJF as the federation partner managing official Asia-Pacific points/rankings; older registration plans are historical context. This task uses the current lead-provided intake contract, independently of the concurrent Rails worker.

Acceptance for B2: sign exact requests; lease bounded work; fetch allowed HTTPS targets with a fresh headed Chromium; pace; save bounded raw snapshots; stop on challenge; honor caps/shutdown; heartbeat; provide a dedicated, idle-stopped Mac mini runner and operator recovery instructions. No public/admin UI changes, result parsing, live import, Mac mini installation, production calls or merge. The lead owns deployment.

## Agent-executed affected-flow QA

Fixtures: in-process fake API responses and browser contexts only; no shared accounts, external pages, production records or secrets. Local Node 22.22.3 on Leon's Mac; execution through `node --test`.

| Scenario | Expected outcome | Result / evidence |
|---|---|---|
| Exact GET/POST HMAC signing | Timestamp, method, path/query, raw-body hash and hex signature match Rails-shareable vectors | Passed; signing.test.js |
| Work → fetch → snapshot → heartbeat | One-request leases, saved request ID/content, start/end heartbeat and paced next lease | Passed; run.test.js |
| Challenge and delivery failure | Save attempt, stop entire run, emit local-breaker signal even if API is down | Passed; run.test.js |
| Caps / empty queue / pause / shutdown | No additional browser fetch; bounded pacing and final heartbeat | Passed; run.test.js |
| URL boundary / redirect interception | Refuse disallowed host, HTTP, credentials and nonstandard port before navigation | Passed with fake browser routes; run.test.js, browser.test.js |
| Oversized snapshot | Count full serialized UTF-8 JSON; send too_large without HTML; challenge still stops | Passed; run.test.js |
| API retry policy | Retry network/5xx only, finite backoff, fresh signature, timeout; no 4xx/invalid-JSON retry | Passed; api.test.js |
| Browser lifecycle / challenge detection | Fresh headed launch, locale/timezone, closure on error/abort, recognizable challenge markers | Passed with injected browser; browser.test.js |
| Runner syntax / launchd template | Valid zsh/POSIX shell syntax and plist | Passed; zsh -n, sh -n, bash -n, plutil -lint |
| Container image build | Debian Chromium/Xvfb dependencies install on Linux | Not run locally: no Docker daemon; CI builds linux/amd64 |
| Real packaged browser and API | Start/end heartbeat, saved snapshot and dedicated VM stops on mini | Not run: explicitly reserved for lead after review |
| Native arm64 image / pre-console LaunchDaemon / signal cleanup | Works on actual mini, leaves no VM RAM held | Not run: deployment smoke test required |

`npm ci && npm test`: 33 tests passed at final local gate. No ShellCheck installed (`brew list shellcheck` reported no keg); no system package installed. CI adds Fetcher alongside existing API/Web jobs and a Docker build. Existing Rails/web tests are exercised in CI; they are unchanged by this task. No UI-dependent acceptance or viewport checks apply.

## Decisions and remaining verification

Build locally on the mini when hashed image inputs change; no GHCR workflow/credentials or auto-updates. One-request leases keep long waits from exhausting queued leases. A local challenge breaker supplements the API pause state. JSON logs omit HTML, URLs and exception text.

The preceding feasibility probe is source context, not evidence that this packaged runner has been deployed. Lead must verify arm64 build, fresh headed browser behavior with normal subresources, authentication against deployed B1, duplicate POST handling on ambiguous retries, one controlled page snapshot, pre-login scheduling, and VM stop on successful/error/interrupted runs. No ASJJF access or Mac mini command was executed in this implementation task.

Resource baseline was audited with the supplied lifecycle session. No servers, browser tabs, simulators, VMs or containers were started; borrowed resources were left alone. The branch/worktree remain for lead review and merge.
