class SiteImage < ApplicationRecord
  include HasImageUrl

  has_one_attached :image

  validates :placement, presence: true, inclusion: { in: %w[hero gallery about event_default sponsor_default] }

  scope :active, -> { where(active: true) }
  scope :by_placement, ->(p) { where(placement: p).order(:sort_order) }

  image_url_for :image

  def as_json(options = {})
    super(options.merge(
      methods: [:image_url],
      except: [:created_at, :updated_at]
    ))
  end
end
