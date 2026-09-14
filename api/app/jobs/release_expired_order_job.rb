class ReleaseExpiredOrderJob < ApplicationJob
  queue_as :default

  def perform(order_id)
    order = Order.find_by(id: order_id)
    return unless order&.pending_payment?
    return if order.payment_expires_at.future?

    Commerce::Inventory::ReleaseOrder.call(order:, status: "expired")
  end
end
