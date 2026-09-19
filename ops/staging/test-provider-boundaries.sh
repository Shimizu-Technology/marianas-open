#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

STRIPE_API_KEY=""
EASYPOST_API_KEY=""
validate_staging_provider_credentials

COMMERCE_POC_MODE=true
validate_staging_provider_credentials
STRIPE_API_KEY="rk_test_validation"
if validate_staging_provider_credentials 2>/dev/null; then
  printf '%s\n' "Expected provider keys to be rejected while the staging preview is simulated." >&2
  exit 1
fi
COMMERCE_POC_MODE=false

COMMERCE_POC_MODE=1
if validate_staging_provider_credentials 2>/dev/null; then
  printf '%s\n' "Expected provider keys to be rejected for numeric POC mode too." >&2
  exit 1
fi
COMMERCE_POC_MODE=false

STRIPE_API_KEY="rk_test_validation"
EASYPOST_API_KEY="EZTKvalidation"
validate_staging_provider_credentials

STRIPE_API_KEY="rk_live_validation"
if validate_staging_provider_credentials 2>/dev/null; then
  printf '%s\n' "Expected a live Stripe key to be rejected." >&2
  exit 1
fi

STRIPE_API_KEY="rk_test_validation"
EASYPOST_API_KEY="EZAKvalidation"
if validate_staging_provider_credentials 2>/dev/null; then
  printf '%s\n' "Expected a production EasyPost key to be rejected." >&2
  exit 1
fi
