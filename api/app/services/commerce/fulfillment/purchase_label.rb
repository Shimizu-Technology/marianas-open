module Commerce
  module Fulfillment
    class PurchaseLabel
      class Busy < StandardError; end

      def self.call(order:, gateway: Shipping.gateway)
        new(order:, gateway:).call
      end

      def initialize(order:, gateway:)
        @order = order
        @gateway = gateway
      end

      def call
        shipment, owns_attempt = prepare
        if shipment.purchased?
          enqueue(queue_tracking_notification)
          return shipment
        end
        raise Busy, "A label purchase is already in progress. Try again shortly." unless owns_attempt

        payload = gateway.purchase_label(
          shipment_id: shipment.provider_shipment_id,
          rate_id: shipment.provider_rate_id
        )
        notification = shipment.with_lock do
          shipment.update!(
            provider_mode: payload.fetch(:mode), status: normalized_status(payload[:status]),
            provider_tracker_id: payload[:tracker_id], tracking_code: payload.fetch(:tracking_code),
            tracking_url: payload[:tracking_url], label_url: payload.fetch(:label_url),
            label_format: payload[:label_format], postage_cents: payload[:postage_cents],
            currency: payload.fetch(:currency), purchased_at: shipment.purchased_at || Time.current,
            last_error: nil
          )
          queue_tracking_notification
        end
        enqueue(notification)
        shipment
      rescue Shipping::Error => e
        shipment&.update!(status: "error", last_error: e.message)
        raise
      end

      private

      attr_reader :order, :gateway

      def prepare
        owns_attempt = false
        shipment = Order.transaction do
          order.lock!
          raise InvalidTransition, "Only paid delivery orders can purchase labels." unless order.paid? && order.fulfillment_method == "shipping"
          quote = order.shipping_quote or raise InvalidTransition, "This order does not have a shipping quote."
          record = order.shipment
          if record.nil?
            owns_attempt = true
            record = order.create_shipment!(
              shipping_quote: quote, provider_mode: Shipping.provider_mode,
              provider_shipment_id: quote.provider_shipment_id, provider_rate_id: quote.provider_rate_id,
              carrier: quote.carrier, service: quote.service, currency: quote.currency
            )
          elsif !record.purchased? && (record.status != "purchasing" || record.updated_at <= 2.minutes.ago)
            owns_attempt = true
            record.update!(status: "purchasing", last_error: nil)
          end
          record
        end
        [ shipment, owns_attempt ]
      end

      def normalized_status(value)
        status = value.to_s
        Shipment::STATUSES.include?(status) && status != "purchasing" ? status : "purchased"
      end

      def queue_tracking_notification
        Notifications::QueueFulfillmentUpdate.call(order:, status: "label_created").first
      end

      def enqueue(notification)
        DeliverOrderNotificationJob.perform_later(notification.id) if notification
      end
    end
  end
end
