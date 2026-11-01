class EvaluateResultsSyncJob < ApplicationJob
  queue_as :default
  discard_on ActiveRecord::RecordNotFound
  limits_concurrency to: 1, key: ->(event_id) { event_id }, duration: 10.minutes

  def perform(event_id)
    Asjjf::ResultsSync.new(Event.find(event_id)).call(trigger: "snapshot")
  end
end
