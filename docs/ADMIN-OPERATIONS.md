# Marianas Open admin operations

This runbook is for the tournament team managing the circuit from `/admin`. Routine event and content work should not require code changes.

## Roles

- **Admin:** all content and operations plus user access and organization settings.
- **Staff:** all tournament, content, media, sponsor, and results operations.
- **Viewer:** can inspect the same operational data but all writes and uploads are rejected by the API.

Important changes are written to the dashboard activity feed with the person, action, record, and time.

## Preparing the next year

1. Open **Seasons & Rollover**.
2. On the source season, confirm the target year and select **Rollover as drafts**.
3. The system creates the new season and draft versions of each event. It copies reusable schedule, prize, travel, venue, hotel, and marketing structure.
4. For safety, it clears event dates, registration URLs, ASJJF result IDs, livestream state, imported-result state, hotel dates, booking codes/links, and generated translations. Sponsor placements are copied inactive with their schedules and counters reset.
5. Open every draft event, complete the readiness checklist, preview it, and publish it individually.
6. Activate the season only when the team wants it treated as the current operating season.

Rollover never overwrites an existing target year. A source link remains on every copied event for traceability and stale-year warnings.

## Creating or publishing an event

1. Open **Events & Results** and create an event as a draft.
2. Select its season and enter the public URL slug, date, venue, city/country, and at least one official registration link.
3. Add recommended public content: hero image, description, travel, schedule, prizes, hotel offers, poster, and gallery.
4. Save and review **Publishing readiness**. Red checks block publishing; amber checks are recommended but optional.
5. Use **Publish event** rather than changing status casually. Use **Mark live** only when the stream and event-day information have been verified.
6. **Return to draft** immediately removes a published event from normal public event listings and disables its live-stream flag.

Only one event in a season can be the main event. Public event slugs are unique.

## Date and source verification

Dates and links must be checked against the official registration page before publishing. During the July 2026 review, the repository data for the Hong Kong event and the linked federation listing appeared to differ by one day. This implementation intentionally does not guess which value is correct; an operator must confirm the official date before publishing or promoting it.

## Sponsors

1. Create the sponsor and upload its canonical logo under **Sponsors**.
2. Open **Sponsor Placements** to choose the site location, optional season/event scope, call to action, and start/end time.
3. Keep a copied or future placement inactive until commercial approval and artwork are final.
4. The `featured bar` placement appears across the public site. Other placement types establish the managed inventory for event hero, livestream, results, gallery, and homepage integrations.

## Results and event day

- Store official ASJJF event IDs on the correct event and always use import preview before replacing results.
- Confirm Gi and No-Gi registration URLs independently.
- Verify livestream URL and status immediately before marking an event live.
- Imported results, rankings, galleries, and media remain event-scoped; annual rollover never carries them into a new event.

Registration transactions, bracket management, check-in, payments, and tournament-day scoring remain federation/operations-system responsibilities. This admin console links to and presents those systems; it does not silently become the financial system of record.

## Recovery and accountability

- Use the dashboard activity feed to identify the most recent operator change.
- Return questionable public events to draft while facts are verified.
- Do not delete a season containing events; archive it instead.
- Database backups and object-storage retention remain required. Audit logs improve traceability but are not a backup system.
