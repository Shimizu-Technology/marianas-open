module Api
  module V1
    module Shop
      class ShippingQuotesController < ApplicationController
        before_action :require_commerce

        def create
          result = Commerce::Shipping::CreateQuotes.new(
            organization: Organization.order(:id).first!,
            raw_lines: quote_params.fetch(:cart),
            raw_address: quote_params.fetch(:address)
          ).call
          render json: result, status: :created
        rescue Commerce::Shipping::AddressError => e
          render json: { error: e.message }, status: :unprocessable_entity
        rescue Commerce::Shipping::ConfigurationError => e
          render json: { error: e.message }, status: :service_unavailable
        rescue Commerce::Shipping::Error => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        private

        def require_commerce
          return if Commerce::Configuration.enabled?

          head :not_found
        end

        def quote_params
          params.require(:shipping_quote).permit(
            cart: %i[variant_id quantity],
            address: %i[name company street1 street2 city state zip country phone email]
          )
        end
      end
    end
  end
end
