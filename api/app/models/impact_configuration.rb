class ImpactConfiguration < ApplicationRecord
  validates :economic_impact, numericality: { greater_than_or_equal_to: 0 }

  def self.current
    first_or_create!
  end

  def roi_multiplier(investment)
    return 0 if investment.zero? || economic_impact.zero?
    (economic_impact / investment).round(1)
  end

  def as_json(options = {})
    super(options.merge(except: [:created_at, :updated_at]))
  end
end
