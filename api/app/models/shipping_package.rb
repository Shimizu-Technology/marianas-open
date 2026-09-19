class ShippingPackage < ApplicationRecord
  belongs_to :organization
  has_many :shipping_quotes, dependent: :restrict_with_error

  validates :name, presence: true, uniqueness: { scope: :organization_id, case_sensitive: false }
  validates :length_mm, :width_mm, :height_mm, :max_weight_grams,
    numericality: { only_integer: true, greater_than: 0 }
  validates :empty_weight_grams, :sort_order,
    numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :available, -> { where(active: true).order(:sort_order, :id) }
  scope :for_checkout, -> { available.where(demo_only: Commerce::Configuration.poc_mode?) }

  def fits_weight?(contents_weight_grams)
    contents_weight_grams + empty_weight_grams <= max_weight_grams
  end
end
