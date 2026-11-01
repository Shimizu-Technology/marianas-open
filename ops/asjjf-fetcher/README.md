# Mac mini ASJJF runner

For the lead/operator to install **after review**, on the macOS 26 Mac mini as `jerry`. This PR does not install or run anything there. Uses the existing Colima installation and a system LaunchDaemon so no GUI login is needed.

The mini has 16 GB RAM: Immich's VM uses 8 GB and Party Games uses 2 GB. This dedicated 2 GB fetcher VM must be **stopped between runs**. The runner refuses to borrow an already running profile, uses `DOCKER_HOST` for its own socket, and never changes the global Docker context. Cleanup stops only its named container/profile.

## Install and secrets

1. Place the reviewed checkout at `/Users/jerry/work/marianas-open` (or edit both checkout paths in the plist). Ensure jerry can read the checkout and write his config/log directories. Do not store secrets in the checkout.
2. As jerry, prepare the files:

   ```sh
   mkdir -p ~/.config/mo-asjjf-fetcher ~/Library/Logs/mo-asjjf-fetcher
   chmod 700 ~/.config/mo-asjjf-fetcher
   touch ~/.config/mo-asjjf-fetcher/env
   chmod 600 ~/.config/mo-asjjf-fetcher/env
   openssl rand -hex 32
   ```

   Save that newly generated value privately as `ASJJF_FETCHER_SECRET` in the env file and set the **same value** on the Render API service. Register/configure the matching fetcher ID on that service according to the intake deployment instructions. Never paste secrets into Git, logs or a PR. Keep the Mac clock synchronized for timestamp checks.

   Env file format is Docker `--env-file` syntax, not shell syntax: literal `KEY=value`, no `export`, no quotes, no substitutions. Example (replace all placeholders):

   ```dotenv
   ASJJF_API_BASE=https://YOUR-RENDER-API-HOST
   ASJJF_FETCHER_ID=mac-mini
   ASJJF_FETCHER_SECRET=YOUR-GENERATED-SECRET
   MAX_PAGES_PER_RUN=200
   MAX_RUN_MINUTES=300
   PACING_JITTER=0.15
   ALLOWED_HOSTS=asjjf.org,dumau.asjjf.org
   ```

   File must be regular, not a symlink, chmod 600, owned by jerry or root, and readable by jerry. A root-owned 600 file requires an explicit operator arrangement to be readable; normally use jerry ownership. The runner passes the path to Docker without sourcing it or placing the secret in process arguments. Local Docker administrators can inspect container environment; the dedicated VM/container are removed/stopped after use.

3. Run the manual check below before enabling the schedule. Confirm Colima can start as jerry without console login and all three API endpoints are deployed. The first run provisions the profile and installs image packages; it will take longer.
4. Install the template as a root-owned LaunchDaemon:

   ```sh
   sudo install -o root -g wheel -m 644 \
     /Users/jerry/work/marianas-open/ops/asjjf-fetcher/com.shimizutechnology.mo-asjjf-fetcher.plist \
     /Library/LaunchDaemons/com.shimizutechnology.mo-asjjf-fetcher.plist
   sudo plutil -lint /Library/LaunchDaemons/com.shimizutechnology.mo-asjjf-fetcher.plist
   sudo launchctl bootstrap system /Library/LaunchDaemons/com.shimizutechnology.mo-asjjf-fetcher.plist
   ```

The job runs nightly at **02:30 in the Mac's local timezone**. Check that the mini's system timezone is Pacific/Guam. `HOME` is explicitly set for jerry; no LaunchAgent, console session, RunAtLoad, or KeepAlive loop is needed. launchd can run a missed calendar job on wake.

## Build and manual run

```sh
sudo -u jerry -H /bin/zsh /Users/jerry/work/marianas-open/ops/asjjf-fetcher/run.sh
```

The runner starts `colima start mo-asjjf-fetcher --cpu 2 --memory 2 --disk 10 --activate=false`, uses `unix://$HOME/.colima/mo-asjjf-fetcher/docker.sock`, then builds a native `linux/arm64` image only if build-input content changed or no tagged image exists. It hashes Dockerfile, package files, entrypoint, .dockerignore and src, and stores the hash in an image label. **Build rather than pull:** no registry credential/distribution workflow is required, and the reviewed local checkout defines the run. Updates require the lead to update that checkout; no automatic `git pull`. Base/package security updates require deliberately removing the local image and rebuilding with `--pull` (or rebuilding the image with its source label absent so the runner rebuilds it). Source equality alone does not discover upstream package changes.

Xvfb starts directly on `:99`, waits for its socket, and is reaped with Node. Do not replace this with `xvfb-run`, which hung in the feasibility container. The browser runs as non-root `node`; Chromium uses `--no-sandbox` because of container kernel constraints. Container has an init process, 1.4 GB limit, and a PID cap. No host ports, volumes or Docker socket are mounted inside it.

Logs: `~/Library/Logs/mo-asjjf-fetcher/YYYY-MM-DD.log`, plus launchd bootstrap output in `launchd.log`. Rotate/archive these periodically under the operator's log retention policy. Node output is structured JSON; runner/Docker/Colima diagnostics are plain text. Exit codes: **0** clean/no work/paused; **1** fetch/API/build/start/stop failure; **2** challenge or existing breaker; **75** overlap/already-running profile; **78** env/config/checkout validation failure; **130/143** interrupted. Browser errors recorded by the run produce code 1 after finishing remaining allowed work.

## Health checks and recovery

```sh
sudo launchctl print system/com.shimizutechnology.mo-asjjf-fetcher
colima status mo-asjjf-fetcher
ls -l ~/.config/mo-asjjf-fetcher
ls -lt ~/Library/Logs/mo-asjjf-fetcher
```

After a completed run, expect: a final `run_finished` heartbeat/event; the Rails intake shows the fetcher and received snapshots; `colima status mo-asjjf-fetcher` says stopped; no run lock remains. A successful HTTP response alone does not prove the intake parsed results; parsing/approval belongs to B1/B3. Test an empty queue before an operator-approved one-page ASJJF smoke run (`MAX_PAGES_PER_RUN=1`). Then inspect the saved HTML/status/outcome in the API and restore the cap. Keep credentials out of screenshots.

- **Challenge → breaker:** Node stops the whole run and attempts the challenge snapshot. Exit 2 writes `~/.config/mo-asjjf-fetcher/challenged`; future nightly runs exit before starting the VM. Check the API snapshot and server `paused_until`/breaker state and investigate pacing/access with the lead. If challenge delivery failed, use the local `challenge_detected` event as evidence. Do not add evasion tooling or automatically retry. After the lead authorizes resuming, clear the API pause/breaker through its documented operator control, then remove only the local `challenged` file and do one controlled run. Clearing one breaker does not clear the other.
- **401/403 API auth:** verify fetcher ID, shared secret and clock; API 4xx are not retried. They do not imply an ASJJF challenge.
- **Stale lock:** `cat ~/.config/mo-asjjf-fetcher/run.lock/pid`, inspect that exact PID and the named container/profile. Only when no run is active, remove the lock's pid file and empty directory. Do not remove a live lock. SIGKILL/power loss may require this recovery and an explicit `colima stop mo-asjjf-fetcher`.
- **Stop failure/already-running profile:** inspect only this dedicated profile, stop it explicitly, then retry. Do not stop Immich, Party Games, LM Studio, Jerry/OpenClaw, or change the global Docker context.
- **Image/package/network failure:** inspect logs and retry manually after fixing it. Colima is still stopped on normal failure paths. No VM is started on the development laptop as part of this PR.
- **Browser/display:** confirm the Xvfb socket readiness log and Debian Chromium package; do not use headless mode or `xvfb-run`. Platform viability was proved by the earlier mini probe; this packaged runner still needs its own deployment smoke test.

## Uninstall

```sh
sudo launchctl bootout system /Library/LaunchDaemons/com.shimizutechnology.mo-asjjf-fetcher.plist
sudo rm /Library/LaunchDaemons/com.shimizutechnology.mo-asjjf-fetcher.plist
```

Verify this job/container is no longer active. Stop only `mo-asjjf-fetcher` if still running. Optionally `colima delete mo-asjjf-fetcher` after confirming no needed image/log evidence remains. Remove this runner's config/log files only under the operator's retention policy and revoke the matching secret/fetcher on Render. Leave every other profile and service untouched.
