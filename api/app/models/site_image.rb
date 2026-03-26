class SiteImage < ApplicationRecord
  include HasImageUrl

  PLACEMENTS = %w[hero featured about event_default].freeze
  SINGLETON_PLACEMENTS = %w[hero about event_default].freeze

  has_one_attached :image

  validates :placement, presence: true, inclusion: { in: PLACEMENTS }

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

  def activating_singleton?
    active? && SINGLETON_PLACEMENTS.include?(placement) && (new_record? || active_changed?(to: true) || placement_changed?)
  end

  def enforce_singleton_active
    SiteImage.where(placement: placement, active: true).where.not(id: id).update_all(active: false, updated_at: Time.current)
  end
end
