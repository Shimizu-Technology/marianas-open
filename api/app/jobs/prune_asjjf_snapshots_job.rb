class PruneAsjjfSnapshotsJob < ApplicationJob
  queue_as :default

  def perform
    AsjjfSnapshot.prune!
  end
end
