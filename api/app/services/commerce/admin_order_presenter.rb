module Commerce
  class AdminOrderPresenter
    def initialize(order, financial: true)
      @order = order
      @financial = financial
    end

    def as_json
      payload = OrderPresenter.new(order).as_json.merge(
        id: order.id,
        customer_phone: order.customer_phone,
        fulfillment: fulfillment_payload,
        shipment: shipment_payload
      )
      return payload.merge(
        last_reconciled_at: order.last_reconciled_at,
        payment_error: order.payment_error,
        refundable_cents: order.refundable_cents,
        refunds: refund_payload
      ) if @financial

      payload.slice(
        :id, :number, :status, :simulated, :fulfillment_method, :customer_name,
        :customer_email, :customer_phone, :shipping_address, :pickup_location,
        :shipping_carrier, :shipping_service, :created_at, :paid_at,
        :fulfillment_status, :fulfillment, :shipment
      ).merge(items: payload.fetch(:items).map { |item| item.slice(:product_name, :variant_name, :sku, :options_snapshot, :quantity) })
    end

    private

    attr_reader :order

    def fulfillment_payload
      record = order.fulfillment
      {
        status: record&.status || "unfulfilled",
        staff_note: record&.staff_note,
        preparing_at: record&.preparing_at,
        ready_for_pickup_at: record&.ready_for_pickup_at,
        picked_up_at: record&.picked_up_at,
        shipped_at: record&.shipped_at,
        delivered_at: record&.delivered_at
      }
    end

    def shipment_payload
      record = order.shipment
      return unless record

      fields = [
        :status, :provider_mode, :carrier, :service, :tracking_code, :tracking_url,
        :label_url, :label_format, :purchased_at,
        :last_tracking_update_at, :last_error
      ]
      fields += %i[postage_cents currency] if @financial
      record.slice(*fields)
    end

    def refund_payload
      order.order_refunds.order(requested_at: :desc).map do |refund|
        refund.slice(
          :id, :status, :reason, :staff_note, :amount_cents, :currency, :source,
          :provider_mode, :provider_refund_id, :failure_reason, :requested_at, :processed_at
        )
      end
    end
  end
end
