class InventoryLevel < ApplicationRecord
  belongs_to :product_variant
  belongs_to :inventory_location

  validates :product_variant_id, uniqueness: { scope: :inventory_location_id }
  validates :on_hand, :reserved, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :reserved_cannot_exceed_on_hand
  validate :location_belongs_to_product_organization

  def available
    on_hand - reserved
  end

  private

  def reserved_cannot_exceed_on_hand
    errors.add(:reserved, "cannot exceed stock on hand") if reserved.to_i > on_hand.to_i
  end

  def location_belongs_to_product_organization
    return if product_variant.blank? || inventory_location.blank?
    return if product_variant.product&.organization == inventory_location.organization

    errors.add(:inventory_location, "must belong to the product's organization")
  end
end
