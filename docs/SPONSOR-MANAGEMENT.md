# Manage sponsors

Staff and administrators can manage sponsors at **Admin → Sponsors**. Sponsor updates no longer need a developer or a data migration.

1. Choose **Add sponsor**, enter its name and optional website, and upload its regular logo. Use PNG, JPEG, WebP, or GIF, up to 10 MB. The regular logo sits on white; an optional dark-background version sits on the site's dark surface. Missing or unavailable logos show the sponsor's name.
2. Under **Where and when to show this sponsor**, choose a location: the home page featured bar, presenting partner, supporting partners, official sponsor grid, or event pages. Add another placement to show the same sponsor in more than one location.
3. For an event placement, choose an event or **All event pages** and its sponsor label. For several specific events, add a placement for each. Home page placements never appear on event pages automatically.
4. Set the first and last days if needed. Both are included and use **Guam time**. Blank dates mean no date restriction. For example, January 1 through January 30 includes the entire last day. Ending a placement hides it without deleting the sponsor.
5. Optionally add a headline, short message, placement link, or HTTPS YouTube/Vimeo video link. Headlines and messages use the existing GT automatic translation pipeline after saving. Links must use HTTP/HTTPS; video links must identify a YouTube or Vimeo video. Videos open only after a visitor chooses them and never autoplay.
6. Review the preview and choose **Save sponsor**. Previews also show scheduled placements so you can inspect them before their first day. Check the public page once the schedule is active.

Use **Change display order** and the up/down buttons to move sponsors within a location. You can also set a placement's order number directly; lower numbers appear first. All edits and logo uploads record the staff member and time under **Recent changes**. A failed sponsor/placement save leaves both unchanged; the audit record is part of the same transaction.

Choose **Remove placement** and save to stop one appearance. **Delete** asks for confirmation and removes the sponsor and all its placements. Its audit history remains in the database. Prefer ending a placement when the sponsor may return.

## Deployment mapping

Migration `20261102200000_create_sponsor_placements.rb` preserves sponsor records, links, logos, and ordering. GVB receives the presenting placement and its existing translated message. Other legacy `presenting` sponsors, including Ready H2GO, receive supporting placements. Existing `official` sponsors, including Hotel Tano, receive official grid placements. Legacy `partner` entries such as ASJJF remain outside the home sponsor grid, matching the old home page; the separately displayed organization partners remain intact.

The old event strip showed all sponsors. The migration creates global event placements for that lineup, except Hotel Tano, which gets the requested explicit Marianas Open 2026 placement when that event exists. Its official home placement remains, with the existing `https://www.hoteltano.com` destination stored in the placement CTA. GVB retains its old default destination when its sponsor website is blank. If the historical event is absent, its global event placement preserves the old visibility. The migration-local backfill uses `find_or_create_by!`, so running the backfill again creates no duplicates and preserves later edits. Rollback is intentionally irreversible to protect staff placements and audit history.

No featured placement is enabled by migration: staff choose who to feature. The sponsor lineup and home tiers stay the same after deployment; the new fixed logo boxes, tier labels, and full opacity intentionally improve presentation.

See [QA evidence](qa/d2-sponsors/README.md) for the comparison against the isolated database copy and acceptance results. PR #79 can be closed after this focused replacement merges; its season-rollover features are outside this PR.
