require "test_helper"

class EventRolloverServiceTest < ActiveSupport::TestCase
  setup do
    @org = Organization.create!(name: "Rollover", slug: "rollover")
    @actor = User.create!(clerk_id: "d1-admin", email: "d1@example.com", role: "admin")
    @source = @org.events.create!(name: "Copa 2026", slug: "copa-2026", status: "completed", season_year: 2026,
      date: "2026-01-30", end_date: "2026-01-31", venue_name: "Fieldhouse", venue_address: "Guam", city: "Mangilao", country: "Guam",
      tagline: "Fight in 2026", description: "Travel in 2026", travel_description: "Flights", visa_description: "Check visa rules",
      registration_url: "https://asjjf.org/main/eventInfo/2062", registration_url_gi: "https://asjjf.org/main/eventInfo/2062", registration_url_nogi: "https://asjjf.org/main/eventInfo/2063",
      registration_not_open: true, registration_steps: [ { title: "Old deadlines", url: "https://old.test" } ], registration_info_items: [ { label: "Deadline", value: "2026-01-01" } ],
      registration_fee_sections: [ { title: "Adults", rows: [ { fee: "$100" } ] } ],
      live_stream_active: true, live_stream_url: "https://youtube.com/old", asjjf_stars: 5, asjjf_event_ids: [ 2062 ],
      results_imported_at: Time.current, results_last_checked_at: Time.current, results_fetch_planned_at: Time.current, results_sync_status: "succeeded",
      ticket_sales_status: "on_sale", ticket_sales_url: "https://tickets.test", ticket_early_bird_ends_on: "2026-01-01",
      ticket_options: [ { label: "Old ticket", regular_price: "30" } ], ticket_in_person_name: "Old shop", ticket_in_person_phone: "123", ticket_in_person_address: "Old address",
      prize_pool: 5000, prize_title: "2026 Prize", prize_description: "Old breakdown", schedule_note: "2026 dates",
      travel_items: [ { title: "Airport", kind: "info", description: "Fly to GUM", url: "https://old.test", link_label: "Book" }, { title: "Flights", kind: "offer", code: "OLD2026", description: "Old offer" } ],
      translations: { ja: { description: "Old" } })
    run = @source.results_sync_runs.create!(trigger: "manual", status: "applied", applied_at: Time.current)
    @source.update!(results_sync_run_id: run.id)
    @source.event_schedule_items.create!(time: "9 AM", description: "Old schedule", translations: { ja: { description: "Old" } })
    @source.prize_categories.create!(name: "Absolute", amount: 5000, translations: { ja: { name: "Old" } })
    @source.event_accommodations.create!(hotel_name: "Hotel", description: "Review this", rate_info: "$100", booking_code: "OLD2026", booking_url: "https://old.test", check_in_date: "2026-01-29", check_out_date: "2026-02-01", inclusions: "Old package")
  end

  test "rollover copies only reusable structure and clears all season-specific facts" do
    event = rollover
    { name: "Copa 2027", status: "draft", season_year: 2027, source_event_id: @source.id, venue_name: "Fieldhouse", city: "Mangilao", country: "Guam", description: "Travel in 2026", travel_description: "Flights", visa_description: "Check visa rules", content_review_required: true, is_main_event: false,
      live_stream_active: false, ticket_sales_status: "unavailable", registration_not_open: false, asjjf_event_ids: [], translations: {}, registration_steps: [], registration_fee_sections: [], registration_info_items: [], ticket_options: [] }.each do |field, value|
      assert_equal value, event.public_send(field), field.to_s
    end
    %i[date end_date tagline registration_url registration_url_gi registration_url_nogi live_stream_url asjjf_stars results_imported_at results_last_checked_at results_fetch_planned_at results_sync_run_id results_sync_status ticket_sales_url ticket_early_bird_ends_on ticket_in_person_name ticket_in_person_phone ticket_in_person_address prize_pool prize_title prize_description schedule_note asjjf_info_id asjjf_info_snapshot_id].each do |field|
      assert_nil event.public_send(field), field.to_s
    end
    assert_equal [ { "title" => "Airport", "kind" => "info", "description" => "Fly to GUM" } ], event.travel_items
    assert_not event.hero_image.attached?
    assert_not event.poster_image.attached?
    assert_not event.ticket_banner_image.attached?
    assert_empty event.event_gallery_images
    assert_empty event.event_results
    assert_empty event.event_asjjf_sources
    assert_not event.event_schedule_items.first.confirmed?
    assert_equal "Old schedule", event.event_schedule_items.first.description
    assert_equal({}, event.event_schedule_items.first.translations)
    assert_not event.prize_categories.first.confirmed?
    assert_nil event.prize_categories.first.amount
    assert_equal({}, event.prize_categories.first.translations)
    hotel = event.event_accommodations.first
    assert_equal "Hotel", hotel.hotel_name
    assert_not hotel.active?
    %i[rate_info booking_code booking_url check_in_date check_out_date inclusions].each { |field| assert_nil hotel.public_send(field), field.to_s }
    assert_equal "rollover", event.event_audit_entries.first.action
    assert_equal @actor.id, event.event_audit_entries.first.actor_id
    assert_equal 2027, event.event_audit_entries.first.metadata["target_year"]
    assert_equal "completed", @source.reload.status
    assert_equal 5000, @source.prize_categories.first.amount
  end

  test "tagline requires opt-in and repeated copies have unique slugs" do
    first = rollover(keep_tagline: true)
    assert_equal "Fight in 2026", first.tagline
    second = rollover
    assert_not_equal first.slug, second.slug
  end

  test "whole season rollover is atomic when one ASJJF fact source is invalid" do
    @org.events.create!(name: "Second 2026", slug: "second-2026", date: "2026-05-01", status: "completed")
    assert_no_difference "Event.count" do
      assert_raises(ArgumentError) do
        SeasonRolloverService.call(source_year: 2026, target_year: 2027, actor: @actor, asjjf_event_ids: { @source.id.to_s => "invalid" })
      end
    end
    events = SeasonRolloverService.call(source_year: 2026, target_year: 2027, actor: @actor)
    assert_equal 2, events.size
    assert events.all? { |event| event.status == "draft" && event.season_year == 2027 }
  end

  test "invalid and nonfuture target seasons are rejected" do
    [ "2027junk", 0, 2200, 2026 ].each do |year|
      assert_raises(ArgumentError) { EventRolloverService.call(source_event: @source, target_year: year, actor: @actor) }
    end
  end

  private

  def rollover(**options)
    EventRolloverService.call(source_event: @source, target_year: 2027, actor: @actor, **options)
  end
end
