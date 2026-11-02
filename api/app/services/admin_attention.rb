# Read-only registry: add one source method here to extend the dashboard. Sources
# return item hashes (or arrays), never serialize large admin resource collections.
class AdminAttention
  SOURCES = %i[held_results stale_results failed_fetches fetcher_pause fetcher_heartbeat identity_reviews calendar_reviews unavailable_videos photo_imports photo_reviews event_readiness missing_registration missing_results expiring_sponsors].freeze
  READINESS_ACTIONS = {
    "name" => "Set the event name", "slug" => "Choose a unique public URL", "season" => "Set the season year",
    "date" => "Set dates within this season", "venue" => "Set the venue", "registration" => "Add a registration link or mark it not open yet",
    "schedule" => "Confirm every copied schedule row", "prizes" => "Confirm every copied prize row",
    "stars" => "Match the star rating to saved ASJJF facts or leave it blank",
    "content_review" => "Review copied descriptions, travel and hotel details"
  }.freeze
  AREAS = { results: "Results", asjjf: "ASJJF checks", identities: "Academy names", photos: "Photos", events: "Events", sponsors: "Sponsors", videos: "Videos" }.freeze

  def initialize(now: Time.current)
    @now = now
    @today = now.to_date
  end

  def call
    items = SOURCES.flat_map { |source| Array.wrap(send(source)) }
    groups = AREAS.filter_map do |key, title|
      matches = items.select { |item| item[:area] == key }
      { area: key, title: title, items: matches } if matches.any?
    end
    { checked_at: @now.iso8601, groups: groups }
  end

  private

  def item(key, area, severity, title, explanation, count, href)
    return if count.zero?
    { key: key, area: area, severity: severity, title: title, explanation: explanation, count: count, href: href }
  end

  def held_results
    # Only the current, undiscarded proposal is actionable. Older holds are audit history.
    Event.joins(:current_results_sync_run).where(results_sync_runs: { status: "held", discarded_at: nil })
      .order(:date, :id).pluck(:id, :name).map do |id, name|
      item("held_results_#{id}", :results, "warning", "Results need approval: #{name}", "An administrator needs to review the saved changes before they can go public.", 1, "/admin/events/#{id}/results")
    end
  end

  def stale_results
    Event.where(results_sync_status: %w[incomplete failed]).where("results_last_checked_at < ?", @now - 24.hours)
      .order(:date, :id).pluck(:id, :name).map do |id, name|
      item("stale_results_#{id}", :results, "error", "Results check needs help: #{name}", "The latest check has been incomplete or failed for over 24 hours. Open the review to see what is missing.", 1, "/admin/events/#{id}/results")
    end
  end

  def failed_fetches
    # A retry is a new queue row. Keep unresolved URLs, not recovered history.
    failed = AsjjfFetchRequest.where(status: "failed").where(<<~SQL.squish)
      NOT EXISTS (
        SELECT 1 FROM asjjf_fetch_requests recovered
        WHERE recovered.url = asjjf_fetch_requests.url
          AND recovered.page_type = asjjf_fetch_requests.page_type
          AND recovered.status = 'done'
          AND (recovered.created_at, recovered.id) > (asjjf_fetch_requests.created_at, asjjf_fetch_requests.id)
      )
    SQL
    item("failed_fetches", :asjjf, "error", "ASJJF pages could not be checked", "Open ASJJF sync to inspect failed requests and queue another event check if needed.", failed.distinct.count(:url), "/admin/asjjf#asjjf-queue")
  end

  def fetcher_pause
    # Do not call .breaker here: a dashboard GET must not create settings.
    breaker = AsjjfSetting.find_by(key: "circuit_breaker")
    item("fetcher_pause", :asjjf, "error", "Automatic ASJJF checks are paused", "ASJJF asked the fetcher to stop. An administrator should inspect the saved evidence before resetting the safety pause.", breaker&.open? ? 1 : 0, "/admin/asjjf#asjjf-breaker")
  end

  def fetcher_heartbeat
    # received_at is the heartbeat, updated_at also changes for rate accounting.
    last_seen = AsjjfFetcherHeartbeat.maximum(:received_at)
    item("fetcher_heartbeat", :asjjf, "error", "The nightly ASJJF fetcher has not reported", "No heartbeat has arrived in over 36 hours#{last_seen ? '.' : ' (none recorded yet).' } Ask Shimizu Technology to check the fetcher.", last_seen && last_seen >= @now - 36.hours ? 0 : 1, "/admin/asjjf#asjjf-heartbeats")
  end

  def identity_reviews
    item("identity_reviews", :identities, "warning", "New academy names need a decision", "These names look like existing academies. Decide whether each is the same academy or a new one.", IdentityReview.where(status: "pending").count, "/admin/academies#identity-reviews")
  end

  def calendar_reviews
    # Same visibility as the Events calendar panel: drafts leave once published.
    pending = AsjjfCalendarReview.where(status: "pending")
    pending = pending.where.not(kind: "new_draft").or(pending.where(kind: "new_draft", event_id: Event.where(status: "draft").select(:id)))
    item("calendar_reviews", :events, "warning", "ASJJF calendar updates need review", "ASJJF listed a new event or changed details for one of ours. Review each item on the Events page, then publish, apply or dismiss it.", pending.count, "/admin/events#asjjf-calendar")
  end

  def unavailable_videos
    item("unavailable_videos", :videos, "warning", "Unavailable videos are hidden", "Review the hidden videos. Replace a removed video or check whether it is available again.", Video.where(availability_hidden: true).count, "/admin/videos?unavailable=1")
  end

  def photo_imports
    EventGalleryImport.where(status: "failed").or(EventGalleryImport.where(status: %w[queued processing]).where("event_gallery_imports.updated_at < ?", @now - 24.hours))
      .joins(:event).group(:event_id, "events.name").count.map do |(id, name), count|
      item("photo_imports_#{id}", :photos, "error", "Photo ZIP imports need help: #{name}", "An import failed or has made no progress for over 24 hours. Open Recent ZIP imports for the error and contact Shimizu Technology if it is stuck.", count, "/admin/photos/#{id}#photo-imports")
    end
  end

  def photo_reviews
    EventGalleryImage.where(reviewed_at: nil).where("review_held = TRUE OR review_flags <> '[]'::jsonb")
      .joins(:event).group(:event_id, "events.name").count.map do |(id, name), count|
      item("photo_reviews_#{id}", :photos, "warning", "Photos need review: #{name}", "Check flagged photos and approve the ones to keep. Held photos stay hidden until approved; other flagged photos may already be public.", count, "/admin/photos/#{id}?view=review#event-photo-library")
    end
  end

  def upcoming
    Event.where(status: %w[draft upcoming live]).where("date >= ? OR (date IS NULL AND (season_year IS NULL OR season_year >= ?))", @today, @today.year)
  end

  def event_readiness
    events = upcoming.includes(:event_schedule_items, :prize_categories, :event_accommodations).order(:date, :id).to_a
    slug_ids = Event.where(slug: events.map(&:slug).compact).pluck(:slug, :id).to_h
    snapshots = AsjjfSnapshot.where(id: events.map(&:asjjf_info_snapshot_id).compact, page_type: "event_info", parse_status: "parsed", outcome: "ok")
      .select(:id, :asjjf_id, :parsed_summary).index_by { |snapshot| [ snapshot.id, snapshot.asjjf_id ] }
    events.filter_map do |event|
      checks = EventReadiness.new(event, slug_ids: slug_ids, snapshots: snapshots).call[:checks].reject { |check| check[:complete] }
      next if checks.empty?
      item("event_readiness_#{event.id}", :events, "warning", "Review before publishing: #{event.name.presence || 'Unnamed event'}", checks.map { |check| READINESS_ACTIONS.fetch(check[:key], check[:label]) }.join(". ") + ".", 1, "/admin/events?edit=#{event.id}")
    end
  end

  def missing_registration
    scope = upcoming.where(status: %w[upcoming live], registration_not_open: false)
    Event::ASJJF_REGISTRATION_URL_FIELDS.each { |field| scope = scope.where(field => [ nil, "" ]) }
    scope.order(:date, :id).pluck(:id, :name).map do |id, name|
      item("missing_registration_#{id}", :events, "warning", "Registration link is missing: #{name}", "Add the official registration link, or mark registration as not open yet.", 1, "/admin/events?edit=#{id}")
    end
  end

  def missing_results
    Event.where(status: %w[upcoming live completed]).where("COALESCE(end_date, date) < ?", @today)
      .where.not(id: EventResult.select(:event_id)).order(:date, :id).pluck(:id, :name).map do |id, name|
      item("missing_results_#{id}", :results, "warning", "Event has ended without results: #{name}", "Check the ASJJF sources and review the results import when the official results are available.", 1, "/admin/events/#{id}/results")
    end
  end

  def expiring_sponsors
    item("expiring_sponsors", :sponsors, "warning", "Sponsor placements end soon", "These placements end today or within 14 days. Confirm the dates with the team and update them if the sponsor is continuing.", SponsorPlacement.where(ends_on: @today..(@today + 14)).count, "/admin/sponsors#placements")
  end
end
