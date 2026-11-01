class PlanRankingSyncJob < ApplicationJob
  queue_as :default

  def perform
    season = AsjjfRankingSeason.current_season
    return unless season
    season.with_lock do
      latest_results = Event.where(date: Date.new(season.season_year, 1, 1)..Date.new(season.season_year, 12, 31))
        .where(results_imported_at: 3.days.ago..Time.current).maximum(:results_imported_at)
      new_results = latest_results && (season.last_results_imported_at.nil? || latest_results > season.last_results_imported_at)
      active = Date.current.year == season.season_year
      weekly = active && (season.last_planned_at.nil? || season.last_planned_at <= 7.days.ago)
      return unless weekly || new_results
      lists = season.asjjf_ranking_lists.to_a
      index_urls = lists.map(&:source_url)
      division_urls = AsjjfRankingDivision.where(asjjf_ranking_list_id: lists.map(&:id)).pluck(:asjjf_division_id)
        .map { |id| Asjjf::Url.build("individual_ranking_division", id) }
      return if AsjjfFetchRequest.where(url: index_urls + division_urls, status: %w[pending leased]).exists?
      planner = Asjjf::FetchPlanner.new(requested_by: "PlanRankingSyncJob")
      lists.group_by(&:asjjf_ranking_id).each do |id, configured|
        planner.plan_ranking(id, include_individual: configured.any? { |list| list.kind == "individual" },
          include_team: configured.any? { |list| list.kind == "team" })
      end
      season.update!(last_planned_at: Time.current, last_results_imported_at: latest_results || season.last_results_imported_at)
    end
  end
end
