require "test_helper"

class PlanAsjjfCalendarJobTest < ActiveSupport::TestCase
  test "plans actual current and next season IDs and respects pending and leased deduplication" do
    travel_to Time.utc(2026, 11, 2) do
      2.times { PlanAsjjfCalendarJob.perform_now }
      assert_equal [ "https://asjjf.org/main/eventsBySeason/341", "https://asjjf.org/main/eventsBySeason/381" ], AsjjfFetchRequest.order(:url).pluck(:url)
      AsjjfFetchRequest.lease!(fetcher_id: "test")
      PlanAsjjfCalendarJob.perform_now
      assert_equal 2, AsjjfFetchRequest.count
      AsjjfFetchRequest.update_all(status: "done")
      PlanAsjjfCalendarJob.perform_now
      assert_equal 4, AsjjfFetchRequest.count
    end
  end

  test "a late published season can still be discovered after rollover" do
    travel_to Time.utc(2028, 1, 2) do
      PlanAsjjfCalendarJob.perform_now
      assert_equal [ "https://asjjf.org/main/eventsBySeason/381" ], AsjjfFetchRequest.pluck(:url)
    end
  end

  test "discovers future IDs from saved navigation without guessing" do
    travel_to Time.utc(2027, 12, 1) do
      PlanAsjjfCalendarJob.perform_now
      assert_equal 1, AsjjfFetchRequest.count
      AsjjfSnapshot.create!(url: "https://asjjf.org/main/eventsBySeason/381", asjjf_id: 381, page_type: "season_calendar",
        html: "saved", source: "admin_upload", outcome: "ok", fetched_at: Time.current, parse_status: "parsed",
        parsed_summary: { seasons: [ { year: 2028, id: 400 } ] })
      PlanAsjjfCalendarJob.perform_now
      assert_equal 2, AsjjfFetchRequest.count
      assert AsjjfFetchRequest.exists?(url: "https://asjjf.org/main/eventsBySeason/400")
    end
  end
end
