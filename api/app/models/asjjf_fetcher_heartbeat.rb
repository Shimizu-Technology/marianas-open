class AsjjfFetcherHeartbeat < ApplicationRecord
  validates :fetcher_id, presence: true, length: { maximum: 80 }

  def self.allow_request?(fetcher_id)
    heartbeat = create_or_find_by!(fetcher_id: fetcher_id)
    heartbeat.with_lock do
      if heartbeat.rate_window_started_at.nil? || heartbeat.rate_window_started_at <= 1.minute.ago
        heartbeat.rate_window_started_at = Time.current
        heartbeat.rate_count = 0
      end
      return false if heartbeat.rate_count >= 60
      heartbeat.rate_count += 1
      heartbeat.save!
      true
    end
  end
end
