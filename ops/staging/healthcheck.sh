#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
load_staging_secrets
validate_staging_storage_configuration

curl --fail --silent --show-error \
  --connect-timeout 5 \
  --max-time 15 \
  "http://${STAGING_BIND_ADDRESS}:${STAGING_PORT}/health"

compose ps --status running --services | grep -qx worker
