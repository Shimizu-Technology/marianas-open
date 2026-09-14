class ShippingQuote < ApplicationRecord
  belongs_to :organization
  belongs_to :inventory_location
  belongs_to :shipping_package
  has_one :order, dependent: :restrict_with_error

  validates :cart_digest, :destination_digest, :provider, :provider_shipment_id,
    :provider_rate_id, :carrier, :service, :currency, :expires_at, presence: true
  validates :provider_rate_id, uniqueness: true
  validates :amount_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }

  def expired?
    expires_at <= Time.current
  end

  def checkout_token
    seconds_remaining = [ (expires_at - Time.current).to_i, 1 ].max
    signed_id(expires_in: seconds_remaining.seconds, purpose: :commerce_shipping_quote)
  end

  def self.find_checkout_token!(token)
    find_signed!(token, purpose: :commerce_shipping_quote)
  end
end
