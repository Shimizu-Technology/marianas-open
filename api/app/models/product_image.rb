class ProductImage < ApplicationRecord
  ACCEPTED_TYPES = %w[image/jpeg image/png image/webp].freeze

  belongs_to :product
  belongs_to :product_variant, optional: true
  has_one_attached :image

  validates :alt_text, length: { maximum: 160 }
  validate :variant_belongs_to_product
  validate :acceptable_image

  private

  def variant_belongs_to_product
    return if product_variant.blank? || product_variant.product == product

    errors.add(:product_variant, "must belong to this product")
  end

  def acceptable_image
    return unless image.attached?
    return if ACCEPTED_TYPES.include?(image.blob.content_type)

    errors.add(:image, "must be a JPEG, PNG, or WebP image")
  end
end
