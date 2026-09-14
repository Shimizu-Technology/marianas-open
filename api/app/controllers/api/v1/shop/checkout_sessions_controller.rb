module Api
  module V1
    module Shop
      class CheckoutSessionsController < ApplicationController
        before_action :require_commerce

        def create
          result = Commerce::Checkout::Create.new(
            organization: Organization.order(:id).first!,
            attributes: checkout_params
          ).call
          render json: result, status: :created
        rescue Commerce::Payments::IndeterminateCheckoutError => e
          render json: { error: e.message }, status: :service_unavailable
        rescue Commerce::Shipping::AddressError, Commerce::Shipping::Error,
          Commerce::Payments::CheckoutError, ActiveRecord::RecordInvalid,
          ActiveRecord::RecordNotFound, ActiveSupport::MessageVerifier::InvalidSignature => e
          render json: { error: checkout_error(e) }, status: :unprocessable_entity
        rescue Commerce::Payments::ConfigurationError => e
          render json: { error: e.message }, status: :service_unavailable
        end

        private

        def require_commerce
          return if Commerce::Configuration.enabled?

          head :not_found
        end

        def checkout_params
          params.require(:checkout).permit(
            :checkout_key, :fulfillment_method, :shipping_quote_token, :pickup_location_id,
            cart: %i[variant_id quantity],
            contact: %i[name email phone],
            shipping_address: %i[name company street1 street2 city state zip country phone email]
          )
        end

        def checkout_error(error)
          return error.record.errors.full_messages.to_sentence if error.is_a?(ActiveRecord::RecordInvalid)
          return "That checkout is no longer available. Please try again." if error.is_a?(ActiveSupport::MessageVerifier::InvalidSignature)

          error.message
        end
      end
    end
  end
end
