module Commerce
  module Notifications
    class QueueOrderPaid
      def self.call(order:)
        new(order:).call
      end

      def initialize(order:)
        @order = order
      end

      def call
        recipients.map do |attributes|
          order.order_notifications.find_or_create_by!(
            kind: attributes.fetch(:kind),
            recipient: attributes.fetch(:recipient)
          ) do |notification|
            message = OrderPaidMessage.new(order:, audience: attributes.fetch(:audience)).call
            notification.assign_attributes(
              subject: message.subject,
              html_body: message.html,
              text_body: message.text
            )
          end
        end
      end

      private

      attr_reader :order

      def recipients
        [
          { kind: "customer_order_confirmation", recipient: order.customer_email, audience: "customer" },
          *operations_recipients.map do |recipient|
            { kind: "operations_new_order", recipient:, audience: "operations" }
          end
        ]
      end

      def operations_recipients
        candidates = ENV["COMMERCE_OPERATIONS_EMAILS"].to_s.split(",").map { |email| email.strip.downcase }.reject(&:blank?).uniq
        valid, invalid = candidates.partition { |email| email.match?(URI::MailTo::EMAIL_REGEXP) }
        Rails.logger.warn("[CommerceNotifications] ignored #{invalid.length} invalid operations recipient(s)") if invalid.any?
        valid
      end
    end
  end
end
