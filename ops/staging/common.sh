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

optional_keychain_secret() {
  security find-generic-password -a "${KEYCHAIN_ACCOUNT}" -s "$1" -w 2>/dev/null || true
}

load_staging_secrets() {
  POSTGRES_PASSWORD="$(keychain_secret marianas-open-staging-postgres)"
  SECRET_KEY_BASE="$(keychain_secret marianas-open-staging-secret-key-base)"
  CLERK_SECRET_KEY="$(keychain_secret marianas-open-staging-clerk-secret-key)"
  EASYPOST_API_KEY="$(optional_keychain_secret marianas-open-staging-easypost-api-key)"
  EASYPOST_WEBHOOK_SECRET="$(optional_keychain_secret marianas-open-staging-easypost-webhook-secret)"
  STRIPE_API_KEY="$(optional_keychain_secret marianas-open-staging-stripe-api-key)"
  STRIPE_WEBHOOK_SECRET="$(optional_keychain_secret marianas-open-staging-stripe-webhook-secret)"
  export POSTGRES_PASSWORD SECRET_KEY_BASE CLERK_SECRET_KEY EASYPOST_API_KEY EASYPOST_WEBHOOK_SECRET STRIPE_API_KEY STRIPE_WEBHOOK_SECRET
}

validate_staging_clerk_configuration() {
  local issuer="${CLERK_ISSUER:-}"
  local jwks_url="${CLERK_JWKS_URL:-}"

  if [[ ! "${issuer}" =~ ^https://[A-Za-z0-9.-]+$ || "${issuer}" == *your-clerk-frontend-api* || "${jwks_url}" != "${issuer}/.well-known/jwks.json" ]]; then
    printf '%s\n' "Staging requires a real HTTPS Clerk issuer and its matching JWKS URL." >&2
    return 1
  fi
}

validate_staging_provider_credentials() {
  local poc_mode
  poc_mode="$(printf '%s' "${COMMERCE_POC_MODE:-false}" | sed 's/^[[:space:]]*//; s/[[:space:]]*$//' | tr '[:upper:]' '[:lower:]')"
  case "${poc_mode}" in
    1|true|yes|on)
      if [[ -n "${STRIPE_API_KEY:-}" || -n "${EASYPOST_API_KEY:-}" ]]; then
        printf '%s\n' "Refusing to mix simulated staging commerce with provider keys." >&2
        return 1
      fi
      ;;
  esac

  if [[ -n "${STRIPE_API_KEY:-}" && "${STRIPE_API_KEY}" != *_test_* ]]; then
    printf '%s\n' "Refusing to deploy staging with a non-test Stripe key." >&2
    return 1
  fi

  if [[ -n "${EASYPOST_API_KEY:-}" && "${EASYPOST_API_KEY}" != EZTK* ]]; then
    printf '%s\n' "Refusing to deploy staging with a non-test EasyPost key." >&2
    return 1
  fi
}

compose() {
  docker --context "${DOCKER_CONTEXT}" compose -f "${COMPOSE_FILE}" "$@"
}
