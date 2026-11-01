#!/bin/zsh
# Installed LaunchDaemon invokes this file as jerry. Never changes Docker context.
set -eu
setopt PIPE_FAIL
export PATH="${MO_FETCHER_PATH:-/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin}"
script_dir=${0:A:h}
bounded="$script_dir/bounded.pl"
unset DOCKER_CONTEXT
export DOCKER_HOST="unix://$HOME/.colima/mo-asjjf-fetcher/docker.sock"
profile=mo-asjjf-fetcher
image=mo-asjjf-fetcher:local
checkout=${MO_FETCHER_CHECKOUT:-$HOME/work/marianas-open}
state_root=${MO_FETCHER_STATE_ROOT:-$HOME}
config_dir="$state_root/.config/mo-asjjf-fetcher"
env_file="$config_dir/env"
log_dir="$state_root/Library/Logs/mo-asjjf-fetcher"
lock_dir="$config_dir/run.lock"
breaker="$config_dir/challenged"
umask 077
mkdir -p "$config_dir" "$log_dir"
# Bound the whole job independently of Node and Docker. Read only the numeric
# limit, never source the Docker env file (it contains secrets).
minutes=300
if [[ -f "$env_file" ]]; then
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ "$line" != MAX_RUN_MINUTES=* ]] || minutes=${line#*=}
  done < "$env_file"
fi
[[ "$minutes" == <->(|.<->) || "$minutes" == .<-> ]] || exit 78
(( minutes > 0 && minutes <= 1440 )) || exit 78
integer run_seconds=$(( minutes * 60 + 1 ))
if [[ ${1:-} != --worker ]]; then
  # Start/build allowance plus run limit. TERM allows bounded cleanup before KILL.
  exec /usr/bin/perl "$bounded" "$(( run_seconds + 1500 ))" 180 /bin/zsh "$0" --worker
fi
find "$log_dir" -type f -name '*.log' -mtime +30 -delete
exec >> "$log_dir/$(date +%Y-%m-%d).log" 2>&1
print -r -- "$(date -u +%FT%TZ) runner_start"
# Atomic mkdir is the lock. A missing pid may be another runner between mkdir
# and writing it; leave that case alone. Only reclaim a recorded dead PID.
if ! mkdir "$lock_dir" 2>/dev/null; then
  mkdir "$config_dir/recover.lock" 2>/dev/null || exit 75
  owner=$(cat "$lock_dir/pid" 2>/dev/null || true)
  if [[ "$owner" == <-> ]] && ! kill -0 "$owner" 2>/dev/null && ! ps -p "$owner" >/dev/null 2>&1; then
    rm -f "$lock_dir/pid"
    rmdir "$lock_dir" 2>/dev/null || { rmdir "$config_dir/recover.lock"; exit 75; }
    mkdir "$lock_dir" 2>/dev/null || { rmdir "$config_dir/recover.lock"; exit 75; }
    rmdir "$config_dir/recover.lock"
  else
    rmdir "$config_dir/recover.lock"
    print -r -- 'Already locked (live or unverified owner).'
    exit 75
  fi
fi
print -r -- $$ > "$lock_dir/pid"
vm_owned=0
container="mo-asjjf-fetcher-$$"
active_pid=
# Run asynchronously so zsh can handle TERM while start/build/run is blocked.
# Required callers use `|| exit $?`: zsh errexit inside a function can skip EXIT.
bound() {
  local seconds=$1
  shift
  /usr/bin/perl "$bounded" "$seconds" 5 "$@" &
  active_pid=$!
  local result=0
  wait "$active_pid" || result=$?
  active_pid=
  return "$result"
}
cleanup() {
  local result=$?
  trap - EXIT INT TERM
  if [[ -n "$active_pid" ]]; then
    kill -TERM "$active_pid" 2>/dev/null || true
    wait "$active_pid" 2>/dev/null || true
    active_pid=
  fi
  if (( vm_owned )); then
    bound 15 docker rm -f "$container" >/dev/null 2>&1 || true
    if ! bound 30 colima stop "$profile"; then
      if ! bound 30 colima stop "$profile" --force; then
        print -r -- 'ERROR: bounded Colima stop and forced stop failed; operator recovery required.'
        result=1
      fi
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
if [[ $(uname -s) == Darwin ]]; then
  file_mode=$(/usr/bin/stat -f '%Lp' "$env_file")
  file_owner=$(/usr/bin/stat -f '%u' "$env_file")
else
  file_mode=$(/usr/bin/stat -c '%a' "$env_file")
  file_owner=$(/usr/bin/stat -c '%u' "$env_file")
fi
if [[ "$file_mode" != 600 ]] || \
   [[ "$file_owner" != $(id -u) && "$file_owner" != 0 ]]; then
  print -r -- 'Env file must be chmod 600 and owned by the runner user (or root).'
  exit 78
fi
[[ -r "$env_file" && -f "$checkout/fetcher/Dockerfile" ]] || exit 78
# This dedicated profile must be stopped between runs; do not borrow a live VM.
profile_status=0
bound 15 colima status "$profile" >/dev/null 2>&1 || profile_status=$?
if (( profile_status == 0 )); then
  print -r -- 'Dedicated profile is already running; refusing to take ownership. Investigate and stop it before retrying.'
  exit 75
fi
(( profile_status == 1 )) || exit "$profile_status"
vm_owned=1
bound 600 colima start "$profile" --cpu 2 --memory 2 --disk 10 --activate=false || exit $?
cd "$checkout/fetcher"
# Hash only build inputs. Tests, logs, timestamps and node_modules do not trigger rebuilds.
fingerprint=$({ shasum -a 256 Dockerfile package.json package-lock.json entrypoint.sh .dockerignore; \
  find src -type f -print | LC_ALL=C sort | while IFS= read -r file; do shasum -a 256 "$file"; done; } | shasum -a 256 | awk '{print $1}')
current=$(bound 30 docker image inspect --format '{{ index .Config.Labels "org.shimizutechnology.source-sha256" }}' "$image" 2>/dev/null || true)
if [[ "$current" != "$fingerprint" ]]; then
  bound "${MO_FETCHER_BUILD_SECONDS:-900}" docker build --platform linux/arm64 --label org.shimizutechnology.project=mo-asjjf-fetcher --label "org.shimizutechnology.source-sha256=$fingerprint" -t "$image" . || exit $?
  # This socket belongs exclusively to this project. Never prune other profiles.
  bound 30 docker image prune -f --filter label=org.shimizutechnology.project=mo-asjjf-fetcher || exit $?
  bound 30 docker builder prune -f || exit $?
fi
set +e
bound "$(( run_seconds + 60 ))" docker run --rm --init --name "$container" --platform linux/arm64 --memory 1400m --pids-limit 512 \
  --stop-timeout 10 --env-file "$env_file" --entrypoint /usr/bin/timeout "$image" \
  --signal=TERM --kill-after=10s "$(( run_seconds + 30 ))s" /bin/sh /app/entrypoint.sh
result=$?
set -e
if (( result == 2 )); then
  print -r -- "$(date -u +%FT%TZ) challenged" > "$breaker"
fi
exit "$result"
