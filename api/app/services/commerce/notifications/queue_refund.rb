module Commerce
  module Notifications
    class QueueRefund
      def self.call(refund:)
        message = RefundMessage.new(refund:).call
        notification = refund.order.order_notifications.find_or_create_by!(
          kind: "customer_refund", recipient: refund.order.customer_email, reference_key: "refund-#{refund.id}"
        ) do |record|
          record.assign_attributes(subject: message.subject, html_body: message.html, text_body: message.text)
        end
        [ notification ]
      end
    end
  end
end
