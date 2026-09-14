class InventoryLocation < ApplicationRecord
  belongs_to :organization
  has_many :inventory_levels, dependent: :restrict_with_error
  has_many :inventory_movements, dependent: :restrict_with_error

  validates :name, :code, presence: true
  validates :code, uniqueness: { scope: :organization_id, case_sensitive: false }

  before_validation { self.code = code.to_s.upcase }
end
