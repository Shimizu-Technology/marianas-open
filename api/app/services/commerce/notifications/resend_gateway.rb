require "timeout"

module Commerce
  module Notifications
    class ResendGateway
      REQUEST_TIMEOUT = 10.seconds

      def initialize(api_key:, from:)
        @from = from
        Resend.api_key = api_key
      end

      def deliver(notification:, to:)
        response = Timeout.timeout(REQUEST_TIMEOUT, DeliveryError, "Resend request timed out.") do
          Resend::Emails.send(
            {
              from:,
              to:,
              subject: notification.subject,
              html: notification.html_body,
              text: notification.text_body
            },
            options: { idempotency_key: notification.idempotency_key }
          )
        end
        message_id = response[:id] || response["id"]
        raise DeliveryError, "Resend did not return a message ID." if message_id.blank?

        message_id
      rescue Error
        raise
      rescue StandardError => e
        raise DeliveryError, e.message
      end

      private

      attr_reader :from
    end
  end
end
