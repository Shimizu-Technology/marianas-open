require "test_helper"

class AdminAttentionTest < ActionDispatch::IntegrationTest
  setup do
    travel_to Time.zone.local(2026, 11, 3, 12)
    @user = User.create!(clerk_id: "attention", email: "attention@example.com", role: "staff")
    @headers = { "Authorization" => "Bearer test_token_#{@user.id}" }
    @org = Organization.create!(name: "D5", slug: "d5")
    AsjjfFetcherHeartbeat.create!(fetcher_id: "nightly", received_at: Time.current)
  end

  teardown { travel_back }

  test "endpoint permits each invited role and rejects anonymous access" do
    %w[admin staff viewer].each do |role|
      @user.update!(role: role)
      get "/api/v1/admin/attention", headers: @headers
      assert_response :success
      assert_equal [], response.parsed_body["groups"]
      assert_equal Time.current.iso8601, response.parsed_body["checked_at"]
      assert_equal "no-store", response.headers["Cache-Control"]
    end
    get "/api/v1/admin/attention"
    assert_response :unauthorized
  end

  test "current held proposals and old failed or incomplete checks need help" do
    held = event("held")
    old = held.results_sync_runs.create!(status: "held", trigger: "manual")
    held.update!(current_results_sync_run: old)
    discarded = event("discarded")
    discarded.update!(current_results_sync_run: discarded.results_sync_runs.create!(status: "held", trigger: "manual", discarded_at: Time.current))
    superseded = event("superseded")
    superseded.results_sync_runs.create!(status: "held", trigger: "manual")
    superseded.update!(current_results_sync_run: superseded.results_sync_runs.create!(status: "no_changes", trigger: "manual"))
    %w[incomplete failed].each { |status| event(status).update!(results_sync_status: status, results_last_checked_at: 25.hours.ago) }
    event("recent").update!(results_sync_status: "failed", results_last_checked_at: 24.hours.ago)
    items = items()
    assert_equal 1, items.count { |item| item["key"].start_with?("held_results_") }
    assert_equal 2, items.count { |item| item["key"].start_with?("stale_results_") }
    assert_equal "/admin/events/#{held.id}/results", items.find { |item| item["key"] == "held_results_#{held.id}" }["href"]
  end

  test "fetch failures pause and heartbeat freshness are independent sources and GET is pure" do
    AsjjfFetchRequest.create!(url: "https://asjjf.org/main/eventResults/2062", page_type: "event_results", status: "failed")
    AsjjfFetchRequest.create!(url: "https://asjjf.org/main/eventResults/2063", page_type: "event_results", status: "done")
    AsjjfSetting.breaker.update!(paused_until: 1.hour.from_now, reason: "challenge")
    AsjjfFetcherHeartbeat.first.update!(received_at: 37.hours.ago, updated_at: Time.current)
    keys = items.map { |item| item["key"] }
    assert_includes keys, "failed_fetches"
    assert_includes keys, "fetcher_pause"
    assert_includes keys, "fetcher_heartbeat"
    AsjjfSetting.delete_all
    AsjjfFetchRequest.delete_all
    AsjjfFetcherHeartbeat.first.update!(received_at: 36.hours.ago)
    assert_no_difference "AsjjfSetting.count" do
      assert_empty items
    end
    AsjjfFetcherHeartbeat.delete_all
    assert_equal [ "fetcher_heartbeat" ], items.map { |item| item["key"] }
  end

  test "failed fetch alert counts unresolved pages and clears after a successful replacement" do
    url = "https://asjjf.org/main/eventResults/2062"
    2.times { AsjjfFetchRequest.create!(url: url, page_type: "event_results", status: "failed") }
    assert_equal 1, items.find { |item| item["key"] == "failed_fetches" }["count"]
    AsjjfFetchRequest.create!(url: url, page_type: "event_results", status: "done")
    assert_not items.any? { |item| item["key"] == "failed_fetches" }
    AsjjfFetchRequest.create!(url: url, page_type: "event_results", status: "failed")
    assert_equal 1, items.find { |item| item["key"] == "failed_fetches" }["count"]
  end

  test "identity and hidden video counts include only unresolved work" do
    IdentityReview.create!(raw_name: "New gym", normalized_name: "new gym")
    IdentityReview.create!(raw_name: "Resolved gym", normalized_name: "resolved gym", status: "resolved")
    Video.create!(title: "Removed", youtube_url: "https://www.youtube.com/watch?v=abcdefghijk").update!(availability_hidden: true)
    Video.create!(title: "Available", youtube_url: "https://www.youtube.com/watch?v=abcdefghijl")
    data = items.index_by { |item| item["key"] }
    assert_equal 1, data.fetch("identity_reviews")["count"]
    assert_equal 1, data.fetch("unavailable_videos")["count"]
    assert_equal "/admin/videos?unavailable=1", data.fetch("unavailable_videos")["href"]
  end

  test "pending ASJJF calendar reviews count until decided and drafts leave once published" do
    snapshot = AsjjfSnapshot.create!(url: "https://asjjf.org/main/eventsBySeason/381", asjjf_id: 381, page_type: "season_calendar",
      html: "<html></html>", source: "admin_upload", outcome: "ok", fetched_at: Time.current, parse_status: "parsed")
    draft = event("calendar-draft", status: "draft")
    published = event("calendar-published")
    review = ->(kind, target, status = "pending") { AsjjfCalendarReview.create!(snapshot: snapshot, event: target, kind: kind, title: target.name, fingerprint: SecureRandom.hex, status: status) }
    review.call("new_draft", draft)
    review.call("change", published)
    review.call("change", published, "dismissed")
    review.call("new_draft", published)
    calendar = items.find { |item| item["key"] == "calendar_reviews" }
    assert_equal 2, calendar["count"]
    assert_equal "/admin/events#asjjf-calendar", calendar["href"]
  end

  test "photos group failed and stalled imports and unreviewed flags by event" do
    e = event("photos")
    %w[failed queued processing completed].each_with_index do |status, index|
      EventGalleryImport.create!(event: e, source_blob_id: index + 1, prepared_by_id: @user.id, filename: "photos.zip", album_type: "Podium", timezone: "Pacific/Guam", status: status, updated_at: 25.hours.ago)
    end
    EventGalleryImport.create!(event: e, source_blob_id: 100, prepared_by_id: @user.id, filename: "recent.zip", album_type: "Podium", timezone: "Pacific/Guam", status: "processing")
    [ { review_held: true }, { review_flags: [ "dark" ] }, { review_flags: [ "blur" ], reviewed_at: Time.current }, {} ].each do |attrs|
      EventGalleryImage.insert!(attrs.merge(event_id: e.id, status: "ready", created_at: Time.current, updated_at: Time.current))
    end
    data = items.index_by { |item| item["key"] }
    assert_equal 3, data.fetch("photo_imports_#{e.id}")["count"]
    assert_equal 2, data.fetch("photo_reviews_#{e.id}")["count"]
    assert_equal "/admin/photos/#{e.id}?view=review#event-photo-library", data.fetch("photo_reviews_#{e.id}")["href"]
  end

  test "event readiness uses D1 checks including copied fields and missing dates" do
    good = event("good")
    rolled = event("rolled", content_review_required: true)
    rolled.event_schedule_items.create!(time: "09:00", description: "Start", confirmed: false)
    rolled.prize_categories.create!(name: "Prize", confirmed: false)
    no_date = event("no-date", date: nil)
    no_year = event("no-year", date: nil, season_year: nil, status: "draft")
    event("old-draft", status: "draft", date: 1.year.ago.to_date, content_review_required: true)
    data = items.select { |item| item["key"].start_with?("event_readiness_") }
    assert_equal [ rolled.id, no_date.id, no_year.id ].sort, data.map { |item| item["key"].delete_prefix("event_readiness_").to_i }.sort
    assert_includes data.find { |item| item["key"].end_with?(rolled.id.to_s) }["explanation"], "Confirm every copied schedule row"
    assert_not_includes data.map { |item| item["key"] }, "event_readiness_#{good.id}"
  end

  test "published upcoming links past end dates and sponsor date boundaries" do
    missing = event("no-link", registration_not_open: false)
    event("not-open", registration_not_open: true)
    past = event("past", date: 2.days.ago.to_date, end_date: 1.day.ago.to_date, status: "completed")
    event("ongoing", date: 2.days.ago.to_date, end_date: Date.current)
    event("cancelled", date: 2.days.ago.to_date, status: "cancelled")
    with_results = event("with-results", date: 2.days.ago.to_date)
    with_results.event_results.create!(competitor_name: "A", division: "Adult", placement: 1)
    sponsor = Sponsor.create!(organization: @org, name: "Sponsor")
    [ -1, 0, 14, 15 ].each { |days| sponsor.sponsor_placements.create!(placement_type: "featured_bar", ends_on: Date.current + days) }
    sponsor.sponsor_placements.create!(placement_type: "official", starts_on: Date.current + 2, ends_on: Date.current + 3)
    data = items.index_by { |item| item["key"] }
    assert data.key?("missing_registration_#{missing.id}")
    assert_equal [ "missing_results_#{past.id}" ], data.keys.grep(/^missing_results/)
    assert_equal 3, data.fetch("expiring_sponsors")["count"]
  end

  test "query budget stays constant with more events and never loads snapshot HTML" do
    event("one")
    items # Warm schema caches.
    before = query_count
    8.times { |index| event("more-#{index}", content_review_required: true) }
    after = query_count
    assert_equal before, after
    assert_operator after, :<=, 22
  end

  private

  def event(slug, **attrs)
    @org.events.create!({ name: slug.humanize, slug: slug, season_year: Date.current.year,
      date: Date.current + 7, status: "upcoming", venue_name: "Venue", registration_not_open: true }.merge(attrs))
  end

  def items
    get "/api/v1/admin/attention", headers: @headers
    assert_response :success
    response.parsed_body.fetch("groups").flat_map { |group| group.fetch("items") }.each do |item|
      assert_includes %w[error warning], item["severity"]
      assert_operator item["count"], :>, 0
      assert item["title"].present? && item["explanation"].present?
      assert item["href"].start_with?("/admin/")
    end
  end

  def query_count
    count = 0
    ActiveSupport::Notifications.subscribed(->(*args) {
      payload = args.last
      count += 1 if payload[:sql].start_with?("SELECT") && !payload[:cached] && payload[:name] != "SCHEMA"
    }, "sql.active_record") { ActiveRecord::Base.uncached { AdminAttention.new.call } }
    count
  end
end
