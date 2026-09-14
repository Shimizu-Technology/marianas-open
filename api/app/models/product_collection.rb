class ProductCollection < ApplicationRecord
  belongs_to :organization
  has_many :product_collection_memberships, dependent: :destroy
  has_many :products, through: :product_collection_memberships

  validates :name, :slug, presence: true
  validates :slug, uniqueness: { scope: :organization_id }, format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/ }

  scope :published, -> { where(active: true).order(:sort_order, :name) }
end
