require "test_helper"

class AsjjfEventFactsTest < ActiveSupport::TestCase
  setup do
    org = Organization.create!(name: "D1 facts", slug: "facts")
    @event = org.events.create!(name: "Copa 2027", slug: "facts-2027", status: "draft", season_year: 2027)
    @user = User.create!(clerk_id: "facts-admin", email: "facts@example.com", role: "admin")
  end

  test "missing snapshot queues information and never guesses facts" do
    service.call(2258)
    assert_equal "pending", @event.reload.asjjf_info_status
    assert_nil @event.date
    assert_nil @event.asjjf_stars
    assert_nil @event.venue_name
    assert_equal 1, AsjjfFetchRequest.where(page_type: "event_info").count
    service.call(2258)
    assert_equal 1, AsjjfFetchRequest.where(page_type: "event_info").count
  end

  test "parsed saved snapshot supplies dates venue stars fees and deadlines with provenance" do
    snapshot = saved_snapshot
    service.call(2258)
    assert_equal "applied", @event.reload.asjjf_info_status
    assert_equal Date.new(2027, 1, 30), @event.date
    assert_equal "University Of Guam Calvo Fieldhouse", @event.venue_name
    assert_equal snapshot.parsed_summary["stars"], @event.asjjf_stars
    assert_equal snapshot.id, @event.asjjf_info_snapshot_id
    assert_not_empty @event.registration_fee_sections
    assert_equal 3, @event.registration_info_items.size
    assert EventReadiness.new(@event).call[:publishable]
    @event.update!(asjjf_stars: 99)
    assert_not EventReadiness.new(@event).call[:publishable]
  end

  test "wrong season facts fail atomically and public events cannot replace facts" do
    saved_snapshot
    @event.update!(season_year: 2028)
    assert_raises(ArgumentError) { service.call(2258) }
    assert_nil @event.reload.date
    assert_empty @event.event_asjjf_sources
    @event.update!(status: "upcoming")
    assert_raises(ArgumentError) { service.call(2258) }
  end

  test "changing facts IDs never adds or removes independently configured results sources" do
    @event.event_asjjf_sources.create!(asjjf_event_id: 2062, discipline: "gi", derived_from: "admin")
    service.call(2258)
    service.call(2259)
    assert_equal [ 2062 ], @event.event_asjjf_sources.pluck(:asjjf_event_id)
    assert_equal 2259, @event.reload.asjjf_info_id
    assert_equal [ 2062 ], Asjjf::FetchPlanner.new.sources_for(@event).map(&:asjjf_event_id)
    assert_equal [ "https://asjjf.org/main/eventInfo/2259" ], Asjjf::FetchPlanner.new.plan_event_info(@event, asjjf_id: 2259).map(&:url)
  end

  test "stale draft instances cannot overwrite facts after another request publishes" do
    stale = Event.find(@event.id)
    @event.update!(status: "upcoming", venue_name: "Published venue")
    assert_raises(ArgumentError) { Asjjf::EventFacts.new(stale, actor: @user).call(2258) }
    assert_nil @event.reload.asjjf_info_id
    assert_equal "Published venue", @event.venue_name
  end

  test "verified prior-year registration dates permit staff publishing but changed stale text does not" do
    saved_snapshot
    service.call(2258)
    assert_includes @event.registration_fee_sections.to_json, "2026"
    assert_includes @event.registration_info_items.to_json, "2026"
    staff = User.create!(clerk_id: "facts-staff", email: "facts-staff@example.com", role: "staff")
    EventPublishingService.call(event: @event, actor: staff, attributes: { status: "upcoming" }, action: "publish")
    assert_equal "upcoming", @event.reload.status
    @event.update!(status: "draft", registration_info_items: [ { label: "Manual old deadline", value: "2026-01-01" } ])
    assert_not EventReadiness.new(@event).call[:publishable]
  end

  private

  def service
    Asjjf::EventFacts.new(@event, actor: @user)
  end

  def saved_snapshot
    snapshot = AsjjfSnapshot.new(url: "https://asjjf.org/main/eventInfo/2258", page_type: "event_info", asjjf_id: 2258, outcome: "ok", source: "admin_upload", fetched_at: Time.current)
    snapshot.html = file_fixture("asjjf/event_info_2258_copa_gi.html").read
    snapshot.save!
    ParseAsjjfSnapshotJob.perform_now(snapshot.id)
    snapshot.reload
  end
end
