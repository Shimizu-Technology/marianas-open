#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="${MARIANAS_STAGING_SERVICE_DIR:-$(cd "${SCRIPT_DIR}/../.." && pwd)}"
COMPOSE_FILE="${SERVICE_DIR}/ops/staging/compose.yml"
RUNTIME_ENV_FILE="${MARIANAS_STAGING_RUNTIME_ENV:-${SERVICE_DIR}/ops/staging/runtime.env}"
KEYCHAIN_ACCOUNT="${MARIANAS_STAGING_KEYCHAIN_ACCOUNT:-marianas-open-staging}"

if [[ -f "${RUNTIME_ENV_FILE}" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "${RUNTIME_ENV_FILE}"
  set +a
fi

export DOCKER_CONTEXT="${DOCKER_CONTEXT:-colima-marianas-open-staging}"
export STAGING_BIND_ADDRESS="${STAGING_BIND_ADDRESS:-127.0.0.1}"
export STAGING_PORT="${STAGING_PORT:-8788}"

keychain_secret() {
  security find-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "$1" -w
}
load_staging_secrets() {
  export POSTGRES_PASSWORD="$(keychain_secret marianas-open-staging-postgres)"
  export SECRET_KEY_BASE="$(keychain_secret marianas-open-staging-secret-key-base)"
  export CLERK_SECRET_KEY="$(keychain_secret marianas-open-staging-clerk-secret-key)"
}

compose() {
  docker --context "${DOCKER_CONTEXT}" compose -f "${COMPOSE_FILE}" "$@"
}
