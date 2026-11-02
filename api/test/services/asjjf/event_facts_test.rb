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

  test "verify links evidence to a published event without changing its wording" do
    snapshot = saved_snapshot
    facts = snapshot.parsed_summary
    reworded = Asjjf::EventFacts.registration_fields(facts)[:registration_fee_sections].map do |section|
      { title: section[:title].sub(/ Prices\z/, "").sub(/\AAdult\z/, "Adults"), rows: section[:rows].map do |row|
        { deadline: row[:deadline].sub(/ \d{1,2}:\d{2} [AP]M\z/, ""), fee: row[:fee], option: row[:option].downcase.capitalize }
      end }
    end
    @event.update!(status: "upcoming", date: "2027-01-30", venue_name: "UOG Calvo Fieldhouse", asjjf_stars: facts["stars"],
      registration_fee_sections: reworded, registration_not_open: true)
    assert_not EventReadiness.new(@event).call[:checks].find { |c| c[:key] == "stars" }[:complete]
    assert_not EventReadiness.new(@event).call[:checks].find { |c| c[:key] == "stale_year" }[:complete]
    service.verify(2258)
    @event.reload
    assert_equal "verified", @event.asjjf_info_status
    assert_equal snapshot.id, @event.asjjf_info_snapshot_id
    assert_equal "UOG Calvo Fieldhouse", @event.venue_name
    assert_equal reworded.as_json, @event.registration_fee_sections.as_json
    assert_equal "upcoming", @event.status
    assert_equal "asjjf_facts_verified", @event.event_audit_entries.last.action
    checks = EventReadiness.new(@event).call[:checks].index_by { |c| c[:key] }
    assert checks["stars"][:complete]
    assert checks["stale_year"][:complete], checks["stale_year"][:label]
    changed = reworded.deep_dup
    changed.first[:rows].first[:fee] = "$999"
    @event.update!(registration_fee_sections: changed)
    assert_not EventReadiness.new(@event).call[:checks].find { |c| c[:key] == "stale_year" }[:complete]
  end

  test "verify refuses missing evidence, different dates or a different star rating" do
    @event.update!(status: "upcoming", date: "2027-01-30", asjjf_stars: 3, registration_not_open: true)
    assert_raises(ArgumentError) { service.verify(2258) }
    facts = saved_snapshot.parsed_summary
    @event.update!(date: "2027-01-31")
    error = assert_raises(ArgumentError) { service.verify(2258) }
    assert_includes error.message, "2027-01-30"
    @event.update!(date: "2027-01-30", asjjf_stars: facts["stars"].to_i + 1)
    assert_raises(ArgumentError) { service.verify(2258) }
    assert_nil @event.reload.asjjf_info_snapshot_id
    @event.update!(asjjf_stars: nil)
    service.verify(2258)
    assert_equal "verified", @event.reload.asjjf_info_status
    assert_nil @event.asjjf_stars
    assert_raises(ArgumentError) { service.verify("abc") }
  end

  test "reworded fees stop matching evidence when they add surcharges, years, notes or empty sections" do
    facts = saved_snapshot.parsed_summary
    base = Asjjf::EventFacts.registration_fields(facts)[:registration_fee_sections].map do |section|
      { title: section[:title], rows: section[:rows].map { |row| row.merge(deadline: row[:deadline].sub(/ \d{1,2}:\d{2} [AP]M\z/, "")) } }
    end
    @event.update!(status: "upcoming", date: "2027-01-30", registration_not_open: true, registration_fee_sections: base)
    service.verify(2258)
    stale = -> { EventReadiness.new(@event.reload).call[:checks].find { |c| c[:key] == "stale_year" }[:complete] }
    assert stale.call
    variants = {
      surcharge: ->(s) { s.first[:rows].first[:fee] = "$55 + $20 surcharge (2025 policy)" },
      deadline_note: ->(s) { s.first[:rows].first[:deadline] += " (2025 fees)" },
      deadline_without_year: ->(s) { s.first[:rows].first[:deadline] = "Until November 21" },
      title_year: ->(s) { s.first[:title] = "Kids Prices 2025" },
      combined_group: ->(s) { s.first[:title] = "Kids and Adults" },
      empty_section: ->(s) { s << { title: "Adults 2025", rows: [] } }
    }
    variants.each do |name, change|
      changed = base.deep_dup
      change.call(changed)
      @event.update!(registration_fee_sections: changed)
      assert_not stale.call, name.to_s
    end
  end

  test "verify compares both ends of multi-day ranges and treats zero stars as a rating" do
    facts = saved_snapshot.parsed_summary
    @event.update!(status: "upcoming", date: "2027-01-30", end_date: "2027-01-31", registration_not_open: true)
    assert_raises(ArgumentError) { service.verify(2258) }
    @event.update!(end_date: nil, asjjf_stars: 0)
    assert_raises(ArgumentError) { service.verify(2258) } unless facts["stars"].to_i.zero?
    @event.update!(asjjf_stars: nil)
    service.verify(2258)
    assert_equal "verified", @event.reload.asjjf_info_status
  end

  test "verify rolls back the evidence link when the audit entry cannot be saved" do
    snapshot = saved_snapshot
    @event.update!(status: "upcoming", date: "2027-01-30", registration_not_open: true)
    entries = @event.event_audit_entries
    entries.define_singleton_method(:create!) { |*| raise ActiveRecord::RecordInvalid }
    @event.define_singleton_method(:event_audit_entries) { entries }
    assert_raises(ActiveRecord::RecordInvalid) { service.verify(2258) }
    assert_nil Event.find(@event.id).asjjf_info_snapshot_id
    assert_not_equal snapshot.id, Event.find(@event.id).asjjf_info_snapshot_id
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
