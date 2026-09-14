module Commerce
  module Inventory
    class ReserveOrder
      def self.call(order:, cart:)
        new(order:, cart:).call
      end

      def initialize(order:, cart:)
        @order = order
        @cart = cart
      end

      def call
        levels = InventoryLevel.lock
          .where(product_variant_id: cart.lines.map { |line| line.variant.id }, inventory_location: order.inventory_location)
          .order(:product_variant_id)
          .index_by(&:product_variant_id)

        cart.lines.sort_by { |line| line.variant.id }.each do |line|
          level = levels[line.variant.id]
          available = level&.available.to_i
          if line.quantity > available
            raise Shipping::Error, "Only #{available} of #{line.variant.product.name} is available at this location."
          end

          level.update!(reserved: level.reserved + line.quantity)
          order.inventory_reservations.create!(
            product_variant: line.variant,
            inventory_location: order.inventory_location,
            quantity: line.quantity,
            expires_at: order.payment_expires_at
          )
        end
      end

      private

      attr_reader :order, :cart
    end
  end
end
