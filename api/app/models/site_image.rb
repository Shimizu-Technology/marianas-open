class SiteImage < ApplicationRecord
  include HasImageUrl

  # Placements that only allow a single active image at a time
  SINGLETON_PLACEMENTS = %w[hero about event_default].freeze

  has_one_attached :image

  validates :placement, presence: true, inclusion: { in: %w[hero featured about event_default] }

  before_save :enforce_singleton_active, if: :activating_singleton?

  scope :active, -> { where(active: true) }
  scope :by_placement, ->(p) { where(placement: p).order(:sort_order) }

  image_url_for :image

  def as_json(options = {})
    super(options.merge(
      methods: [:image_url],
      except: [:created_at, :updated_at]
    ))
  end

  private

  # Returns true when this record is being activated AND its placement only allows one active at a time.
  def activating_singleton?
    active? && SINGLETON_PLACEMENTS.include?(placement) && (new_record? || active_changed?(to: true) || placement_changed?)
  end

  # Deactivate all OTHER images with the same singleton placement before saving this one.
  def enforce_singleton_active
    SiteImage.where(placement: placement, active: true).where.not(id: id).update_all(active: false)
  end
end
