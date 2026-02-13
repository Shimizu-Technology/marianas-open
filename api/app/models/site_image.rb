class SiteImage < ApplicationRecord
  has_one_attached :image

  validates :placement, presence: true, inclusion: { in: %w[hero gallery about event_default sponsor_default] }

  scope :active, -> { where(active: true) }
  scope :by_placement, ->(p) { where(placement: p).order(:sort_order) }

  def image_url
    return nil unless image.attached?
    Rails.application.routes.url_helpers.url_for(image)
  rescue StandardError
    nil
  end

  def as_json(options = {})
    super(options.merge(
      methods: [:image_url],
      except: [:created_at, :updated_at]
    ))
  end
end
