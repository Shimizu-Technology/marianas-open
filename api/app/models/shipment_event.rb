class ShipmentEvent < ApplicationRecord
  STATUSES = %w[received processing processed ignored failed].freeze

  belongs_to :shipment, optional: true

  validates :provider, :provider_event_id, :event_type, :status, presence: true
  validates :provider_event_id, uniqueness: { scope: :provider }
  validates :status, inclusion: { in: STATUSES }
end
