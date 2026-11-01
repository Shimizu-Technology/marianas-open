class AsjjfFetchRequest < ApplicationRecord
  MAX_ATTEMPTS = 5
  LEASE_DURATION = 45.minutes
  STATUSES = %w[pending leased done blocked failed cancelled].freeze

  belongs_to :snapshot, class_name: "AsjjfSnapshot", optional: true
  validates :page_type, inclusion: { in: Asjjf::Url::PAGE_PATHS.keys }
  validates :status, inclusion: { in: STATUSES }
  validate :safe_url

  def self.enqueue!(url:, page_type:, **attributes)
    Asjjf::Url.parse(url, page_type: page_type)
    # One short database lock serializes queue/breaker transitions across API workers.
    AsjjfSetting.breaker.with_lock do
      existing = find_by(url: url, status: %w[pending leased])
      if existing
        existing.update!(include_divisions: true) if attributes[:include_divisions] && !existing.include_divisions?
        existing
      else
        create!(attributes.merge(url: url, page_type: page_type))
      end
    end
  end

  def self.lease!(fetcher_id:, limit: 10)
    AsjjfSetting.breaker.with_lock do
      expired = where(status: "leased").where("lease_expires_at <= ?", Time.current)
      expired.where("attempts >= ?", MAX_ATTEMPTS).update_all(status: "failed", last_error: "Lease expired; maximum attempts reached", leased_by: nil, lease_expires_at: nil, updated_at: Time.current)
      expired.update_all(status: "pending", leased_by: nil, lease_expires_at: nil, updated_at: Time.current)
      return [] if AsjjfSetting.breaker.open?
      where(status: "pending").where("attempts >= ?", MAX_ATTEMPTS).update_all(status: "failed", updated_at: Time.current)
      requests = where(status: "pending").order(priority: :desc, created_at: :asc, id: :asc).limit(limit.clamp(1, 20)).lock.to_a
      requests.each do |item|
        item.update!(status: "leased", leased_by: fetcher_id, lease_expires_at: LEASE_DURATION.from_now, attempts: item.attempts + 1)
      end
      requests
    end
  end

  private

  def safe_url
    Asjjf::Url.parse(url, page_type: page_type)
  rescue ArgumentError => e
    errors.add(:url, e.message)
  end
end
