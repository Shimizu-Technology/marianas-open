module Commerce
  module Notifications
    class DeliverOrder
      PROCESSING_TIMEOUT = 5.minutes

      def initialize(notification:, gateway: nil, mode: Notifications.delivery_mode)
        @notification = notification
        @gateway = gateway
        @mode = mode
      end

      def call
        return notification unless claim!
        return suppress! if mode == "disabled"

        destination = delivery_recipient
        message_id = (gateway || Notifications.gateway).deliver(notification:, to: destination)
        finalize!(
          status: "sent",
          delivery_mode: mode,
          delivered_to: destination,
          provider_message_id: message_id,
          sent_at: Time.current,
          last_error: nil
        )
        notification
      rescue StandardError => e
        mark_failed(e)
        raise e if e.is_a?(Error)

        raise DeliveryError, e.message
      end

      private

      attr_reader :notification, :gateway, :mode

      def claim!
        notification.with_lock do
          return false if notification.terminal?
          return false if notification.delivering? && notification.updated_at > PROCESSING_TIMEOUT.ago

          notification.update!(status: "delivering", attempts: notification.attempts + 1, last_error: nil)
          @claim_version = notification.updated_at
          true
        end
      end

      def suppress!
        finalize!(
          status: "suppressed",
          delivery_mode: "disabled",
          last_error: "Commerce email delivery is disabled for this environment."
        )
        notification
      end

      def delivery_recipient
        case mode
        when "sandbox" then Notifications.sandbox_recipient
        when "live" then notification.recipient
        else
          raise ConfigurationError, "Commerce email delivery mode must be disabled, sandbox, or live."
        end
      end

      def mark_failed(error)
        return unless notification&.persisted? && claim_version

        finalize!(
          status: "failed",
          delivery_mode: mode,
          last_error: error.message.to_s.first(2_000)
        )
      end

      def finalize!(attributes)
        updated = OrderNotification.where(
          id: notification.id,
          status: "delivering",
          updated_at: claim_version
        ).update_all(attributes.merge(updated_at: Time.current))
        notification.reload
        updated == 1
      end

      attr_reader :claim_version
    end
  end
end
