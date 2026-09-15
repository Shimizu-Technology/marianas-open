class Fulfillment < ApplicationRecord
  STATUSES = %w[unfulfilled preparing ready_for_pickup picked_up shipped delivered].freeze

  belongs_to :order
  belongs_to :updated_by, class_name: "User", optional: true

  validates :status, inclusion: { in: STATUSES }
  validates :order_id, uniqueness: true

  STATUSES.each { |value| define_method("#{value}?") { status == value } }
end
