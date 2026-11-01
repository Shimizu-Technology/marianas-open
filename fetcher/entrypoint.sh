#!/bin/sh
set -eu
Xvfb :99 -screen 0 1280x900x24 -nolisten tcp &
xvfb_pid=$!
node_pid=
cleanup() {
  if [ -n "$node_pid" ]; then kill -TERM "$node_pid" 2>/dev/null || true; wait "$node_pid" 2>/dev/null || true; fi
  kill "$xvfb_pid" 2>/dev/null || true
  wait "$xvfb_pid" 2>/dev/null || true
}
trap cleanup EXIT
trap 'exit 143' TERM
trap 'exit 130' INT
# Wait for the X socket, failing promptly if Xvfb cannot start.
i=0
while [ ! -S /tmp/.X11-unix/X99 ]; do
  kill -0 "$xvfb_pid"
  i=$((i + 1))
  [ "$i" -lt 50 ] || exit 1
  sleep 0.1
done
node /app/src/index.js &
node_pid=$!
set +e
wait "$node_pid"
status=$?
node_pid=
exit "$status"
