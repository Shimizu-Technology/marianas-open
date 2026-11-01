#!/bin/zsh
# Installed LaunchDaemon invokes this file as jerry. Never changes Docker context.
set -eu
setopt PIPE_FAIL
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"
unset DOCKER_CONTEXT
export DOCKER_HOST="unix://$HOME/.colima/mo-asjjf-fetcher/docker.sock"
profile=mo-asjjf-fetcher
image=mo-asjjf-fetcher:local
checkout=${MO_FETCHER_CHECKOUT:-$HOME/work/marianas-open}
config_dir="$HOME/.config/mo-asjjf-fetcher"
env_file="$config_dir/env"
log_dir="$HOME/Library/Logs/mo-asjjf-fetcher"
lock_dir="$config_dir/run.lock"
breaker="$config_dir/challenged"
umask 077
mkdir -p "$config_dir" "$log_dir"
exec >> "$log_dir/$(date +%Y-%m-%d).log" 2>&1
print -r -- "$(date -u +%FT%TZ) runner_start"
if ! mkdir "$lock_dir" 2>/dev/null; then
  print -r -- 'Already locked. Check run.lock/pid; remove the directory only after verifying no run is active.'
  exit 75
fi
print -r -- $$ > "$lock_dir/pid"
vm_owned=0
container="mo-asjjf-fetcher-$$"
container_started=0
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  if (( container_started )); then
    docker stop --time 300 "$container" >/dev/null 2>&1 || true
    docker rm "$container" >/dev/null 2>&1 || true
  fi
  if (( vm_owned )); then
    if ! colima stop "$profile"; then
      print -r -- 'ERROR: Colima stop failed; VM may still hold memory. Stop the dedicated profile manually.'
      result=1
    fi
  fi
  rm -f "$lock_dir/pid"
  rmdir "$lock_dir"
  print -r -- "$(date -u +%FT%TZ) runner_exit=$result"
  exit "$result"
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
if [[ -e "$breaker" ]]; then
  print -r -- 'Challenge breaker is set. Investigate before removing ~/.config/mo-asjjf-fetcher/challenged.'
  exit 2
fi
if [[ ! -f "$env_file" || -L "$env_file" ]]; then
  print -r -- 'Missing env file, or env file is a symlink.'
  exit 78
fi
if [[ $(stat -f '%Lp' "$env_file") != 600 ]] || \
   [[ $(stat -f '%u' "$env_file") != $(id -u) && $(stat -f '%u' "$env_file") != 0 ]]; then
  print -r -- 'Env file must be chmod 600 and owned by the runner user (or root).'
  exit 78
fi
[[ -r "$env_file" && -f "$checkout/fetcher/Dockerfile" ]] || exit 78
# This dedicated profile must be stopped between runs; do not borrow a live VM.
if colima status "$profile" >/dev/null 2>&1; then
  print -r -- 'Dedicated profile is already running; refusing to take ownership. Investigate and stop it before retrying.'
  exit 75
fi
vm_owned=1
colima start "$profile" --cpu 2 --memory 2 --disk 10 --activate=false
cd "$checkout/fetcher"
# Hash only build inputs. Tests, logs, timestamps and node_modules do not trigger rebuilds.
fingerprint=$({ shasum -a 256 Dockerfile package.json package-lock.json entrypoint.sh .dockerignore; \
  find src -type f -print | LC_ALL=C sort | while IFS= read -r file; do shasum -a 256 "$file"; done; } | shasum -a 256 | awk '{print $1}')
current=$(docker image inspect --format '{{ index .Config.Labels "org.shimizutechnology.source-sha256" }}' "$image" 2>/dev/null || true)
if [[ "$current" != "$fingerprint" ]]; then
  docker build --platform linux/arm64 --label "org.shimizutechnology.source-sha256=$fingerprint" -t "$image" .
fi
container_started=1
set +e
docker run --rm --init --name "$container" --platform linux/arm64 --memory 1400m --pids-limit 512 \
  --stop-timeout 300 --env-file "$env_file" "$image"
result=$?
set -e
if (( result == 2 )); then
  print -r -- "$(date -u +%FT%TZ) challenged" > "$breaker"
fi
exit "$result"
