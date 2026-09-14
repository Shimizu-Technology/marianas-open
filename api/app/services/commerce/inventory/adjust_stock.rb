module Commerce
  module Inventory
    class AdjustStock
      def self.call(variant:, location:, quantity_delta:, reason:, actor: nil, note: "")
        new(
          variant: variant,
          location: location,
          quantity_delta: quantity_delta,
          reason: reason,
          actor: actor,
          note: note
        ).call
      end

      def initialize(variant:, location:, quantity_delta:, reason:, actor:, note:)
        @variant = variant
        @location = location
        @quantity_delta = Integer(quantity_delta)
        @reason = reason
        @actor = actor
        @note = note
      end

      def call
        InventoryLevel.transaction do
          level = variant.inventory_levels.create_or_find_by!(inventory_location: location)
          level.lock!
          new_balance = level.on_hand + quantity_delta
          if new_balance.negative?
            level.errors.add(:on_hand, "cannot become negative")
            raise ActiveRecord::RecordInvalid, level
          end

          level.update!(on_hand: new_balance)
          InventoryMovement.create!(
            product_variant: variant,
            inventory_location: location,
            performed_by: actor,
            reason: reason,
            quantity_delta: quantity_delta,
            balance_after: new_balance,
            note: note
          )
        end
      end

      private

      attr_reader :variant, :location, :quantity_delta, :reason, :actor, :note
    end
  end
end
