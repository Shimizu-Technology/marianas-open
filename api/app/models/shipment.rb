class Shipment < ApplicationRecord
  STATUSES = %w[purchasing purchased unknown pre_transit in_transit out_for_delivery delivered available_for_pickup return_to_sender failure cancelled error].freeze

  belongs_to :order
  belongs_to :shipping_quote
  has_many :shipment_events, dependent: :nullify

  validates :provider, :provider_mode, :provider_shipment_id, :provider_rate_id, :status,
    :carrier, :service, :currency, presence: true
  validates :order_id, uniqueness: true
  validates :provider_shipment_id, uniqueness: { scope: :provider }
  validates :provider_tracker_id, uniqueness: true, allow_nil: true
  validates :status, inclusion: { in: STATUSES }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }
  validates :postage_cents, numericality: { only_integer: true, greater_than_or_equal_to: 0 }, allow_nil: true

  def purchased?
    purchased_at.present? && tracking_code.present? && label_url.present?
  end
end
