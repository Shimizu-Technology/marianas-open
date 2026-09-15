class Order < ApplicationRecord
  STATUSES = %w[pending_payment paid payment_failed expired cancelled].freeze
  FULFILLMENT_METHODS = %w[shipping pickup].freeze

  belongs_to :organization
  belongs_to :inventory_location
  belongs_to :shipping_quote, optional: true
  has_many :order_items, dependent: :restrict_with_error
  has_many :inventory_reservations, dependent: :restrict_with_error
  has_many :payment_events, dependent: :nullify
  has_many :order_notifications, dependent: :restrict_with_error
  has_many :order_refunds, dependent: :restrict_with_error
  has_one :fulfillment, dependent: :restrict_with_error
  has_one :shipment, dependent: :restrict_with_error

  before_validation :assign_number, on: :create
  before_validation :normalize_contact

  validates :number, :checkout_key, :status, :fulfillment_method, :customer_name,
    :customer_email, :currency, :payment_expires_at, presence: true
  validates :number, uniqueness: { scope: :organization_id }
  validates :checkout_key, uniqueness: true, format: { with: /\A[0-9a-f-]{36}\z/i }
  validates :status, inclusion: { in: STATUSES }
  validates :fulfillment_method, inclusion: { in: FULFILLMENT_METHODS }
  validates :customer_email, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validates :subtotal_cents, :shipping_cents, :tax_cents, :total_cents,
    numericality: { only_integer: true, greater_than_or_equal_to: 0 }
  validate :total_matches_parts
  validate :shipping_details_match_method
  validate :fulfillment_records_belong_to_organization

  scope :awaiting_payment, -> { where(status: "pending_payment") }

  STATUSES.each do |value|
    define_method("#{value}?") { status == value }
  end

  def public_token
    signed_id(purpose: :commerce_order)
  end

  def refunded_cents
    refund_amount_for([ "succeeded" ])
  end

  def refundable_cents
    # This value guards money movement, so always read the locked database state
    # rather than a potentially preloaded association.
    reserved = order_refunds.where(status: OrderRefund::RESERVING_STATUSES).sum(:amount_cents)
    [ total_cents - reserved, 0 ].max
  end

  def self.find_public_token!(token)
    find_signed!(token, purpose: :commerce_order)
  end

  private

  def refund_amount_for(statuses)
    association = association(:order_refunds)
    return association.target.select { |refund| statuses.include?(refund.status) }.sum(&:amount_cents) if association.loaded?

    order_refunds.where(status: statuses).sum(:amount_cents)
  end

  def assign_number
    self.number ||= "MO-#{Time.current.strftime('%Y%m%d')}-#{SecureRandom.alphanumeric(8).upcase}"
  end

  def normalize_contact
    self.customer_name = customer_name.to_s.strip
    self.customer_email = customer_email.to_s.strip.downcase
    self.customer_phone = customer_phone.to_s.strip.presence
    self.currency = currency.to_s.upcase
  end

  def total_matches_parts
    return if total_cents == subtotal_cents.to_i + shipping_cents.to_i + tax_cents.to_i

    errors.add(:total_cents, "must equal subtotal, shipping, and tax")
  end

  def shipping_details_match_method
    if fulfillment_method == "shipping"
      errors.add(:shipping_quote, "is required for delivery") if shipping_quote.blank?
      errors.add(:shipping_address, "is required for delivery") if shipping_address.blank?
    elsif shipping_quote.present? || shipping_address.present? || shipping_cents.to_i.positive?
      errors.add(:base, "Pickup orders cannot include shipping details")
    end
  end

  def fulfillment_records_belong_to_organization
    if inventory_location.present? && inventory_location.organization_id != organization_id
      errors.add(:inventory_location, "must belong to the order's organization")
    end
    return unless shipping_quote.present?

    unless shipping_quote.organization_id == organization_id && shipping_quote.inventory_location_id == inventory_location_id
      errors.add(:shipping_quote, "must belong to the order's organization and fulfillment location")
    end
  end
end
