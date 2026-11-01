# Event Photos

Use **Admin → Photos**, then choose an event. The event edit form still works, but Photos keeps the upload album, albums and review tools together.

## Add photos from a phone or computer

1. Choose **Upload to album**. To create an album, open **Manage albums** on a phone, enter its name and select **Create album**. Empty albums are supported.
2. Choose photos. There is no 100-file selection cap. The client saves files on this device before processing them, then sends a few at a time through the existing direct-upload API. Large JPEGs are optimized in the browser; manual resizing is unnecessary. Originals must be at most 50 MiB each.
3. Watch the upload panel. Failed transfers can be retried. Reloading restores the same signed-in user’s queue on this browser. Completing an already uploaded file reuses its signed blob rather than creating another gallery image.

A locked phone may pause browser work; this is not an operating-system background upload service. Return to Photos to continue. Do not clear site data while uploads are pending. Browser storage must have room for saved files; a quota error stops work and explains how to recover. Signing in on a different device does not copy the local queue. Web Locks prevent two tabs from processing the same account’s queue concurrently; use a current browser with IndexedDB and Web Locks enabled.

Captions are optional and public. Camera filenames stay in the staff photo library and search; they are not public captions.

## Import a ZIP

Download the ZIP from gigafile to the device first. Choose the upload album, day-album type, event timezone and review setting, then choose the ZIP. URLs are not fetched by the server.

The maximum compressed archive is **4 GiB**. The browser calculates the checksum in 4 MiB chunks, saves the file and choices in IndexedDB, and sends it directly to storage. It never sends a multi-gigabyte archive through a Rails multipart endpoint. An interrupted byte transfer restarts; after storage acknowledges it, the completion checkpoint is durable and retried without sending the bytes again. The local saved copy is removed once the server accepts the import.

After receipt, a dedicated worker checks the archive and processes one entry at a time. **Recent ZIP imports** shows checked, imported and skipped counts, plus bounded error notes. A completed import can contain skipped files. Unsafe archives fail with an error; any safely imported photos from a later entry failure remain available. Repeating the import does not duplicate exact file content within the same event. The archive is removed from storage at a terminal result; imported photos retain their own attachments.

Limits include 10,000 entries, 50 MiB per image, 8 GiB total expansion, a 100:1 compression ratio, and 60 million pixels per image. Paths, ZIP headers, CRCs, sizes, compression methods and image signatures are checked. Symlinks, path traversal, encrypted archives, malformed data and multi-frame images are rejected. ZIP64 is supported. Native HEIC/HEIF decoding requires the worker’s libheif support. See [the API contract](photo-intake-api.md) for the exact validation rules.

## Suggest day albums

Set the venue’s timezone explicitly in **Review and date settings**; the initial default is `Pacific/Guam`. Choose Podium, Tournament, Opening Ceremony or a custom album type, then **Preview day albums**.

The worker reads EXIF `DateTimeOriginal`; a ZIP entry’s recorded modification time is the fallback. A standalone photo with no EXIF date has no timestamp fallback. Times with a recorded offset are converted to the event timezone; unqualified camera/ZIP times use the chosen timezone. Missing, invalid and out-of-event dates remain unassigned. The event’s start date is Day 1, so photos from the next date propose Day 2 even when no Day 1 photo was uploaded. Staff must confirm the listed photo assignments before albums change. A proposal becomes stale if another staff member moves those photos; preview again in that case.

## Review and organize

**Default: flagged photos publish** after image processing, and appear under **Needs review**. Checks suggest possible blur, very dark/overexposed images and exact/similar duplicates; people decide what to keep. They do not identify a wrongly named fighter card or reliably judge big-screen photos.

Staff can enable **Hold flagged photos until approved** for newly processed photos. Those photos remain hidden until approval. Approving a review hold releases it; manually hidden photos stay hidden until staff explicitly show them. Changing the setting does not silently republish earlier hidden photos.

Use filename search and album/hidden/review filters, then select a page of photos to move, approve, show, hide or delete. Hide and delete require confirmation; hiding can be reversed. Album arrows change the public album order. Renaming an album updates its photos together. The **Photo library** link jumps past upload tools on a phone.

Staff hiding from the public lightbox is a follow-up and is not included here.

## Release and operations

Deploy the migration and the same API/worker revision together. The migration adds albums and intake/review metadata while preserving existing category strings. Verify the dedicated Solid Queue worker is running, native image support passes, temporary disk is sufficient, and direct storage CORS allows the web origin. Start with one worker thread and one process; do not run ZIP extraction in Puma. No production data backfill or S3 test upload was performed for this change.

The worker needs temporary space for the compressed archive plus one extracted entry and a safety reserve. A 4 GiB archive needs more than 4 GiB of free temporary disk; a small Render worker may refuse it. Memory use includes native decoding up to the pixel limit, bounded directory metadata and a 256px review image. Use a suitably sized worker, smaller archives or lower configured limits rather than increasing concurrency. See [Render background jobs](render-background-jobs.md) and [the contract](photo-intake-api.md) for operational settings.

Local evidence uses isolated test databases/storage, component tests, fake IndexedDB and a development-only fixture harness at `web/qa/photos`. The harness has its own explicit Vite config, does not alter production auth, and is not a build entry. Clerk prevents real local admin sign-in. Browser screenshots at 390px/1440px do not establish physical iPhone keyboard, touch, lock or safe-area behavior; those remain operator checks.
