class ProductVariantOptionValue < ApplicationRecord
  belongs_to :product_variant
  belongs_to :product_option
  belongs_to :product_option_value

  before_validation :derive_product_option

  validates :product_option_value_id, uniqueness: { scope: :product_variant_id }
  validates :product_option_id, uniqueness: { scope: :product_variant_id }
  validate :value_belongs_to_variant_product
  validate :value_belongs_to_option
  before_destroy :preserve_complete_active_variant

  private

  def value_belongs_to_variant_product
    return if product_variant.blank? || product_option_value.blank?
    return if product_variant.product_id == product_option_value.product_option.product_id

    errors.add(:product_option_value, "must belong to the variant's product")
  end

  def derive_product_option
    self.product_option = product_option_value&.product_option
  end

  def value_belongs_to_option
    return if product_option.blank? || product_option_value.blank?
    return if product_option_value.product_option_id == product_option_id

    errors.add(:product_option_value, "must belong to the selected option")
  end

  def preserve_complete_active_variant
    return unless product_variant.active?
    return if product_variant.destroying_with_option_values?

    errors.add(:base, "Deactivate the variant before changing its option selection")
    throw :abort
  end
end
