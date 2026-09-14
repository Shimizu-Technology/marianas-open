class Organization < ApplicationRecord
  has_many :products, dependent: :restrict_with_error
  has_many :product_collections, dependent: :restrict_with_error
  has_many :inventory_locations, dependent: :restrict_with_error
  has_many :shipping_packages, dependent: :restrict_with_error
  has_many :shipping_quotes, dependent: :restrict_with_error
  has_many :orders, dependent: :restrict_with_error
  include HasImageUrl

  has_many :events, dependent: :destroy
  has_many :sponsors, dependent: :destroy
  has_one_attached :logo
  has_one_attached :banner

  image_url_for :logo, :banner

  def as_json(options = {})
    super(options.merge(
      methods: [ :logo_url, :banner_url ],
      except: [ :created_at, :updated_at ]
    ))
  end
end
