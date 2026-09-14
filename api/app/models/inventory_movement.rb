class InventoryMovement < ApplicationRecord
  REASONS = %w[received adjustment correction returned damaged sold].freeze
  CREATION_CONTEXT = Object.new.freeze
  private_constant :CREATION_CONTEXT

  belongs_to :product_variant
  belongs_to :inventory_location
  belongs_to :performed_by, class_name: "User", optional: true

  validates :reason, inclusion: { in: REASONS }
  validates :quantity_delta, numericality: { only_integer: true, other_than: 0 }
  validates :balance_after, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :created_by_inventory_service, on: :create

  attr_accessor :creation_context

  def self.record_adjustment!(attributes)
    movement = new(attributes)
    movement.creation_context = CREATION_CONTEXT
    movement.save!
    movement
  end

  def readonly?
    persisted?
  end

  private

  def created_by_inventory_service
    return if creation_context.equal?(CREATION_CONTEXT)

    errors.add(:base, "Inventory movements must be recorded through the inventory service")
  end
end
