#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

ACTIVE_STORAGE_SERVICE=local
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
validate_staging_storage_configuration

ACTIVE_STORAGE_SERVICE=amazon
if validate_staging_storage_configuration 2>/dev/null; then
  printf '%s\n' "Expected missing S3 credentials to block staging." >&2
  exit 1
fi

AWS_ACCESS_KEY_ID=AKIAVALIDATION
AWS_SECRET_ACCESS_KEY=validation-only
validate_staging_storage_configuration

ACTIVE_STORAGE_SERVICE=unrecognized
if validate_staging_storage_configuration 2>/dev/null; then
  printf '%s\n' "Expected an unsupported storage service to be rejected." >&2
  exit 1
fi
