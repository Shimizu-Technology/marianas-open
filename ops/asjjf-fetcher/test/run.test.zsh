#!/bin/zsh
set -eu
setopt PIPE_FAIL
repo=${0:A:h:h:h:h}
runner="$repo/ops/asjjf-fetcher/run.sh"
scratch=$(mktemp -d)
job=
cleanup() {
  local test_result=$?
  if (( test_result )); then
    print -u2 -- "FAIL ${CASE:-setup}, result=${result:-unset}"
    for logfile in "$scratch"/*/Library/Logs/mo-asjjf-fetcher/*.log(N); do cat "$logfile" >&2; done
  fi
  if [[ -n "$job" ]]; then kill -TERM "$job" 2>/dev/null || true; wait "$job" 2>/dev/null || true; fi
  rm -rf "$scratch"
}
trap cleanup EXIT
mkdir -p "$scratch/bin"
cat > "$scratch/bin/colima" <<'STUB'
#!/bin/zsh
print -r -- "colima $*" >> "$MO_FETCHER_STATE_ROOT/calls"
[[ $1 != status ]] || exit 1
if [[ $1 == start && $CASE == term-start ]]; then
  print ready > "$MO_FETCHER_STATE_ROOT/ready"
  while true; do sleep 1; done
fi
if [[ $1 == stop && $CASE == force-stop && $* != *--force* ]]; then exit 1; fi
STUB
cat > "$scratch/bin/docker" <<'STUB'
#!/bin/zsh
print -r -- "docker $*" >> "$MO_FETCHER_STATE_ROOT/calls"
[[ $1 != image || $2 != inspect ]] || exit 1
if [[ $1 == build && ( $CASE == term-build || $CASE == hung-build ) || $1 == run && $CASE == term-run ]]; then
  print ready > "$MO_FETCHER_STATE_ROOT/ready"
  # Ignore TERM for the timeout case to exercise KILL escalation.
  [[ $CASE != hung-build ]] || trap '' TERM
  while true; do sleep 1; done
fi
STUB
chmod +x "$scratch/bin/"*
export MO_FETCHER_PATH="$scratch/bin:$PATH" MO_FETCHER_CHECKOUT="$repo" MO_FETCHER_BUILD_SECONDS=0.2
for CASE in success term-start term-build term-run hung-build force-stop stale-lock live-lock; do
  export CASE MO_FETCHER_STATE_ROOT="$scratch/$CASE"
  mkdir -p "$MO_FETCHER_STATE_ROOT/.config/mo-asjjf-fetcher" "$MO_FETCHER_STATE_ROOT/Library/Logs/mo-asjjf-fetcher"
  config="$MO_FETCHER_STATE_ROOT/.config/mo-asjjf-fetcher"
  print 'MAX_RUN_MINUTES=0.01' > "$config/env"
  chmod 600 "$config/env"
  oldlog="$MO_FETCHER_STATE_ROOT/Library/Logs/mo-asjjf-fetcher/old.log"
  touch -t 202001010000 "$oldlog"
  if [[ $CASE == stale-lock || $CASE == live-lock ]]; then
    mkdir "$config/run.lock"
    if [[ $CASE == stale-lock ]]; then print 99999999 > "$config/run.lock/pid"; else print $$ > "$config/run.lock/pid"; fi
  fi
  /bin/zsh "$runner" &
  job=$!
  if [[ $CASE == term-* ]]; then
    for n in {1..200}; do [[ ! -f "$MO_FETCHER_STATE_ROOT/ready" ]] || break; sleep 0.05; done
    [[ -f "$MO_FETCHER_STATE_ROOT/ready" ]]
    kill -TERM "$job"
  fi
  result=0
  wait "$job" || result=$?
  job=
  case "$CASE" in
    term-*) [[ $result == 143 ]] ;;
    hung-build) [[ $result == 124 ]] ;;
    live-lock) [[ $result == 75 ]]; [[ -d "$config/run.lock" ]]; print 'PASS live-lock'; continue ;;
    *) [[ $result == 0 ]] ;;
  esac
  [[ ! -e "$config/run.lock" && ! -e "$oldlog" ]]
  calls=$(cat "$MO_FETCHER_STATE_ROOT/calls")
  [[ $calls == *'docker rm -f mo-asjjf-fetcher-'* ]]
  [[ $calls == *'colima stop mo-asjjf-fetcher'* ]]
  [[ $calls != *'context use'* ]]
  if [[ $CASE == success ]]; then
    [[ $calls == *'docker image prune -f --filter label=org.shimizutechnology.project=mo-asjjf-fetcher'* ]]
    [[ $calls == *'docker builder prune -f'* ]]
    [[ $calls == *'--stop-timeout 10'* && $calls == *'--entrypoint /usr/bin/timeout'* ]]
  fi
  if [[ $CASE == force-stop ]]; then [[ $calls == *'colima stop mo-asjjf-fetcher --force'* ]]; fi
  print -r -- "PASS $CASE"
done
# Independently prove the whole-job watchdog interrupts a group, including a child
# that ignores TERM, without waiting for a real multi-hour run.
result=0
/usr/bin/perl "$repo/ops/asjjf-fetcher/bounded.pl" 0.2 0.2 /bin/zsh -c 'trap "" TERM; sleep 60 & wait' || result=$?
[[ $result == 124 ]]
print 'PASS overall watchdog TERM/KILL'
