# Event Gallery Albums & Categories

## Why this matters

The Marianas Open team is now using the admin gallery in production to upload large sets of tournament photos. The current implementation technically supports categories, but the workflow feels like a hidden free-text field instead of an obvious album/folder system.

Recent user feedback exposed the issue:

> "I uploaded Taiwan Podium photos, can you check if it’s under the right category? There wasn’t a drop down option."

That means the system is working at the data layer, but the UI is not matching the mental model of the people uploading photos. Admin users expect to pick an album/category before uploading, create a new category when needed, and easily fix uncategorized photos after upload.

## Current state

### Backend

Event gallery images store category as a string on `event_gallery_images.category`.

The model also provides default preset category names:

- Podium Day 1
- Podium Day 2
- Tournament Day 1
- Tournament Day 2
- Venue
- Athletes
- Opening Ceremony
- Sponsors
- Other

The API returns those default categories plus any custom category names already used by event photos.

### Admin UI

The event gallery admin uses plain text inputs with a browser `datalist` for categories. That creates two problems:

1. Some browsers/users do not experience it like a real dropdown.
2. Creating a new category is possible, but not obvious.

There is also no first-class “Uncategorized” filter, so if photos are uploaded without a category, admins have to notice missing metadata manually.

## Product direction

Use the language of **albums/categories** instead of raw free-text tags.

The desired admin workflow should be:

1. Pick an album before uploading a batch of photos.
2. If the right album does not exist, create/type a new one intentionally.
3. Upload many photos into that album.
4. Filter by album.
5. Find uncategorized photos easily.
6. Select many photos and move them into the correct album.

## Phase 1 — UX improvement without a new data model

Phase 1 keeps the existing `event_gallery_images.category` string column. This is lower risk because it avoids a migration and preserves current public gallery behavior.

Planned improvements:

- Make category selection an explicit dropdown-style control.
- Keep default category suggestions.
- Add a clear “Create new album/category” path.
- Add `Podium` as a general default category, because users naturally say “Taiwan Podium photos” rather than always “Podium Day 1/2.”
- Add an “Uncategorized” admin filter.
- Show how many uncategorized photos exist.
- Default uploads to the currently selected category filter when appropriate.
- Improve labels and help copy:
  - “Category” becomes “Album / Category.”
  - Upload helper copy explains that all photos in the batch will be assigned to that album.
- Preserve bulk move/show/hide/delete behavior.

Expected result: Carmin and other admins can immediately understand where photos are going and can fix category mistakes without developer help.

## Phase 2 — Full category management if needed

If the team later needs more control, we should add an `event_gallery_categories` table and make categories first-class records.

Potential Phase 2 features:

- Create empty categories before uploading photos.
- Rename a category and update all associated photos safely.
- Merge duplicate categories.
- Reorder categories on the public gallery page.
- Hide/show categories publicly.
- Add category descriptions or cover photos.
- Track category slugs separately from display names.

Potential table shape:

```text
event_gallery_categories
- id
- event_id
- name
- slug
- description
- sort_order
- active
- public
- created_at
- updated_at
```

Phase 2 is not required for the immediate pain point because Phase 1 already supports custom category names and batch reassignment.

## Design principles

- Admins should not need to know implementation details.
- Uploading should feel like placing photos into an album.
- Bulk correction should be easy because mistakes are expected during large event uploads.
- Uncategorized content should be visible and recoverable.
- Public gallery behavior should remain stable while improving admin workflows.
