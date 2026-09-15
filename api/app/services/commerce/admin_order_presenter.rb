module Commerce
  class AdminOrderPresenter
    def initialize(order)
      @order = order
    end

    def as_json
      OrderPresenter.new(order).as_json.merge(
        id: order.id,
        customer_phone: order.customer_phone,
        fulfillment: fulfillment_payload,
        shipment: shipment_payload
      )
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

      record.slice(
        :status, :provider_mode, :carrier, :service, :tracking_code, :tracking_url,
        :label_url, :label_format, :postage_cents, :currency, :purchased_at,
        :last_tracking_update_at, :last_error
      )
    end
  end
end
