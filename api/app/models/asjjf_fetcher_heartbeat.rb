class AsjjfFetcherHeartbeat < ApplicationRecord
  validates :fetcher_id, presence: true, length: { maximum: 80 }
end
