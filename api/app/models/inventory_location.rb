class InventoryLocation < ApplicationRecord
  belongs_to :organization
  has_many :inventory_levels, dependent: :restrict_with_error
  has_many :inventory_movements, dependent: :restrict_with_error
  has_many :shipping_quotes, dependent: :restrict_with_error

  validates :name, :code, presence: true
  validates :code, uniqueness: { scope: :organization_id, case_sensitive: false }
  validate :fulfillment_address_is_complete

  before_validation { self.code = code.to_s.upcase }

  PUBLIC_ADDRESS_KEYS = %w[street1 street2 city state zip country].freeze

  def public_address
    address.to_h.slice(*PUBLIC_ADDRESS_KEYS)
  end

  private

  def fulfillment_address_is_complete
    return unless pickup_enabled? || shipping_enabled?

    required = %w[street1 city state zip country]
    missing = required.select { |key| address.to_h[key].blank? }
    errors.add(:address, "is missing #{missing.join(', ')}") if missing.any?
  end
end
