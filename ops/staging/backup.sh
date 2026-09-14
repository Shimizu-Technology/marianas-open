#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"
load_staging_secrets

BACKUP_DIR="${MARIANAS_STAGING_BACKUP_DIR:-${SERVICE_DIR}/backups}"
mkdir -p "${BACKUP_DIR}"

if ! compose ps --status running --services | grep -qx db; then
  exit 0
fi

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_path="${BACKUP_DIR}/marianas-open-staging-${timestamp}.sql.gz"

compose exec -T db pg_dump \
  --username marianas_open \
  --dbname marianas_open_staging \
  --no-owner \
  --no-privileges | gzip > "${backup_path}"

find "${BACKUP_DIR}" -type f -name 'marianas-open-staging-*.sql.gz' -mtime +14 -delete
printf '%s\n' "${backup_path}"
