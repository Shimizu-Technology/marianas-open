#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_PORT="${API_PORT:-3000}"
WEB_PORT="${WEB_PORT:-5173}"
WEB_HOST="${WEB_HOST:-localhost}"
API_URL="${VITE_API_URL:-http://localhost:${API_PORT}}"

if [ -f "$ROOT_DIR/api/.env" ]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/api/.env"
  set +a
fi

export ACTIVE_STORAGE_SERVICE="${ACTIVE_STORAGE_SERVICE:-amazon}"
export ACTIVE_JOB_QUEUE_ADAPTER="${ACTIVE_JOB_QUEUE_ADAPTER:-solid_queue}"
export JOB_THREADS="${JOB_THREADS:-1}"
export JOB_CONCURRENCY="${JOB_CONCURRENCY:-1}"
export RAILS_MAX_THREADS="${RAILS_MAX_THREADS:-3}"
export PORT="$API_PORT"
export VITE_API_URL="$API_URL"

required_env=(AWS_ACCESS_KEY_ID AWS_SECRET_ACCESS_KEY AWS_REGION AWS_S3_BUCKET)
missing_env=()
for key in "${required_env[@]}"; do
  if [ -z "${!key:-}" ]; then
    missing_env+=("$key")
  fi
done

if [ "${#missing_env[@]}" -gt 0 ]; then
  echo "Missing S3 environment variables in api/.env or shell: ${missing_env[*]}" >&2
  echo "Production-like upload testing needs real S3 credentials and a bucket." >&2
  exit 1
fi

check_port() {
  local port="$1"
  local label="$2"
  if lsof -iTCP:"$port" -sTCP:LISTEN -n -P >/dev/null 2>&1; then
    echo "$label port $port is already in use. Stop that server or set ${label}_PORT." >&2
    exit 1
  fi
}

check_port "$API_PORT" "API"
check_port "$WEB_PORT" "WEB"

pids=()
cleanup() {
  if [ "${#pids[@]}" -gt 0 ]; then
    for pid in "${pids[@]}"; do
      pkill -TERM -P "$pid" >/dev/null 2>&1 || true
      kill "$pid" >/dev/null 2>&1 || true
    done
  fi
}
trap cleanup EXIT INT TERM

start_process() {
  local name="$1"
  shift
  echo "Starting $name..."
  (cd "$ROOT_DIR" && exec "$@") &
  pids+=("$!")
}

cors_warning=""
if command -v aws >/dev/null 2>&1; then
  cors_json="$(aws s3api get-bucket-cors --bucket "$AWS_S3_BUCKET" --output json 2>/dev/null || true)"
  if [ -n "$cors_json" ]; then
    if ! grep -q "http://localhost:${WEB_PORT}" <<<"$cors_json" || ! grep -q "http://127.0.0.1:${WEB_PORT}" <<<"$cors_json"; then
      cors_warning="WARNING: S3 bucket CORS does not appear to include both local origins. Direct uploads may fall back to the Rails API."
    fi
  else
    cors_warning="WARNING: Could not read S3 bucket CORS with the AWS CLI. Direct uploads need local origins allowed."
  fi
fi

cat <<EOF
Production-like local upload stack
  API:     http://localhost:${API_PORT}  (${ACTIVE_STORAGE_SERVICE} storage, ${ACTIVE_JOB_QUEUE_ADAPTER} jobs)
  Worker:  Solid Queue (${JOB_THREADS} thread(s), ${JOB_CONCURRENCY} process(es))
  Web:     http://${WEB_HOST}:${WEB_PORT} -> ${VITE_API_URL}

For direct S3 uploads from local, the S3 bucket CORS must allow:
  http://localhost:${WEB_PORT}
  http://127.0.0.1:${WEB_PORT}
${cors_warning:+
$cors_warning}
EOF

start_process "Rails API" bash -c "cd api && exec bundle exec rails server"
start_process "Solid Queue worker" bash -c "cd api && exec bundle exec bin/jobs"
start_process "Vite web" bash -c "cd web && exec npm run dev -- --host ${WEB_HOST} --port ${WEB_PORT}"

while true; do
  for pid in "${pids[@]}"; do
    if ! kill -0 "$pid" >/dev/null 2>&1; then
      wait "$pid"
      exit $?
    fi
  done
  sleep 1
done
