# D4 photo intake acceptance and QA

## Product brief

Source baseline: `main` at `24f823e493032b5d392051eb9b3096117c2ed98b`, November 2, 2026. The public site serves athletes and fans; staff manage event media. Carmen handles marketing, often from a phone. The supplied workflow and `docs/EVENT-GALLERY-CATEGORIES.md` describe the hidden album control, large ZIP deliveries, and lost browser upload queues. Brain Dump `work/shimizu-tech/marianas-open/STATUS.md` corroborates the gallery follow-up and media URL history. This task does not verify or change production data.

The Photos workspace uses the existing dark surfaces, gold actions, and typefaces. The primary task is choosing an event and album, then sending photos while retaining progress. Album choice stays next to upload controls. Saved outcomes and recoverable errors stay visible. Controls are at least 44px high, form text is 16px, and layout uses native scrolling. Progress changes immediately without decorative motion; reduced motion requires no separate interaction path.

## Required scenarios

Agent executes against synthetic fixtures and isolated test storage. Authenticated local browser administration is blocked by Clerk; component tests exercise the admin actions, and a fixture-only browser harness supplies responsive screenshots. Neither substitutes for a production login or a physical phone.

| ID | Starting point and actions | Expected visible and saved result | Coverage |
|---|---|---|---|
| D4-01 | Staff chooses an event in Photos; creates, renames and reorders albums | Empty albums persist; counts and covers render; public categories retain staff order | Component + API tests; 390/1440 browser |
| D4-02 | Queue >100 image files; interrupt and restore; retry failures | Files/metadata/checkpoints restore from IndexedDB for the same user; existing completion is reused | Fake IndexedDB + queue tests |
| D4-03 | Staff sends a ZIP and follows progress | Bounded upload and worker extraction; supported images enter the existing processing pipeline; counts/errors persist | ZIP/service/job tests + component upload tests |
| D4-04 | ZIP includes nested image, non-image, duplicate, traversal and oversized entries | Safe images import; unsafe/duplicate entries cannot escape limits or write paths | Backend fixtures |
| D4-05 | Photos have EXIF timestamps, timezone boundary, ZIP mtime or no date | Event-local proposals use only recorded times; confirmation applies albums; unknown dates remain unassigned | Backend + component tests |
| D4-06 | Worker finds blurry/dark/overexposed/duplicate photos; staff approves or hides | Review flags visible; default publishes; hold is explicit opt-in; bulk outcomes persist | Deterministic worker + API + component tests |
| D4-07 | Search filename, filter album/hidden/review, select and move/hide/delete | Filters retained in URL; selected photos update; hide/delete require confirmation; failures retain context | Component + API tests; 390/1440 browser |
| D4-08 | Public gallery opens ordered albums and photos | Hidden photos stay hidden; camera filenames never become captions | Public regression tests |
| D4-09 | Anonymous/nonstaff invokes gallery administration | Access rejected, including ZIP preparation/completion and proposals | Authorization tests |

## Execution record

Implementation and execution are in progress. Final tested SHA, results, environment limits, screenshots and resource cleanup will be recorded before PR handoff. Real-device touch/keyboard/safe-area behavior and production direct-S3/Render execution are not run in this task. Public-lightbox staff hide is a follow-up, as requested.
