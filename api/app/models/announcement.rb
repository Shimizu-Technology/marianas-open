class Announcement < ApplicationRecord
  include HasImageUrl

  has_one_attached :image

  validates :title, presence: true
  validates :announcement_type, inclusion: { in: %w[info event promo urgent] }

  image_url_for :image

  scope :active_now, -> {
    where(active: true)
      .where("starts_at IS NULL OR starts_at <= ?", Time.current)
      .where("ends_at IS NULL OR ends_at >= ?", Time.current)
      .order(sort_order: :asc, created_at: :desc)
  }

  def as_json(options = {})
    super(options.merge(
      methods: [:image_url],
      except: [:created_at, :updated_at]
    ))
  end
end
