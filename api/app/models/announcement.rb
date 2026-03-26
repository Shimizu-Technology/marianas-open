class Announcement < ApplicationRecord
  validates :title, presence: true
  validates :announcement_type, inclusion: { in: %w[info event promo urgent] }

  scope :active_now, -> {
    where(active: true)
      .where("starts_at IS NULL OR starts_at <= ?", Time.current)
      .where("ends_at IS NULL OR ends_at >= ?", Time.current)
      .order(sort_order: :asc, created_at: :desc)
  }
end
