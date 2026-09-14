module Api
  module V1
    module Shop
      class FulfillmentController < ApplicationController
        before_action :require_commerce

        def show
          organization = Organization.order(:id).first!
          locations = organization.inventory_locations.where(active: true, pickup_enabled: true).order(:name)

          render json: {
            shipping_available: organization.inventory_locations.exists?(active: true, shipping_enabled: true) &&
              organization.shipping_packages.exists?(active: true),
            pickup_locations: locations.map { |location| pickup_payload(location) }
          }
        end

        private

        def require_commerce
          return if Commerce::Configuration.enabled?

          head :not_found
        end

        def pickup_payload(location)
          location.slice(:id, :name, :pickup_instructions, :phone).merge(address: location.public_address)
        end
      end
    end
  end
end
