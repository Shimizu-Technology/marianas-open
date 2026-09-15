class OrderRefund < ApplicationRecord
  STATUSES = %w[pending_provider pending requires_action succeeded failed canceled error].freeze
  REASONS = %w[requested_by_customer duplicate fraudulent].freeze
  SOURCES = %w[admin stripe_dashboard].freeze
  RESERVING_STATUSES = %w[pending_provider pending requires_action succeeded error].freeze

  belongs_to :order
  belongs_to :requested_by, class_name: "User", optional: true

  validates :provider, :provider_mode, :request_key, :source, :status, :reason, :currency, :requested_at, presence: true
  validates :request_key, uniqueness: true
  validates :provider_refund_id, uniqueness: { scope: :provider }, allow_nil: true
  validates :status, inclusion: { in: STATUSES }
  validates :provider_mode, inclusion: { in: %w[test live] }
  validates :reason, inclusion: { in: REASONS }
  validates :source, inclusion: { in: SOURCES }
  validates :amount_cents, numericality: { only_integer: true, greater_than: 0 }
  validates :currency, format: { with: /\A[A-Z]{3}\z/ }

  scope :reserving_funds, -> { where(status: RESERVING_STATUSES) }
  scope :successful, -> { where(status: "succeeded") }
end
