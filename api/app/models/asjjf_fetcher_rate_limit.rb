require "digest"

class AsjjfFetcherRateLimit < ApplicationRecord
  def self.allow_request?(secret)
    bucket = create_or_find_by!(credential_digest: Digest::SHA256.hexdigest(secret))
    bucket.with_lock do
      if bucket.window_started_at.nil? || bucket.window_started_at <= 1.minute.ago
        bucket.window_started_at = Time.current
        bucket.request_count = 0
      end
      return false if bucket.request_count >= 60
      bucket.request_count += 1
      bucket.save!
      true
    end
  end
end
