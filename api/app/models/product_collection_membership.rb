class ProductCollectionMembership < ApplicationRecord
  belongs_to :product_collection
  belongs_to :product

  validates :product_id, uniqueness: { scope: :product_collection_id }
  validate :same_organization

  private

  def same_organization
    return if product.blank? || product_collection.blank?
    return if product.organization_id == product_collection.organization_id

    errors.add(:product, "must belong to the same organization as the collection")
  end
end
