class ProductOptionValue < ApplicationRecord
  belongs_to :product_option
  has_many :product_variant_option_values, dependent: :restrict_with_error
  has_many :product_variants, through: :product_variant_option_values

  validates :value, presence: true, uniqueness: { scope: :product_option_id, case_sensitive: false }
end
