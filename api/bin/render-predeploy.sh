#!/usr/bin/env bash
set -o errexit
set -o pipefail

max_attempts="${DB_MIGRATE_MAX_ATTEMPTS:-12}"
sleep_seconds="${DB_MIGRATE_RETRY_SLEEP_SECONDS:-10}"
attempt=1

while true; do
  echo "Running database migrations (attempt ${attempt}/${max_attempts})..."
  log_file="$(mktemp)"

  if bundle exec rails db:migrate 2>&1 | tee "$log_file"; then
    rm -f "$log_file"
    exit 0
  fi

  if ! grep -q "ActiveRecord::ConcurrentMigrationError" "$log_file"; then
    rm -f "$log_file"
    exit 1
  fi

  rm -f "$log_file"

  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "Database migrations are still locked after ${max_attempts} attempts."
    exit 1
  fi

  echo "Another migration process is running. Retrying in ${sleep_seconds}s..."
  sleep "$sleep_seconds"
  attempt=$((attempt + 1))
done
