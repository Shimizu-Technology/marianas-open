module Commerce
  module Notifications
    class QueueFulfillmentUpdate
      KIND_BY_STATUS = {
        "ready_for_pickup" => "customer_pickup_ready",
        "label_created" => "customer_tracking"
      }.freeze

      def self.call(order:, status:)
        kind = KIND_BY_STATUS[status.to_s]
        return [] unless kind

        notification = order.order_notifications.find_or_create_by!(kind:, recipient: order.customer_email) do |record|
          message = FulfillmentUpdateMessage.new(order:, status: status.to_s).call
          record.assign_attributes(subject: message.subject, html_body: message.html, text_body: message.text)
        end
        [ notification ]
      end
    end
  end
end
