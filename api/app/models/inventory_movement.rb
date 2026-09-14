class InventoryMovement < ApplicationRecord
  REASONS = %w[received adjustment correction returned damaged sold].freeze

  belongs_to :product_variant
  belongs_to :inventory_location
  belongs_to :performed_by, class_name: "User", optional: true

  validates :reason, inclusion: { in: REASONS }
  validates :quantity_delta, numericality: { only_integer: true, other_than: 0 }
  validates :balance_after, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
end
