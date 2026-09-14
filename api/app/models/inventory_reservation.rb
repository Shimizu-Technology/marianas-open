class InventoryReservation < ApplicationRecord
  STATUSES = %w[active consumed released].freeze

  belongs_to :order
  belongs_to :product_variant
  belongs_to :inventory_location

  validates :product_variant_id, uniqueness: { scope: :order_id }
  validates :quantity, numericality: { only_integer: true, greater_than: 0 }
  validates :status, inclusion: { in: STATUSES }
  validates :expires_at, presence: true
  validate :fulfillment_records_match_order

  scope :active, -> { where(status: "active") }

  private

  def fulfillment_records_match_order
    return if order.blank? || product_variant.blank? || inventory_location.blank?
    return if inventory_location_id == order.inventory_location_id &&
      product_variant.product.organization_id == order.organization_id

    errors.add(:base, "Reservation records must match the order's organization and fulfillment location")
  end
end
