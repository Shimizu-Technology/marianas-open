class ImpactMetric < ApplicationRecord
  CATEGORIES = %w[tourism competition economic community].freeze

  validates :label, presence: true
  validates :value, presence: true
  validates :category, presence: true, inclusion: { in: CATEGORIES }

  scope :active, -> { where(active: true).order(:sort_order) }
  scope :by_category, ->(cat) { where(category: cat) }
  scope :highlighted, -> { where(highlight: true) }

  def as_json(options = {})
    super(options.merge(except: [:updated_at]))
  end
end
