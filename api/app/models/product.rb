class Product < ApplicationRecord
  belongs_to :organization
  has_many :product_collection_memberships, dependent: :destroy
  has_many :product_collections, through: :product_collection_memberships
  has_many :product_variants, -> { order(:position, :id) }, dependent: :destroy
  has_many :product_options, -> { order(:position, :id) }, dependent: :destroy
  has_many :product_option_values, through: :product_options
  has_many :product_images, -> { order(:sort_order, :id) }, dependent: :destroy
  has_many :order_items, dependent: :restrict_with_error

  validates :name, :slug, presence: true
  validates :slug, uniqueness: { scope: :organization_id }, format: { with: /\A[a-z0-9]+(?:-[a-z0-9]+)*\z/ }
  before_validation :lock_row_for_demo_only_change, on: :update
  validate :offers_at_least_one_fulfillment_method
  validate :organization_cannot_change, on: :update
  validate :demo_only_cannot_change_after_orders, on: :update

  scope :published, -> { where(active: true).order(featured: :desc, sort_order: :asc, name: :asc) }

  private

  def offers_at_least_one_fulfillment_method
    return if shippable? || pickup_enabled?

    errors.add(:base, "Product must support shipping, pickup, or both")
  end

  def organization_cannot_change
    errors.add(:organization, "cannot be changed") if will_save_change_to_organization_id?
  end

  def demo_only_cannot_change_after_orders
    return unless will_save_change_to_demo_only? && order_items.exists?

    errors.add(:demo_only, "cannot be changed after an order contains this product")
  end

  def lock_row_for_demo_only_change
    self.class.lock.find(id) if will_save_change_to_demo_only?
  end
end
