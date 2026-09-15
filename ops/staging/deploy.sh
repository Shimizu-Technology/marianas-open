#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

target_sha="${1:-}"
if [[ ! "${target_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  printf '%s\n' "usage: $0 <40-character-git-sha>" >&2
  exit 64
fi

load_staging_secrets
validate_staging_provider_credentials

state_dir="${SERVICE_DIR}/.staging-state"
mkdir -p "${state_dir}"
lock_dir="${state_dir}/deploy.lock"
if ! mkdir "${lock_dir}" 2>/dev/null; then
  printf '%s\n' "A staging deployment is already running." >&2
  exit 75
fi
trap 'rmdir "${lock_dir}"' EXIT

previous_sha=""
if [[ -f "${state_dir}/deployed-sha" ]]; then
  previous_sha="$(tr -d '[:space:]' < "${state_dir}/deployed-sha")"
fi

export IMAGE_TAG="${target_sha}"
if [[ "${SKIP_IMAGE_PULL:-0}" != "1" ]]; then
  compose pull api worker web
fi
compose up -d --wait db

"${SCRIPT_DIR}/backup.sh"

compose run --rm api bundle exec rails db:prepare
compose up -d --remove-orphans

healthy=0
for _ in $(seq 1 "${DEPLOY_HEALTH_ATTEMPTS:-30}"); do
  if "${SCRIPT_DIR}/healthcheck.sh" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep "${DEPLOY_HEALTH_INTERVAL:-4}"
done

if [[ "${healthy}" == "1" ]]; then
  printf '%s\n' "${target_sha}" > "${state_dir}/deployed-sha"
  printf '%s\n' "Staging deployed ${target_sha}."
  exit 0
fi

printf '%s\n' "Health check failed for ${target_sha}." >&2
if [[ "${previous_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  printf '%s\n' "Rolling application containers back to ${previous_sha}." >&2
  export IMAGE_TAG="${previous_sha}"
  compose up -d --remove-orphans
  for _ in $(seq 1 "${ROLLBACK_HEALTH_ATTEMPTS:-30}"); do
    if "${SCRIPT_DIR}/healthcheck.sh" >/dev/null 2>&1; then
      printf '%s\n' "Rollback to ${previous_sha} is healthy." >&2
      break
    fi
    sleep "${ROLLBACK_HEALTH_INTERVAL:-4}"
  done
fi
exit 1
