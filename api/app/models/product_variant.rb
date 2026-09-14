class ProductVariant < ApplicationRecord
  belongs_to :product
  has_many :product_variant_option_values, dependent: :destroy
  has_many :product_option_values, through: :product_variant_option_values
  has_many :product_images, dependent: :nullify
  has_many :inventory_levels, dependent: :restrict_with_error
  has_many :inventory_movements, dependent: :restrict_with_error

  before_validation :normalize_identifiers

  validates :name, :sku, :currency, presence: true
  validates :sku, uniqueness: { case_sensitive: false }
  validates :price_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :compare_at_price_cents, numericality: { only_integer: true, greater_than_or_equal_to: :price_cents }, allow_nil: true
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validates :country_of_origin, format: { with: /\A[A-Z]{2}\z/ }, allow_nil: true
  validates :weight_grams, :length_mm, :width_mm, :height_mm,
    numericality: { only_integer: true, greater_than: 0 }, allow_nil: true
  validate :fulfillment_matches_product
  validate :option_values_belong_to_product

  scope :available_for_sale, -> { where(active: true).order(:position, :id) }

  def available_quantity
    if inventory_levels.loaded?
      inventory_levels.sum(&:available)
    else
      inventory_levels.sum("on_hand - reserved")
    end
  end

  private

  def normalize_identifiers
    self.sku = sku.to_s.upcase
    self.currency = currency.to_s.upcase
    self.country_of_origin = country_of_origin.to_s.upcase.presence
  end

  def fulfillment_matches_product
    errors.add(:allow_shipping, "cannot be enabled for a pickup-only product") if allow_shipping? && !product&.shippable?
    errors.add(:allow_pickup, "cannot be enabled for a shipping-only product") if allow_pickup? && !product&.pickup_enabled?
    errors.add(:base, "Variant must support shipping, pickup, or both") unless allow_shipping? || allow_pickup?
  end

  def option_values_belong_to_product
    return if product.blank?

    invalid = product_option_values.any? { |value| value.product_option.product_id != product_id }
    errors.add(:product_option_values, "must belong to this product") if invalid
  end
end
