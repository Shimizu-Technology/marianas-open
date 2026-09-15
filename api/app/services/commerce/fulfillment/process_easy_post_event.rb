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
        event = find_or_create_event!
        return event if %w[processed ignored].include?(event.status)

        event.with_lock do
          return event if %w[processed ignored].include?(event.status)
          event.update!(status: "processing", last_error: nil)
          process(event)
        end
        event
      rescue StandardError => e
        event&.update_columns(status: "failed", last_error: e.message.to_s.first(2_000), updated_at: Time.current)
        raise
      end

      private

      attr_reader :payload

      def find_or_create_event!
        ShipmentEvent.create!(provider: "easypost", provider_event_id: payload.fetch("id")) do |record|
          record.event_type = payload.fetch("description", "unknown")
          record.provider_object_id = payload.dig("result", "id")
        end
      rescue ActiveRecord::RecordNotUnique
        ShipmentEvent.find_by!(provider: "easypost", provider_event_id: payload.fetch("id"))
      rescue ActiveRecord::RecordInvalid
        existing = ShipmentEvent.find_by(provider: "easypost", provider_event_id: payload.fetch("id"))
        raise unless existing

        existing
      end

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
        provider_occurred_at = Time.zone.parse(payload.fetch("created_at").to_s)
        raise ArgumentError, "EasyPost event timestamp is invalid." unless provider_occurred_at

        shipment.with_lock do
          if shipment.last_tracking_update_at.present? && provider_occurred_at <= shipment.last_tracking_update_at
            event.update!(shipment:, status: "ignored", processed_at: Time.current)
            return
          end

          shipment.update!(status:, tracking_url: tracker["public_url"].presence || shipment.tracking_url,
            last_tracking_update_at: provider_occurred_at)
          event.update!(shipment:, status: "processed", processed_at: Time.current)
          mark_delivered(shipment) if status == "delivered"
        end
      end

      def mark_delivered(shipment)
        fulfillment = shipment.order.fulfillment || shipment.order.build_fulfillment
        fulfillment.update!(status: "delivered", shipped_at: fulfillment.shipped_at || Time.current, delivered_at: Time.current)
      end
    end
  end
end
