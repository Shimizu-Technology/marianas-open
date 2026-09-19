module Api
  module V1
    module Admin
      class InventoryAdjustmentsController < ApplicationController
        include ClerkAuthenticatable

        before_action -> { require_permission!(:commerce_inventory_manage) }

        def create
          product = organization.products.find(params[:product_id])
          variant = product.product_variants.find(adjustment_params[:variant_id])
          location = organization.inventory_locations.find(adjustment_params[:location_id])
          movement = Commerce::Inventory::AdjustStock.call(
            variant:,
            location:,
            quantity_delta: adjustment_params[:quantity_delta],
            reason: adjustment_params[:reason],
            note: adjustment_params[:note],
            actor: current_user
          )

          render json: {
            inventory: {
              variant_id: variant.id,
              location_id: location.id,
              on_hand: movement.balance_after,
              available: variant.inventory_levels.find_by!(inventory_location: location).available,
              movement_id: movement.id
            }
          }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        rescue ArgumentError
          render json: { errors: [ "Quantity must be a whole number" ] }, status: :unprocessable_entity
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def adjustment_params
          params.require(:inventory_adjustment).permit(:variant_id, :location_id, :quantity_delta, :reason, :note)
        end
      end
    end
  end
end
