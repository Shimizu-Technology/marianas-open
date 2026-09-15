class ReconcileCommerceJob < ApplicationJob
  queue_as :default

  ORDER_BATCH_SIZE = 100
  REFUND_BATCH_SIZE = 100

  def perform
    return if ENV["STRIPE_API_KEY"].blank?

    gateway = Commerce::Payments.gateway
    reconcile_orders(gateway)
    reconcile_refunds(gateway)
  end

  private

  def reconcile_orders(gateway)
    Order.where(status: "paid").where("last_reconciled_at IS NULL OR last_reconciled_at < ?", 6.hours.ago)
      .order(Arel.sql("last_reconciliation_attempt_at ASC NULLS FIRST"), :id).limit(ORDER_BATCH_SIZE).each do |order|
      Commerce::Payments::ReconcilePaidOrder.call(order:, gateway:)
    rescue StandardError => e
      Rails.logger.error("Commerce payment reconciliation failed for #{order.number}: #{e.class}: #{e.message}")
    end
  end

  def reconcile_refunds(gateway)
    OrderRefund.where(status: %w[pending_provider pending requires_action error]).order(:updated_at).limit(REFUND_BATCH_SIZE).each do |refund|
      Commerce::Refunds::Reconcile.call(refund:, gateway:)
    rescue StandardError => e
      Rails.logger.error("Commerce refund reconciliation failed for refund #{refund.id}: #{e.class}: #{e.message}")
    end
  end
end
