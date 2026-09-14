class OrderItem < ApplicationRecord
  belongs_to :order
  belongs_to :product
  belongs_to :product_variant

  validates :product_name, :variant_name, :sku, :currency, presence: true
  validates :product_variant_id, uniqueness: { scope: :order_id }
  validates :unit_price_cents, :line_total_cents,
    numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :quantity, numericality: { only_integer: true, greater_than: 0 }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validate :line_total_matches_price
  validate :catalog_records_match_order

  private

  def line_total_matches_price
    return if line_total_cents == unit_price_cents.to_i * quantity.to_i

    errors.add(:line_total_cents, "must equal unit price times quantity")
  end

  def catalog_records_match_order
    return if order.blank? || product.blank? || product_variant.blank?
    return if product_variant.product_id == product_id && product.organization_id == order.organization_id

    errors.add(:base, "Product and variant must belong to the order's organization")
  end
end
