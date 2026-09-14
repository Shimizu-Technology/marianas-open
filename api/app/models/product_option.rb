class ProductOption < ApplicationRecord
  belongs_to :product
  has_many :product_option_values, -> { order(:position, :id) }, dependent: :destroy

  validates :name, presence: true, uniqueness: { scope: :product_id, case_sensitive: false }
  validate :product_has_no_active_variants, on: :create

  private

  def product_has_no_active_variants
    return if product.blank? || product.product_variants.none?(&:active?)

    errors.add(:base, "Deactivate the product's variants before adding an option")
  end
end
