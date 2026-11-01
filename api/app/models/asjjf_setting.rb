class AsjjfSetting < ApplicationRecord
  def self.breaker
    create_or_find_by!(key: "circuit_breaker")
  end

  def open?
    paused_until.present? && paused_until > Time.current
  end

  def self.state
    breaker.attributes.slice("paused_until", "reason").merge("open" => breaker.open?)
  end

  def self.close!
    row = breaker
    row.with_lock { row.update!(paused_until: nil, alerted_at: nil, reason: nil) }
  end
end
