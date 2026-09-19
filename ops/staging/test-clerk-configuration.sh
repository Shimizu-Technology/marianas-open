#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

assert_rejected() {
  if validate_staging_clerk_configuration 2>/dev/null; then
    printf '%s\n' "Expected invalid Clerk configuration to be rejected." >&2
    exit 1
  fi
}

CLERK_ISSUER=""
CLERK_JWKS_URL=""
assert_rejected

CLERK_ISSUER="https://your-clerk-frontend-api"
CLERK_JWKS_URL="${CLERK_ISSUER}/.well-known/jwks.json"
assert_rejected

CLERK_ISSUER="http://example.clerk.accounts.dev"
CLERK_JWKS_URL="${CLERK_ISSUER}/.well-known/jwks.json"
assert_rejected

CLERK_ISSUER="https://example.clerk.accounts.dev"
CLERK_JWKS_URL="https://different.clerk.accounts.dev/.well-known/jwks.json"
assert_rejected

CLERK_JWKS_URL="${CLERK_ISSUER}/.well-known/jwks.json"
validate_staging_clerk_configuration
