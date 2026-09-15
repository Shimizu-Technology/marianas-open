module Commerce
  module Fulfillment
    class ProcessEasyPostEvent
      TRACKING_STATUSES = (Shipment::STATUSES - %w[purchasing purchased]).freeze

      def self.call(payload:)
        new(payload:).call
      end

      def initialize(payload:)
        @payload = payload
      end

      def call
        event = ShipmentEvent.find_or_create_by!(provider: "easypost", provider_event_id: payload.fetch("id")) do |record|
          record.event_type = payload.fetch("description", "unknown")
          record.provider_object_id = payload.dig("result", "id")
        end
        return event if %w[processed ignored].include?(event.status)

        event.with_lock do
          return event if %w[processed ignored].include?(event.status)
          event.update!(status: "processing", last_error: nil)
          process(event)
        end
        event
      rescue StandardError => e
        event&.update!(status: "failed", last_error: e.message)
        raise
      end

      private

      attr_reader :payload

      def process(event)
        unless payload["description"] == "tracker.updated"
          event.update!(status: "ignored", processed_at: Time.current)
          return
        end

        tracker = payload.fetch("result")
        shipments = Shipment.where(provider: "easypost")
        shipment = shipments.find_by(provider_tracker_id: tracker["id"]) ||
          shipments.find_by(provider_shipment_id: tracker["shipment_id"]) ||
          shipments.find_by(tracking_code: tracker["tracking_code"])
        if shipment.nil? || payload["mode"].to_s != shipment.provider_mode
          event.update!(status: "ignored", processed_at: Time.current)
          return
        end

        status = tracker["status"].to_s
        status = "unknown" unless TRACKING_STATUSES.include?(status)
        shipment.update!(status:, tracking_url: tracker["public_url"].presence || shipment.tracking_url,
          last_tracking_update_at: Time.current)
        event.update!(shipment:, status: "processed", processed_at: Time.current)
        mark_delivered(shipment) if status == "delivered"
      end

      def mark_delivered(shipment)
        fulfillment = shipment.order.fulfillment || shipment.order.build_fulfillment
        fulfillment.update!(status: "delivered", shipped_at: fulfillment.shipped_at || Time.current, delivered_at: Time.current)
      end
    end
  end
end
