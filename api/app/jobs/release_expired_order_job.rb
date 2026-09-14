class ReleaseExpiredOrderJob < ApplicationJob
  queue_as :default
  retry_on Commerce::Payments::IndeterminateCheckoutError, wait: 1.minute, attempts: 10

  def perform(order_id)
    order = Order.find_by(id: order_id)
    return unless order&.pending_payment?
    return if order.payment_expires_at.future?

    Commerce::Payments::ReconcileOrder.call(order:)
  end
end
