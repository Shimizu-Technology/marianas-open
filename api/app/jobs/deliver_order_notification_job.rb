class DeliverOrderNotificationJob < ApplicationJob
  queue_as :default
  retry_on Commerce::Notifications::Error, wait: :polynomially_longer, attempts: 5

  def perform(notification_id)
    notification = OrderNotification.find_by(id: notification_id)
    return unless notification

    Commerce::Notifications::DeliverOrder.new(notification:).call
  end
end
