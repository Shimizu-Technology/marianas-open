require "test_helper"

class EventReadinessTest < ActiveSupport::TestCase
  setup do
    org = Organization.create!(name: "D1 readiness", slug: "readiness")
    @event = org.events.create!(name: "Copa 2027", slug: "copa-ready-2027", status: "draft", season_year: 2027, date: "2027-01-30", venue_name: "Fieldhouse", registration_not_open: true)
  end

  test "readiness has fix destinations and blocks unsafe copied content" do
    assert readiness[:publishable]
    @event.event_schedule_items.create!(time: "9 AM", description: "Opening", confirmed: false)
    @event.prize_categories.create!(name: "Absolute", amount: nil, confirmed: false)
    @event.update!(description: "Register in 2026", content_review_required: true, asjjf_stars: 5)
    checks = readiness[:checks].index_by { |item| item[:key] }
    %w[schedule prizes stale_year content_review stars].each { |key| assert_not checks[key][:complete], key }
    assert readiness[:checks].all? { |item| item[:section].present? }
    @event.event_schedule_items.first.update!(confirmed: true)
    @event.prize_categories.first.update!(confirmed: true, amount: 1000)
    @event.update!(description: "Register in 2027", content_review_required: false, asjjf_stars: nil)
    assert readiness[:publishable]
  end

  test "registration requires safe URL or explicit not-open choice" do
    @event.update!(registration_not_open: false, registration_url: "javascript:alert(1)")
    assert_not readiness[:publishable]
    @event.update!(registration_url: "https://asjjf.org/main/eventInfo/2258")
    assert readiness[:publishable]
  end

  test "dates must agree with season and end after start" do
    @event.date = Date.new(2026, 1, 30)
    assert_not readiness[:publishable]
    @event.date = Date.new(2027, 1, 30)
    @event.end_date = Date.new(2027, 1, 29)
    assert_not readiness[:publishable]
  end

  test "stale years in nested text and hotels block readiness" do
    @event.travel_items = [ { kind: "info", title: "Travel", description: "Book by 2026" } ]
    assert_not readiness[:publishable]
    @event.travel_items = []
    @event.event_accommodations.create!(hotel_name: "Hotel 2026")
    assert_not readiness[:publishable]
  end

  private

  def readiness
    EventReadiness.new(@event).call
  end
end
