module Commerce
  module Inventory
    class ReleaseOrder
      def self.call(order:, status:, error: nil)
        new(order:, status:, error:).call
      end

      def initialize(order:, status:, error:)
        @order = order
        @status = status
        @error = error
      end

      def call
        Order.transaction do
          order.lock!
          return order if order.paid?

          order.inventory_reservations.where(status: "active").order(:product_variant_id).each do |reservation|
            level = InventoryLevel.lock.find_by!(
              product_variant: reservation.product_variant,
              inventory_location: reservation.inventory_location
            )
            raise "Reserved inventory is inconsistent for order #{order.number}" if level.reserved < reservation.quantity

            level.update!(reserved: level.reserved - reservation.quantity)
            reservation.update!(status: "released", released_at: Time.current)
          end

          order.update!(status:, payment_error: error.to_s.presence)
          order
        end
      end

      private

      attr_reader :order, :status, :error
    end
  end
end
