require "test_helper"

class AsjjfCalendarAlertTest < ActiveSupport::TestCase
  test "one email describes a whole calendar run and no-change runs are quiet" do
    org = Organization.create!(name: "Marianas", slug: "marianas-open")
    html = File.read(Rails.root.join("test/fixtures/files/asjjf/season_calendar_381.html"))
    saved = AsjjfSnapshot.create!(url: "https://asjjf.org/main/eventsBySeason/381", asjjf_id: 381, page_type: "season_calendar", html: html,
      source: "admin_upload", outcome: "ok", parse_status: "parsed", fetched_at: Time.current,
      parsed_summary: Asjjf::Parsers.parse(page_type: "season_calendar", html: html, url: "https://asjjf.org/main/eventsBySeason/381"))
    keys = %w[ASJJF_ALERT_EMAILS RESEND_FROM_EMAIL RESEND_API_KEY]
    previous = keys.to_h { |key| [ key, ENV[key] ] }
    ENV["ASJJF_ALERT_EMAILS"] = "admin@example.com, second@example.com"
    ENV["RESEND_FROM_EMAIL"] = "events@example.com"
    ENV["RESEND_API_KEY"] = "test-no-network"
    deliveries = []
    original = Resend::Emails.method(:send)
    Resend::Emails.define_singleton_method(:send) { |message| deliveries << message }
    Asjjf::CalendarWatcher.new(saved).call
    assert_equal 4, org.events.count
    assert_equal 1, deliveries.size
    assert_equal [ "admin@example.com", "second@example.com" ], deliveries.first[:to]
    assert_includes deliveries.first[:text], "4 new drafts"
    assert_includes deliveries.first[:text], saved.url
    Asjjf::CalendarWatcher.new(saved).call
    fresh = saved.dup
    fresh.fetched_at = 1.minute.from_now
    fresh.save!
    Asjjf::CalendarWatcher.new(fresh).call
    assert_equal 1, deliveries.size
    org.events.first.update!(status: "upcoming", venue_name: "Changed")
    another = saved.dup
    another.fetched_at = 2.minutes.from_now
    another.save!
    Asjjf::CalendarWatcher.new(another).call
    assert_equal 2, deliveries.size
    assert_includes deliveries.last[:text], "1 changes or warnings"
  ensure
    Resend::Emails.define_singleton_method(:send, original) if original
    previous&.each { |key, value| value.nil? ? ENV.delete(key) : ENV[key] = value }
  end
end
