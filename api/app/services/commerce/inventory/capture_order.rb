module Commerce
  module Inventory
    class CaptureOrder
      def self.call(order:, payment_intent_id: nil)
        new(order:, payment_intent_id:).call
      end

      def initialize(order:, payment_intent_id:)
        @order = order
        @payment_intent_id = payment_intent_id
      end

      def call
        Order.transaction do
          order.lock!
          return order if order.paid?

          reservations = order.inventory_reservations.where(status: "active").order(:product_variant_id).to_a
          raise "Order #{order.number} no longer has an active inventory reservation" if reservations.empty?

          reservations.each do |reservation|
            level = InventoryLevel.lock.find_by!(
              product_variant: reservation.product_variant,
              inventory_location: reservation.inventory_location
            )
            unless level.reserved >= reservation.quantity && level.on_hand >= reservation.quantity
              raise "Reserved inventory is inconsistent for order #{order.number}"
            end

            new_balance = level.on_hand - reservation.quantity
            level.update!(on_hand: new_balance, reserved: level.reserved - reservation.quantity)
            InventoryMovement.record_adjustment!(
              product_variant: reservation.product_variant,
              inventory_location: reservation.inventory_location,
              reason: "sold",
              quantity_delta: -reservation.quantity,
              balance_after: new_balance,
              note: "Order #{order.number}"
            )
            reservation.update!(status: "consumed", consumed_at: Time.current)
          end

          order.update!(
            status: "paid",
            paid_at: Time.current,
            payment_error: nil,
            stripe_payment_intent_id: payment_intent_id.presence || order.stripe_payment_intent_id
          )
          order
        end
      end

      private

      attr_reader :order, :payment_intent_id
    end
  end
end
