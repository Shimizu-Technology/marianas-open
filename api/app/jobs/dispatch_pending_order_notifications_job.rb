class DispatchPendingOrderNotificationsJob < ApplicationJob
  queue_as :default

  BATCH_SIZE = 250

  def perform
    OrderNotification.recovery_candidates.order(:id).limit(BATCH_SIZE).pluck(:id).each do |notification_id|
      DeliverOrderNotificationJob.perform_later(notification_id)
    end
  end
end
