# Marianas Open Tier-1 Asset Uploader

Automates Tier-1 asset upload (logos/banners/covers) through the Admin Site Images API and updates the remap CSV in-place.

## Script

`scripts/upload-tier1-site-images.mjs`

## Prerequisites

- Node.js **18 or newer** (script uses native `fetch` and `FormData`)

## Inputs

- `--base` API base URL (default: `http://127.0.0.1:3100`; trailing slash is auto-trimmed)
  - env fallback: `API_BASE_URL`
- `--token` Admin bearer token (required for real upload)
  - env fallback: `ADMIN_BEARER_TOKEN`
- `--csv` Remap sheet CSV path
- `--assets` Local asset folder path (must exist; script exits fast if invalid)
- `--dry-run` Marks rows as `ready-upload` without API writes
- `--activate` Sets uploaded `site_image.active=true` immediately (default is `false`)
- `--timeout-ms` Per-request timeout in milliseconds (default: `45000`)
  - env fallback: `UPLOADER_TIMEOUT_MS`

## CSV columns expected

- `source_url`
- `local_file`
- `section`
- `target_field`
- `new_s3_url`
- `status`
- `notes`

## Dry run

```bash
node scripts/upload-tier1-site-images.mjs \
  --base http://127.0.0.1:3100 \
  --csv /path/to/marianas-open-tier1-url-remap-sheet-2026-03-11.csv \
  --assets /path/to/core-download-2026-03-11 \
  --dry-run
```

## Real upload

Recommended (safer; avoids exposing token in process list):

```bash
export ADMIN_BEARER_TOKEN=<ADMIN_BEARER_TOKEN>
node scripts/upload-tier1-site-images.mjs \
  --base https://<your-api-host> \
  --csv /path/to/marianas-open-tier1-url-remap-sheet-2026-03-11.csv \
  --assets /path/to/core-download-2026-03-11
```

Alternative:

```bash
node scripts/upload-tier1-site-images.mjs \
  --base https://<your-api-host> \
  --token <ADMIN_BEARER_TOKEN> \
  --csv /path/to/marianas-open-tier1-url-remap-sheet-2026-03-11.csv \
  --assets /path/to/core-download-2026-03-11
```

## Behavior

- Skips rows already marked `uploaded` or `applied`
- Creates a `site_image` record (default `active=false`), uploads corresponding local file
- Writes resulting hosted URL to `new_s3_url`
- Updates row status (`uploaded`, `upload-error`, `missing-local`)
- If upload fails after create, script attempts cleanup delete and logs cleanup failures explicitly

## Safety notes

- Use dry-run first to validate local file coverage
- Keep a backup copy of the CSV before real upload
- After upload, apply `new_s3_url` values to content records and mark rows `applied`
- Activation step (required for visibility):
  - Option A: include `--activate` on initial real upload run
  - Option B: run a separate activation pass/API update for uploaded rows after content mapping
