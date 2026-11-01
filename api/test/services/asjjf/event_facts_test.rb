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
