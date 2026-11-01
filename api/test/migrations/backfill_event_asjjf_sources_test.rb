require "test_helper"
require Rails.root.join("db/migrate/20261102130100_backfill_event_asjjf_sources")

class BackfillEventAsjjfSourcesTest < ActiveSupport::TestCase
  test "backfill is repeatable, URL discipline wins and existing results stay untouched" do
    org = Organization.create!(name: "B1", slug: "b1")
    event = org.events.create!(name: "B1", slug: "b1", asjjf_event_ids: [ 2062, 2063, 9 ], registration_url_gi: "https://asjjf.org/main/eventInfo/2062", registration_url_nogi: "https://asjjf.org/main/eventInfo/2063")
    2.times { BackfillEventAsjjfSources.new.migrate(:up) }
    assert_equal 3, event.event_asjjf_sources.count
    assert_equal "gi", event.event_asjjf_sources.find_by!(asjjf_event_id: 2062).discipline
    assert_equal "nogi", event.event_asjjf_sources.find_by!(asjjf_event_id: 2063).discipline
    assert_equal "unknown", event.event_asjjf_sources.find_by!(asjjf_event_id: 9).discipline
    assert_equal [ 2062, 2063, 9 ], event.reload.asjjf_event_ids
    source = event.event_asjjf_sources.find_by!(asjjf_event_id: 2062)
    source.update!(discipline: "nogi", derived_from: "admin")
    BackfillEventAsjjfSources.new.migrate(:up)
    assert_equal "nogi", source.reload.discipline
  end
end
