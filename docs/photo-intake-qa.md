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

The code at `8ac37cc8068ff9b362d161b7992a928712c507e4` has fixture-browser evidence at 390×844 and 1440×1000, with no horizontal overflow, broken images or page errors. `docs/qa/photo-intake/browser-results.json` records that source commit; the four adjacent PNGs show upload and review states. The walkthrough performed album creation/rename/reorder, upload album choice, confirmed day assignments, review filtering, confirmed hide, approval preserving a manual hide, filename search, empty results and recovery. The 390px run also opened the admin drawer and navigated through Photos.

Automated coverage includes all nine scenarios above: API role/event isolation and saved outcomes; ZIP attacks, entry streaming, file signatures, checksum/disk failures and repeated jobs; deterministic review thresholds and public visibility; actual variant generation; event-day/timezone/proposal validation; and IndexedDB restore, completion retry, quota handling, internal batching beyond 100 files, cross-tab serialization, paging and account boundaries. The backend worker's final focused run passed 36 tests / 279 assertions; its expanded adjacent regressions passed 50 tests / 481 assertions before final refinements. The integrating session runs the complete API and web gates separately. **Final full-suite counts, CI, tested head and cleanup are recorded in [PR #123](https://github.com/Shimizu-Technology/marianas-open/pull/123).**

Independent review found unlocked ZIP mutations, a stale-filter reload, blank ZIP destinations becoming Podium, missing source albums in date previews, and account-switch races during token refresh. The fixes are covered by lock/identity, stale-filter, source-category and delayed-401 regressions. The final narrow independent review found no material issues through `8ac37cc`; combined/backend review coverage is unchanged from `c2e5c66`. CodeRabbit returned its free-review limit, so it is rate-limited rather than approved. No unresolved material finding is intentionally left open.

An overlapping web run loaded the previous ZIP component against a newly edited ownership assertion and failed that assertion. The code was then frozen and rerun; the final PR records that result rather than counting the overlapping run as passed.

These checks cover rendered components and synthetic saved outcomes. Real local authenticated administration remains blocked by Clerk. Physical-phone touch/keyboard/safe-area/lock behavior, live Render/direct-S3 operation and real 4-GiB transfers are not run. Local HEIC/AVIF success tests are blocked because libvips cannot load its HEIF module: the installed libheif references a missing `libx265.216.dylib`. JPEG/PNG processing is exercised; deployment must still run the native image verification in the worker environment. The task does not repair shared Homebrew libraries or change production data/storage. Public-lightbox staff hide remains the requested follow-up.
