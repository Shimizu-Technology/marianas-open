module Api
  module V1
    module Admin
      class InventoryLocationsController < ApplicationController
        include ClerkAuthenticatable

        before_action -> { require_permission!(:commerce_inventory_manage) }, only: :index
        before_action -> { require_permission!(:commerce_settings_manage) }, only: %i[create update]
        before_action :set_location, only: :update

        def index
          render json: { inventory_locations: organization.inventory_locations.order(:name).map { |location| payload(location) } }
        end

        def create
          location = organization.inventory_locations.create!(location_params)
          render json: { inventory_location: payload(location) }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        def update
          @location.update!(location_params)
          render json: { inventory_location: payload(@location) }
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def set_location
          @location = organization.inventory_locations.find(params[:id])
        end

        def location_params
          params.require(:inventory_location).permit(
            :name, :code, :active, :pickup_enabled, :shipping_enabled, :pickup_instructions, :phone,
            address: %i[street1 street2 city state zip country]
          )
        end

        def payload(location)
          location.slice(
            :id, :name, :code, :active, :pickup_enabled, :shipping_enabled,
            :pickup_instructions, :phone, :address
          )
        end
      end
    end
  end
end
