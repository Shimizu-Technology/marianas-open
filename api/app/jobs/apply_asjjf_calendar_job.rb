class ApplyAsjjfCalendarJob < ApplicationJob
  queue_as :default

  def perform(snapshot_id)
    Asjjf::CalendarWatcher.new(AsjjfSnapshot.find(snapshot_id)).call
  end
end
