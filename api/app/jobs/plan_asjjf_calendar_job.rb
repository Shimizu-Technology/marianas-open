class PlanAsjjfCalendarJob < ApplicationJob
  queue_as :default

  # These IDs are published in the saved calendar fixture; never extrapolate IDs.
  KNOWN_SEASONS = { 2026 => 341, 2027 => 381 }.freeze

  def perform
    seasons = KNOWN_SEASONS.dup
    AsjjfSnapshot.select(:id, :fetched_at, :parsed_summary).where(page_type: "season_calendar", outcome: "ok", parse_status: "parsed").order(:fetched_at, :id).each do |snapshot|
      Array(snapshot.parsed_summary["seasons"]).each { |season| seasons[season.fetch("year").to_i] = season.fetch("id").to_i }
    end
    planner = Asjjf::FetchPlanner.new(requested_by: "PlanAsjjfCalendarJob")
    # If ASJJF publishes a new season late, keep refreshing a known calendar's
    # navigation so discovery can recover after the year turns over.
    unless seasons[Date.current.year]
      known_year = seasons.keys.select { |year| year <= Date.current.year }.max
      planner.plan_season_calendar(seasons.fetch(known_year)) if known_year
    end
    [ Date.current.year, Date.current.year + 1 ].each do |year|
      if seasons[year]
        planner.plan_season_calendar(seasons.fetch(year))
      else
        Rails.logger.warn("[ASJJF] Calendar ID for #{year} not published in saved evidence yet; not guessing.")
      end
    end
  end
end
