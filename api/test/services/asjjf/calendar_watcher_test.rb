require "test_helper"

class AsjjfCalendarWatcherTest < ActiveSupport::TestCase
  setup do
    @org = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @html = File.read(Rails.root.join("test/fixtures/files/asjjf/season_calendar_381.html"))
  end

  test "saved parser output creates four unpublished factual drafts, is repeatable and batches one alert" do
    calls = []
    original = Asjjf::CalendarAlert.method(:deliver)
    Asjjf::CalendarAlert.define_singleton_method(:deliver) { |run, reviews| calls << [ run.id, reviews.size ] }
    saved = snapshot
    ParseAsjjfSnapshotJob.perform_now(saved.id)
    assert_equal "parsed", saved.reload.parse_status
    ApplyAsjjfCalendarJob.perform_now(saved.id)
    assert_equal 4, @org.events.count
    assert_equal 4, AsjjfCalendarReview.where(kind: "new_draft").count
    copa = @org.events.find_by!(date: Date.new(2027, 1, 30))
    assert_equal "draft", copa.status
    assert_equal [ 2258, 2259 ], copa.asjjf_event_ids
    assert_equal "https://asjjf.org/main/eventInfo/2258", copa.registration_url_gi
    assert_equal "https://asjjf.org/main/eventInfo/2259", copa.registration_url_nogi
    assert_equal Date.new(2026, 10, 31), copa.registration_opens_on
    assert_equal "University of Guam Calvo Fieldhouse", copa.venue_name
    assert_equal "Guam", copa.country
    assert_nil copa.city
    assert_nil copa.asjjf_stars
    assert_nil copa.description
    assert_empty copa.registration_fee_sections
    assert copa.content_review_required
    assert_equal saved.id, copa.asjjf_calendar_snapshot_id
    assert_equal 2027, copa.season_year
    assert_nil copa.end_date
    assert_empty Event.publicly_visible
    stamp = copa.updated_at
    2.times { ApplyAsjjfCalendarJob.perform_now(saved.id) }
    fresh = parsed_snapshot
    Asjjf::CalendarWatcher.new(fresh).call
    assert_equal 4, @org.events.count
    assert_equal stamp, copa.reload.updated_at
    assert_equal 1, calls.size
    assert_equal 4, calls.first.last
  ensure
    Asjjf::CalendarAlert.define_singleton_method(:deliver, original)
  end

  test "IDs take priority over a renamed event and published facts never auto overwrite" do
    event = existing(name: "Staff name", date: "2027-01-29", asjjf_event_ids: [ 2258, 2259 ], venue_name: "Staff venue")
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal 4, @org.events.count
    assert_equal "Staff venue", event.reload.venue_name
    assert_equal Date.new(2027, 1, 29), event.date
    review = AsjjfCalendarReview.find_by!(event: event, kind: "change")
    assert_equal "Staff venue", review.old_values["venue_name"]
    assert_equal "University of Guam Calvo Fieldhouse", review.new_values["venue_name"]
    review.decide!("apply", actor: nil)
    assert_equal "upcoming", event.reload.status
    assert_equal Date.new(2027, 1, 30), event.date
    assert_equal "Staff name", event.name
    assert_equal "applied", review.reload.status
    assert_raises(ArgumentError) { review.decide!("apply", actor: nil) }
  end

  test "exact normalized name and date match without IDs; ambiguous names create no duplicate" do
    event = existing(name: "Guam Copa de Marianas 2027", date: "2027-01-30", asjjf_event_ids: [])
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal 4, @org.events.count
    review = AsjjfCalendarReview.find_by!(event: event, kind: "change")
    assert_equal [ 2258, 2259 ], review.new_values["asjjf_event_ids"]
    assert_equal [], event.reload.asjjf_event_ids
    # The later ambiguous calendar match cannot create a fifth event.
    existing(name: "2027 Guam Copa de Marianas", date: "2027-01-30", asjjf_event_ids: [])
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal 5, @org.events.count
    assert AsjjfCalendarReview.exists?(kind: "ambiguous")
  end

  test "a registration link and explicit ASJJF source also identify existing events" do
    event = existing(name: "Renamed", date: "2027-01-30", asjjf_event_ids: [], registration_url_gi: "https://asjjf.org/main/eventInfo/2258")
    event.event_asjjf_sources.create!(asjjf_event_id: 2259, discipline: "nogi", derived_from: "admin")
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal 4, @org.events.count
    assert AsjjfCalendarReview.exists?(event: event, kind: "change")
  end

  test "stale decisions fail, dismissed differences stay dismissed across identical checks" do
    event = existing
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    review = AsjjfCalendarReview.find_by!(event: event, kind: "change")
    event.update!(venue_name: "New staff edit")
    assert_raises(ArgumentError) { review.decide!("apply", actor: nil) }
    assert_equal "New staff edit", event.reload.venue_name
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal "superseded", review.reload.status
    review = AsjjfCalendarReview.find_by!(event: event, kind: "change", status: "pending")
    review.decide!("dismiss", actor: nil)
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal "dismissed", review.reload.status
    assert_empty AsjjfCalendarReview.where(event: event, kind: "change", status: "pending")
  end

  test "watcher drafts update automatically until published; other drafts require review" do
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    event = @org.events.find_by!(date: "2027-01-30")
    event.update!(venue_name: "Old venue")
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal "University of Guam Calvo Fieldhouse", event.reload.venue_name
    assert_empty AsjjfCalendarReview.where(event: event, kind: "change")
    event.update!(status: "upcoming", venue_name: "Published venue")
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal "Published venue", event.reload.venue_name
    assert AsjjfCalendarReview.exists?(event: event, kind: "change", status: "pending")
    event.update!(status: "draft", asjjf_calendar_snapshot_id: nil)
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal "Published venue", event.reload.venue_name
  end

  test "missing source is flagged without deletion, removal of IDs, or unpublishing" do
    event = existing(asjjf_event_ids: [ 2258, 2259, 9999 ])
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal "upcoming", event.reload.status
    assert_equal [ 2258, 2259, 9999 ], event.asjjf_event_ids
    review = AsjjfCalendarReview.find_by!(event: event, kind: "missing")
    assert_equal [ 9999 ], review.new_values["asjjf_event_ids"]
    assert_raises(ArgumentError) { review.decide!("apply", actor: nil) }
    review.decide!("dismiss", actor: nil)
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    assert_equal 1, AsjjfCalendarReview.where(event: event, kind: "missing").count
  end

  test "conflicting discipline dates are held rather than split into invented events" do
    saved = parsed_snapshot
    summary = saved.parsed_summary
    summary["events"].find { |row| row["event_id"] == 2259 }["event_date"] = "2027-01-31"
    saved.update!(parsed_summary: summary)
    Asjjf::CalendarWatcher.new(saved).call
    assert_equal 3, @org.events.count
    assert AsjjfCalendarReview.exists?(kind: "ambiguous")
  end

  test "a disappearing contributing source preserves both draft and published date ranges" do
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    draft = @org.events.find_by!(date: "2027-04-24")
    published = @org.events.find_by!(date: "2027-05-22")
    published.update!(status: "upcoming")
    saved = parsed_snapshot
    summary = saved.parsed_summary
    summary["events"].reject! { |row| [ 2211, 2235 ].include?(row["event_id"]) }
    saved.update!(parsed_summary: summary)
    Asjjf::CalendarWatcher.new(saved).call
    assert_equal Date.new(2027, 4, 24), draft.reload.date
    assert_equal Date.new(2027, 4, 25), draft.end_date
    assert_equal Date.new(2027, 5, 22), published.reload.date
    assert_equal Date.new(2027, 5, 23), published.end_date
    assert_equal "draft", draft.status
    assert_equal "upcoming", published.status
    assert_equal [ 2211, 2212 ], draft.asjjf_event_ids
    assert_empty AsjjfCalendarReview.where(event: [ draft, published ], kind: "change", status: "pending")
    assert_equal 2, AsjjfCalendarReview.where(event: [ draft, published ], kind: "missing", status: "pending").count
  end

  test "a partial title rename cannot narrow a saved event through separate groups" do
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    event = @org.events.find_by!(date: "2027-04-24")
    event.update!(status: "upcoming", venue_name: "Staff venue")
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    pending = AsjjfCalendarReview.find_by!(event: event, kind: "change", status: "pending")
    renamed = parsed_snapshot
    summary = renamed.parsed_summary
    summary["events"].find { |row| row["event_id"] == 2212 }["title"] = "Guam Marianas Pro Manila Renamed 2027 ( No-gi Event)"
    renamed.update!(parsed_summary: summary)
    Asjjf::CalendarWatcher.new(renamed).call
    assert_equal Date.new(2027, 4, 24), event.reload.date
    assert_equal Date.new(2027, 4, 25), event.end_date
    assert_equal "Staff venue", event.venue_name
    assert_equal "superseded", pending.reload.status
    assert_empty AsjjfCalendarReview.where(event: event, kind: "change", status: "pending")
    assert AsjjfCalendarReview.exists?(event: event, kind: "ambiguous")
    # The same hold protects automatic updates of watcher-created drafts.
    event.update!(status: "draft")
    another = renamed.dup
    another.fetched_at = 1.minute.from_now
    another.save!
    Asjjf::CalendarWatcher.new(another).call
    assert_equal Date.new(2027, 4, 24), event.reload.date
    assert_equal Date.new(2027, 4, 25), event.end_date
  end

  test "leaving the Marianas selector invalidates older proposals even if IDs remain listed" do
    event = existing(season_year: nil, date: nil)
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    pending = AsjjfCalendarReview.find_by!(event: event, kind: "change", status: "pending")
    excluded = parsed_snapshot
    summary = excluded.parsed_summary
    summary["events"].select { |row| [ 2258, 2259 ].include?(row["event_id"]) }.each do |row|
      row["title"] = row["title"].sub("Guam Copa De Marianas", "Dumau Open")
      row["place"] = "Tokyo - Japan"
    end
    excluded.update!(parsed_summary: summary)
    Asjjf::CalendarWatcher.new(excluded).call
    assert_equal "superseded", pending.reload.status
    assert_raises(ArgumentError) { pending.decide!("apply", actor: nil) }
    assert_equal "Old venue", event.reload.venue_name
    assert_nil event.date
  end

  test "moving a single-day event also clears an explicit old end date" do
    event = existing(end_date: "2027-01-30")
    moved = parsed_snapshot
    summary = moved.parsed_summary
    summary["events"].select { |row| [ 2258, 2259 ].include?(row["event_id"]) }.each do |row|
      row["event_date"] = row["event_end_date"] = "2027-02-01"
    end
    moved.update!(parsed_summary: summary)
    Asjjf::CalendarWatcher.new(moved).call
    pending = AsjjfCalendarReview.find_by!(event: event, kind: "change", status: "pending")
    assert pending.new_values.key?("end_date")
    assert_nil pending.new_values["end_date"]
    pending.decide!("apply", actor: nil)
    assert_equal Date.new(2027, 2, 1), event.reload.date
    assert_nil event.end_date
  end

  test "a newer failed or unprocessed calendar attempt blocks an older pending approval" do
    event = existing
    Asjjf::CalendarWatcher.new(parsed_snapshot).call
    review = AsjjfCalendarReview.find_by!(event: event, kind: "change")
    newer = snapshot
    assert_raises(ArgumentError) { review.decide!("apply", actor: nil) }
    newer.update!(parse_status: "failed")
    assert_raises(ArgumentError) { review.decide!("apply", actor: nil) }
    assert_equal "Old venue", event.reload.venue_name
  end

  test "failed, challenged and superseded snapshots cannot change events" do
    old = parsed_snapshot
    latest = snapshot
    latest.update!(parse_status: "failed")
    Asjjf::CalendarWatcher.new(old).call
    Asjjf::CalendarWatcher.new(latest).call
    assert_empty @org.events
    latest.update!(parse_status: "parsed", outcome: "challenged")
    Asjjf::CalendarWatcher.new(latest).call
    assert_empty @org.events
  end

  test "calendar evidence referenced by drafts and reviews survives retention" do
    old = parsed_snapshot
    Asjjf::CalendarWatcher.new(old).call
    old.update!(created_at: 200.days.ago, fetched_at: 200.days.ago)
    parsed_snapshot
    AsjjfSnapshot.prune!
    assert AsjjfSnapshot.exists?(old.id)
  end

  private

  def existing(**attributes)
    @org.events.create!({ name: "Copa", date: "2027-01-30", status: "upcoming", season_year: 2027,
      asjjf_event_ids: [ 2258, 2259 ], venue_name: "Old venue" }.merge(attributes))
  end

  def snapshot
    AsjjfSnapshot.create!(url: "https://asjjf.org/main/eventsBySeason/381", asjjf_id: 381, page_type: "season_calendar",
      html: @html, source: "admin_upload", outcome: "ok", fetched_at: Time.current, parse_status: "pending")
  end

  def parsed_snapshot
    saved = snapshot
    parsed = Asjjf::Parsers.parse(page_type: "season_calendar", html: @html, url: saved.url)
    saved.update!(parsed_summary: parsed, parse_status: "parsed", parsed_at: Time.current)
    saved
  end
end
