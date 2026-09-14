#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=common.sh
source "${SCRIPT_DIR}/common.sh"

state_dir="${SERVICE_DIR}/.staging-state"
mkdir -p "${state_dir}"

workflow_url="https://api.github.com/repos/Shimizu-Technology/marianas-open/actions/workflows/ci.yml/runs?branch=staging&status=success&event=push&per_page=1"
latest_sha="$(curl --fail --silent --show-error \
  --connect-timeout 10 \
  --max-time 30 \
  -H 'Accept: application/vnd.github+json' \
  -H 'X-GitHub-Api-Version: 2022-11-28' \
  "${workflow_url}" | ruby -rjson -e 'payload = JSON.parse(STDIN.read); puts(payload.fetch("workflow_runs", []).first&.fetch("head_sha", ""))')"

if [[ ! "${latest_sha}" =~ ^[0-9a-f]{40}$ ]]; then
  exit 0
fi
deployed_sha=""
if [[ -f "${state_dir}/deployed-sha" ]]; then
  deployed_sha="$(tr -d '[:space:]' < "${state_dir}/deployed-sha")"
fi

if [[ "${latest_sha}" != "${deployed_sha}" ]]; then
  if ! git -C "${SERVICE_DIR}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    printf '%s\n' "The staging service directory is not a Git checkout." >&2
    exit 1
  fi
  if [[ -n "$(git -C "${SERVICE_DIR}" status --porcelain --untracked-files=no)" ]]; then
    printf '%s\n' "Tracked deployment files have local changes; refusing to overwrite them." >&2
    exit 1
  fi
  git -C "${SERVICE_DIR}" fetch --quiet origin staging
  git -C "${SERVICE_DIR}" cat-file -e "${latest_sha}^{commit}"
  git -C "${SERVICE_DIR}" checkout --quiet --detach "${latest_sha}"
  exec "${SERVICE_DIR}/ops/staging/deploy.sh" "${latest_sha}"
fi
