class FundAllocation < ApplicationRecord
  validates :category, presence: true
  validates :amount, presence: true, numericality: { greater_than_or_equal_to: 0 }

  scope :active, -> { where(active: true).order(:sort_order) }

  def percentage(total)
    return 0 if total.zero?
    (amount / total * 100).round(1)
  end

  def as_json(options = {})
    super(options.merge(except: [:updated_at]))
  end
end
