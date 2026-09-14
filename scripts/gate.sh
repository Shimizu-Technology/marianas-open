#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
base_ref="${GATE_BASE_REF:-origin/staging}"
nvm_root="${NVM_DIR:-$HOME/.nvm}"

if [[ -s "$nvm_root/nvm.sh" ]]; then
  # shellcheck source=/dev/null
  source "$nvm_root/nvm.sh"
  nvm use --silent "$(<"$repo_root/.nvmrc")"
fi

run_ruby() {
  if command -v rbenv >/dev/null 2>&1 && [[ -f "$repo_root/api/.ruby-version" ]]; then
    RBENV_VERSION="$(<"$repo_root/api/.ruby-version")" rbenv exec "$@"
  else
    "$@"
  fi
}

echo "== API tests =="
(
  cd "$repo_root/api"
  run_ruby ruby bin/rails db:test:prepare
  run_ruby ruby bin/rails test
)

echo "== API style and security =="
(
  cd "$repo_root/api"
  ruby_files=()
  while IFS= read -r file; do
    case "$file" in
      api/*.rb|api/*.rake|api/Gemfile)
        ruby_files+=("${file#api/}")
        ;;
    esac
  done < <(
    {
      git -C "$repo_root" diff --diff-filter=ACMR --name-only "$base_ref"
      git -C "$repo_root" ls-files --others --exclude-standard
    } | sort -u
  )

  if (( ${#ruby_files[@]} > 0 )); then
    run_ruby ruby bin/rubocop --force-exclusion "${ruby_files[@]}"
  else
    echo "No changed Ruby files to lint."
  fi

  run_ruby ruby bin/bundler-audit check --update

  brakeman_report="$(mktemp -t marianas-open-brakeman.XXXXXX)"
  trap 'rm -f "$brakeman_report"' EXIT
  run_ruby bundle exec brakeman --quiet --no-pager --format json --output "$brakeman_report" \
    --no-exit-on-warn --no-exit-on-error
  run_ruby ruby -rjson -e '
    report = JSON.parse(File.read(ARGV.fetch(0)))
    errors = report.dig("scan_info", "errors") || []
    warning_count = (report["warnings"] || []).length
    errors.each { |error| warn "Brakeman scan error: #{error}" }
    warn "Brakeman warnings: #{warning_count} (inherited baseline: 8)"
    exit 1 if errors.any? || warning_count > 8
  ' "$brakeman_report"
)

echo "== Web lint and build =="
(
  cd "$repo_root/web"
  npm ci
  npm audit --omit=dev --audit-level=high
  npm run lint
  npm run build:no-translate
)

echo "Gate passed."
