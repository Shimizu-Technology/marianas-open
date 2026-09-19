module Commerce
  class OrderPresenter
    def initialize(order)
      @order = order
    end

    def as_json
      {
        number: order.number,
        status: order.status,
        simulated: order.simulated?,
        fulfillment_method: order.fulfillment_method,
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        shipping_address: order.shipping_address,
        pickup_location: pickup_location,
        currency: order.currency,
        subtotal_cents: order.subtotal_cents,
        shipping_cents: order.shipping_cents,
        tax_cents: order.tax_cents,
        total_cents: order.total_cents,
        shipping_carrier: order.shipping_carrier,
        shipping_service: order.shipping_service,
        created_at: order.created_at,
        payment_expires_at: order.payment_expires_at,
        paid_at: order.paid_at,
        refunded_cents: order.refunded_cents,
        refund_status: refund_status,
        fulfillment_status: order.fulfillment&.status || "unfulfilled",
        shipment: public_shipment,
        checkout_url: order.pending_payment? ? order.stripe_checkout_url : nil,
        items: order.order_items.order(:id).map do |item|
          item.slice(:product_name, :variant_name, :sku, :options_snapshot, :unit_price_cents, :quantity, :line_total_cents)
        end
      }
    end

    private

    attr_reader :order

    def pickup_location
      return unless order.fulfillment_method == "pickup"

      order.inventory_location.slice(:name, :pickup_instructions, :phone)
        .merge(address: order.inventory_location.public_address)
    end

    def public_shipment
      shipment = order.shipment
      return if order.simulated?
      return unless shipment&.purchased?

      shipment.slice(:status, :carrier, :service, :tracking_code, :tracking_url, :purchased_at, :last_tracking_update_at)
    end

    def refund_status
      refunds = order.order_refunds.to_a.select { |refund| %w[pending requires_action succeeded].include?(refund.status) }
      return "none" if refunds.empty?
      return "pending" if refunds.any? { |refund| %w[pending requires_action].include?(refund.status) }
      return "refunded" if refunds.select { |refund| refund.status == "succeeded" }.sum(&:amount_cents) >= order.total_cents

      "partially_refunded"
    end
  end
end
