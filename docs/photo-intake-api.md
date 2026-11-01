# Photo intake API (D4)

Contract for the admin client. All paths below are relative to `/api/v1`, require an authenticated **admin or staff** user, and scope every record to the event. Public gallery routes retain their existing shape. Errors use `{error:string}` or `{errors:string[]}`; invalid input is 422, missing event/record 404, missing authentication 401, insufficient role 403.

## Albums and settings

- `GET /admin/events/:event_id/gallery-albums` → `{albums:[{id,name,sort_order,count,cover_url}],settings:{timezone,hold_flagged}}`.
- `POST` same path, `{name}` → 201 `{album:{id,name,sort_order,count,cover_url}}`.
- `PATCH .../gallery-albums/:id`, `{name?,sort_order?}` → `{album:{...}}`. Rename atomically updates category strings; duplicate names are rejected. Reorder changes public category ordering (images retain their own order). Count includes hidden/processing images; cover is the first active ready image with an available thumbnail.
- `PATCH .../gallery-albums/settings`, `{timezone?,hold_flagged?}` → `{settings:{timezone,hold_flagged}}`. Timezone must be an IANA identifier (e.g. `Pacific/Guam`, the explicit default). `hold_flagged` defaults false and affects subsequent review/import work, not already reviewed images. Import choices are snapshots.

Albums are first-class records, including empty albums. Existing category strings are preserved/backfilled; assigning a category through old APIs creates the corresponding album. No album delete is exposed. Public category JSON remains `{name,count}` and follows album sort order, followed by preset suggestions.

## Images (existing APIs, additive fields)

`GET /admin/events/:event_id/gallery-images` retains pagination, `category`, `batch_id`, `status`, and response shape. Add `q` (case-insensitive literal filename substring, max 200 characters), `hidden=1` (inactive only), `needs_review=1` (nonempty flags and no `reviewed_at`). Filters combine with AND. Each image adds:

- `review_flags:string[]`: `low_sharpness`, `dark`, `overexposed`, `exact_duplicate`, `near_duplicate`.
- `reviewed_at:string|null` (UTC ISO timestamp), `captured_at:string|null` (UTC ISO timestamp), `capture_source:"exif"|"zip_mtime"|null`, `proposed_category:string|null`.

`PATCH .../gallery-images/bulk_update`, `{ids:number[],active?:boolean,category?:string|null,approve_review?:true}` retains `{updated:number}`. Approval sets `reviewed_at` and publishes unless `active:false` is explicitly supplied. Flags remain as provenance. Existing hide/show/move and `DELETE .../bulk_destroy` `{ids}` → `{deleted:number}` remain. Bulk selection is event-scoped; empty selections/unsupported updates are 422.

## ZIP imports

- `GET /admin/events/:event_id/gallery-imports` → `{imports:[{id,status,filename,total_entries,processed_entries,imported_count,skipped_count,errors:[],album_type,category,timezone,hold_flagged,created_at,completed_at}]}`; latest 25, statuses `queued|processing|completed|failed`. `errors` contains bounded `{entry,message}` records. `processed_entries` counts completed archive entries, including skipped metadata/nonimages; imported/skipped counts count files. Counters survive retries. Completed may include skipped invalid images; unsafe archives fail.
- `POST .../gallery-imports/prepare_direct_upload`, `{filename,byte_size,checksum}` → `{signed_id,direct_upload:{url,headers}}` (same upload shape as images). Browser streams a ZIP directly to the configured Active Storage service. ZIP extension required; checksum is base64 MD5; size 1–4 GiB inclusive. The signed blob is bound to event and preparer. No multipart archive proxy endpoint.
- `POST .../gallery-imports`, `{signed_id,album_type,category?,timezone?,hold_flagged?}` → 202 `{import:{...}}`; retry with same blob returns 200 and original import, ignoring changed choices. `album_type` is `Podium` or `Tournament`. Category defaults to album_type. Timezone/default hold setting comes from event settings. Staff should explicitly choose the event timezone before import. Enqueue is safe to repeat, including crash recovery; workers serialize per event. Reuploading identical photos skips SHA-256 duplicates within the event and adds an `exact_duplicate` flag to the retained image. Different events remain independent.

Limits: compressed archive 4 GiB, 10,000 entries, individual extracted file 50 MiB (or lower configured image limit), total extracted bytes 8 GiB, per-file and archive compression ratio 100:1. Reject encryption, unsupported compression, absolute/drive/backslash/traversal paths, symlinks/special files, duplicate paths, corrupt headers/CRC/size discrepancies. Ignore directories, macOS metadata and nonimage files; supported signatures are JPEG, PNG, WebP, HEIC/HEIF (native libheif required). Extension/MIME alone never authorize an image. Images have at most 60 million pixels, one frame/page. Decode failures are skipped with an error, never published.

Worker resources: stream archive download in chunks to a size-checked private temporary file; inspect the central directory before processing; stream one entry at a time into a size-checked temporary file and then storage. Maximum temporary disk is 4 GiB + 50 MiB per executing importer, without extracting paths. Memory holds bounded ZIP metadata, IO chunks, and a review thumbnail (256px); native decoding is bounded by the pixel limit. Run a single import worker/concurrency initially on the existing dedicated Solid Queue worker; no web-process extraction. ZIP64 supported. Archive blobs are detached/purged after terminal processing; failed blob uploads use the existing two-day unattached cleanup. No local filesystem source paths or public archive URLs are returned.

## Timestamps and proposals

EXIF `DateTimeOriginal` is interpreted as wall-clock time in the chosen IANA event timezone; camera/server timezone and EXIF offsets do not override staff's choice. Only ZIP entry mtime is a fallback when EXIF is absent/invalid. Invalid/nonexistent/ambiguous DST local times produce no captured timestamp (no guessed offset); fallback may still resolve a valid ZIP time. No upload/created/modified-EXIF timestamp is substituted.

- `GET /admin/events/:event_id/gallery-day-proposals?album_type=Podium` → `{proposals:[{category,image_ids:number[],date:"YYYY-MM-DD"}],unassigned_count}`. Dates derive from captured timestamps in each image's captured timezone; sorted distinct dates map to `Podium Day 1`, `Podium Day 2`, etc. (or Tournament). Unassigned counts images of that album_type lacking captured_at. Manually moved images cease to be candidates. `proposed_category` is computed from these same current proposals, never silently applied.
- `POST` same path, `{album_type:"Podium",proposals:[{category,image_ids:number[]}]}` → `{updated:number}`. `album_type` may also be a query parameter. Staff may confirm a nonempty subset, but every category/image pair must match the currently derived proposals. Duplicate IDs, foreign/stale IDs, arbitrary labels and empty proposals are rejected atomically with 422. Confirmation assigns category strings/albums and clears proposals for moved images. No category changes happen merely from uploading/reviewing.

## Review policy

The asynchronous review worker uses a bounded grayscale thumbnail: Laplacian variance < 35 → low_sharpness; > 80% pixels below 30 → dark; > 80% above 245 → overexposed. A 64-bit difference hash with Hamming distance ≤ 5 against event peers → near_duplicate (exact content hashes handled separately). These are advisory deterministic heuristics. Review never claims photographic quality certainty. Default is publish after successful variant generation; with hold_flagged enabled, flagged images are inactive until staff approval. Review/processing retries do not undo explicit staff approval or hide decisions. Existing single-image uploads also receive review; their capture source is EXIF only.

## Scope and acceptance evidence

Orientation: 2026-11-02, base `24f823e`; sources `2027-PLATFORM-PLAN.md` D4, `EVENT-GALLERY-CATEGORIES.md`, upload/worker runbooks, Brain Dump `work/shimizu-tech/marianas-open/STATUS.md`, existing image APIs. Staff intake/recovery and public visibility/order are the affected journeys. Backend agent QA uses isolated fixture HTTP requests/jobs and test storage/database only; parent owns integrated browser/mobile QA. Required automated cases: role/event isolation, compatibility, album lifecycle, malicious ZIP fixtures, resource limits, image sniff/decode, timezone boundaries, proposal validation, deterministic flags, deduplication and repeated jobs/completions. No production/S3 access.
