# Event Results & Admin Workflow

## Overview

This document describes how events move through their lifecycle (upcoming → completed) and how results are managed. It also outlines the admin UI improvements needed so the Marianas Open team can handle this independently.

## Current Architecture

### Event Lifecycle

Events have four statuses: `draft`, `published`, `completed`, `cancelled`.

| Status | Calendar Page | Past Events Page | Results Shown |
|--------|--------------|------------------|---------------|
| draft | Hidden (filtered client-side) | No | No |
| published | Upcoming tab | No | No |
| completed | Past tab | Yes | Yes |
| cancelled | Hidden | No | No |

### Backend (API) — Fully Built

The Rails API already supports the entire workflow:

**Event management:**
- `PATCH /api/v1/admin/events/:id` — update status and all fields
- `POST /api/v1/admin/events/:id/upload_image` — hero image upload

**Results CRUD:**
- `GET /api/v1/admin/events/:event_id/results` — list results
- `POST /api/v1/admin/events/:event_id/results` — create single result
- `POST /api/v1/admin/events/:event_id/results/bulk_create` — create many at once
- `PATCH /api/v1/admin/events/:event_id/results/:id` — update result
- `DELETE /api/v1/admin/events/:event_id/results/:id` — delete result
- `DELETE /api/v1/admin/events/:event_id/results/destroy_all` — clear all results

**ASJJF import (scraper):**
- `GET /api/v1/admin/events/:id/import_results_preview` — preview what will be imported
- `POST /api/v1/admin/events/:id/import_results` — import results from ASJJF
- Reads `asjjf_event_ids` (jsonb) on the event record
- Scrapes from `https://asjjf.org/main/eventResults/:id`

**Public display:**
- `GET /api/v1/events/:slug/results` — grouped by division with filters
- `GET /api/v1/events/:slug/results/summary` — stats, belt breakdown, top academies

### Frontend Display — Fully Built

- `EventDetailPage` renders `EventResultsSection` when `status === 'completed'`
- `PastEventsPage` lists events where `status === 'completed'`
- `CalendarPage` splits upcoming vs. past by status
- `EventResultsSection` shows podium placements, belt breakdown, top academies, search/filter

### Data Models

**EventResult fields:**
- `event_id`, `competitor_id` (optional)
- `division`, `placement` (1, 2, or 3), `competitor_name` (required)
- `academy`, `country_code`, `belt_rank`, `gender`
- `age_category`, `weight_class`, `submission_method`, `notes`

**Event.asjjf_event_ids:**
- jsonb array, e.g. `[1863, 1864]`
- One ASJJF event can have multiple IDs (gi + no-gi are separate on ASJJF)

## What the Admin Panel Can Do Today

- Create, edit, delete events
- Change event status (draft → published → completed)
- Upload hero images
- Manage schedule items and prize categories
- Manage site content (CMS) in all languages

## What's Missing (Admin UI Gaps)

### 1. ASJJF Event IDs field on event form
**Priority: High**

The event edit form does not expose the `asjjf_event_ids` field. Currently this can only be set via seeds or direct API calls.

**Work needed:**
- Add `asjjf_event_ids` input to EventsAdmin.tsx event form
- Accept comma-separated IDs, store as JSON array
- The API already permits this field

### 2. "Import Results from ASJJF" button
**Priority: High**

The API endpoints exist (`import_results_preview` and `import_results`) but there is no UI.

**Work needed:**
- Add `importResultsPreview` and `importResults` methods to `web/src/services/api.ts`
- Add "Import Results" button on event detail in admin
- Show preview modal with result count before confirming
- Handle loading/error states
- Optionally auto-mark event as completed after import

### 3. Results management page
**Priority: Medium**

No admin page exists to view, add, edit, or delete individual results.

**Work needed:**
- Create new admin page or tab within EventsAdmin
- List results grouped by division
- Allow manual add/edit/delete of individual results
- Support bulk delete (clear all results)
- Useful for corrections after ASJJF import

### 4. Event status validation
**Priority: Low**

The Event model does not validate status values. Any string is accepted.

**Work needed:**
- Add `validates :status, inclusion: { in: %w[draft published completed cancelled] }` to Event model

## Workflow: Completing an Event (After Admin UI is Built)

Once the admin UI gaps are filled, the team workflow for completing an event like Marianas Pro Nagoya would be:

1. **Admin → Events → Marianas Pro Nagoya 2025 → Edit**
2. **Enter ASJJF Event IDs** (e.g., `1863`) in the new field
3. **Click "Import Results from ASJJF"** → preview shows "Found 247 results across 32 divisions"
4. **Confirm import** → results are saved to the database
5. **Change status to "Completed"**
6. **Save** → Event now appears in Past Events, results are visible on the event detail page

## Temporary Workaround (Before Admin UI)

Until the admin UI is built, results can be imported via the API directly:

```bash
# 1. Set ASJJF event IDs (replace EVENT_ID and TOKEN)
curl -X PATCH https://your-api.com/api/v1/admin/events/EVENT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"asjjf_event_ids": [1863]}'

# 2. Preview results
curl https://your-api.com/api/v1/admin/events/EVENT_ID/import_results_preview \
  -H "Authorization: Bearer TOKEN"

# 3. Import results
curl -X POST https://your-api.com/api/v1/admin/events/EVENT_ID/import_results \
  -H "Authorization: Bearer TOKEN"

# 4. Mark as completed
curl -X PATCH https://your-api.com/api/v1/admin/events/EVENT_ID \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

## File References

| Area | Key Files |
|------|-----------|
| Event model | `api/app/models/event.rb` |
| EventResult model | `api/app/models/event_result.rb` |
| ASJJF scraper | `api/app/services/asjjf_scraper.rb` |
| Admin events controller | `api/app/controllers/api/v1/admin/events_controller.rb` |
| Admin results controller | `api/app/controllers/api/v1/admin/event_results_controller.rb` |
| Public results controller | `api/app/controllers/api/v1/event_results_controller.rb` |
| Admin events UI | `web/src/pages/admin/EventsAdmin.tsx` |
| Results display | `web/src/components/EventResultsSection.tsx` |
| API service | `web/src/services/api.ts` |
| Routes | `api/config/routes.rb` |
