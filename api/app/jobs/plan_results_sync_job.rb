class PlanResultsSyncJob < ApplicationJob
  queue_as :default

  def perform
    today = Time.current.in_time_zone("Pacific/Guam").to_date
    Event.where.not(status: %w[draft cancelled]).where("COALESCE(end_date, date) < ?", today).find_each do |event|
      days = (today - (event.end_date || event.date)).to_i
      empty = !event.event_results.exists?
      next unless empty || (1..60).cover?(days)
      interval = days <= 21 || empty ? 1.day : 7.days
      next if event.results_fetch_planned_at && event.results_fetch_planned_at > interval.ago
      event.with_lock do
        next if event.results_fetch_planned_at && event.results_fetch_planned_at > interval.ago
        requests = Asjjf::FetchPlanner.new(requested_by: "PlanResultsSyncJob").plan_event_results(event)
        next if requests.empty?
        event.update_columns(results_fetch_planned_at: Time.current)
        Asjjf::ResultsSync.new(event).call(trigger: "scheduled")
      end
    end
  end
end
