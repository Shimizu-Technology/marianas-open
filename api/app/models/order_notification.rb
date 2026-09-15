class OrderNotification < ApplicationRecord
  KINDS = %w[customer_order_confirmation operations_new_order customer_pickup_ready customer_tracking customer_refund].freeze
  STATUSES = %w[pending delivering sent suppressed failed].freeze
  DELIVERY_MODES = %w[disabled sandbox live].freeze

  belongs_to :order

  before_validation :assign_idempotency_key, on: :create

  validates :kind, :recipient, :reference_key, :status, :provider, :idempotency_key, :subject, :html_body, :text_body,
    presence: true
  validates :kind, inclusion: { in: KINDS }
  validates :status, inclusion: { in: STATUSES }
  validates :delivery_mode, inclusion: { in: DELIVERY_MODES }, allow_nil: true
  validates :recipient, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :recipient, uniqueness: { scope: %i[order_id kind reference_key] }
  validates :idempotency_key, uniqueness: true, length: { maximum: 256 }
  validates :attempts, numericality: { only_integer: true, greater_than_or_equal_to: 0 }

  scope :deliverable, -> { where(status: %w[pending failed]) }
  scope :recovery_candidates, -> {
    ready = where(status: %w[pending failed]).where(updated_at: ..1.minute.ago)
    stale = where(status: "delivering").where(updated_at: ..Commerce::Notifications::DeliverOrder::PROCESSING_TIMEOUT.ago)
    ready.or(stale)
  }

  def terminal?
    sent? || suppressed?
  end

  STATUSES.each do |value|
    define_method("#{value}?") { status == value }
  end

  private

  def assign_idempotency_key
    return if idempotency_key.present? || order_id.blank? || kind.blank? || recipient.blank?

    recipient_digest = Digest::SHA256.hexdigest(recipient.downcase).first(16)
    self.idempotency_key = "marianas-open/#{Rails.env}/#{kind}/#{order_id}/#{reference_key}/#{recipient_digest}"
  end
end
