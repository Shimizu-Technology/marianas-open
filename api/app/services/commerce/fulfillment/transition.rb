module Commerce
  module Fulfillment
    class InvalidTransition < StandardError; end

    class Transition
      ALLOWED = {
        "unfulfilled" => %w[preparing],
        "preparing" => %w[ready_for_pickup shipped],
        "ready_for_pickup" => %w[picked_up],
        "shipped" => %w[delivered]
      }.freeze

      def self.call(order:, status:, actor:, staff_note: nil)
        new(order:, status:, actor:, staff_note:).call
      end

      def initialize(order:, status:, actor:, staff_note:)
        @order = order
        @status = status.to_s
        @actor = actor
        @staff_note = staff_note.to_s.strip.presence
      end

      def call
        notifications = []
        fulfillment = Order.transaction do
          order.lock!
          raise InvalidTransition, "Only paid orders can be fulfilled." unless order.paid?

          record = order.fulfillment || order.build_fulfillment
          current = record.status || "unfulfilled"
          return record if current == status

          validate_transition!(current)
          record.assign_attributes(status:, updated_by: actor, staff_note: staff_note)
          record.public_send("#{status}_at=", Time.current) if record.respond_to?("#{status}_at=")
          record.save!
          notifications = Notifications::QueueFulfillmentUpdate.call(order:, status:)
          record
        end
        notifications.each { |notification| DeliverOrderNotificationJob.perform_later(notification.id) }
        fulfillment
      end

      private

      attr_reader :order, :status, :actor, :staff_note

      def validate_transition!(current)
        unless ALLOWED.fetch(current, []).include?(status)
          raise InvalidTransition, "Order cannot move from #{current.humanize.downcase} to #{status.humanize.downcase}."
        end
        if order.fulfillment_method == "pickup" && %w[shipped delivered].include?(status)
          raise InvalidTransition, "Pickup orders cannot be marked as shipped."
        end
        if order.fulfillment_method == "shipping" && %w[ready_for_pickup picked_up].include?(status)
          raise InvalidTransition, "Delivery orders cannot use pickup statuses."
        end
        if status == "shipped" && !order.shipment&.purchased?
          raise InvalidTransition, "Purchase the shipping label before marking this order as shipped."
        end
      end
    end
  end
end
