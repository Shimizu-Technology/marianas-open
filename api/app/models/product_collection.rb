class ProductCollection < ApplicationRecord
  belongs_to :organization
  has_many :product_collection_memberships, dependent: :destroy
  has_many :products, through: :product_collection_memberships

  validates :name, :slug, presence: true
  validates :slug, uniqueness: { scope: :organization_id }, format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/ }
  validate :organization_cannot_change, on: :update

  scope :published, -> { where(active: true).order(:sort_order, :name) }

  private

  def organization_cannot_change
    errors.add(:organization, "cannot be changed") if will_save_change_to_organization_id?
  end
end
