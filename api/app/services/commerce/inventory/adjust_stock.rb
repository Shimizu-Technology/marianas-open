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
          ensure_same_organization!
          now = Time.current
          InventoryLevel.insert_all(
            [
              {
                product_variant_id: variant.id,
                inventory_location_id: location.id,
                on_hand: 0,
                reserved: 0,
                created_at: now,
                updated_at: now
              }
            ],
            unique_by: :idx_inventory_levels_unique
          )
          level = InventoryLevel.lock.find_by!(product_variant: variant, inventory_location: location)
          new_balance = level.on_hand + quantity_delta
          if new_balance.negative?
            level.errors.add(:on_hand, "cannot become negative")
            raise ActiveRecord::RecordInvalid, level
          end

          level.update!(on_hand: new_balance)
          InventoryMovement.record_adjustment!(
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

      def ensure_same_organization!
        return if variant.product.organization == location.organization

        level = InventoryLevel.new(product_variant: variant, inventory_location: location)
        level.validate
        raise ActiveRecord::RecordInvalid, level
      end
    end
  end
end
