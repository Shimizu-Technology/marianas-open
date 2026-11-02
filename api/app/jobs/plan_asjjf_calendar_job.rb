class PlanAsjjfCalendarJob < ApplicationJob
  queue_as :default

  # These IDs are published in the saved calendar fixture; never extrapolate IDs.
  KNOWN_SEASONS = { 2026 => 341, 2027 => 381 }.freeze

  def perform
    seasons = KNOWN_SEASONS.dup
    AsjjfSnapshot.where(page_type: "season_calendar", outcome: "ok", parse_status: "parsed").order(:fetched_at, :id).each do |snapshot|
      Array(snapshot.parsed_summary["seasons"]).each { |season| seasons[season.fetch("year").to_i] = season.fetch("id").to_i }
    end
    planner = Asjjf::FetchPlanner.new(requested_by: "PlanAsjjfCalendarJob")
    [ Date.current.year, Date.current.year + 1 ].each do |year|
      if seasons[year]
        planner.plan_season_calendar(seasons.fetch(year))
      else
        Rails.logger.warn("[ASJJF] Calendar ID for #{year} not published in saved evidence yet; not guessing.")
      end
    end
  end
end
