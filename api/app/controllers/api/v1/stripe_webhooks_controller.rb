module Api
  module V1
    class StripeWebhooksController < ApplicationController
      def create
        event = Commerce::Payments.construct_stripe_event(
          payload: request.raw_post,
          signature: request.headers["Stripe-Signature"]
        )
        Commerce::Payments::ProcessStripeEvent.call(event:)
        head :ok
      rescue Commerce::Payments::WebhookError => e
        render json: { error: e.message }, status: :bad_request
      rescue Commerce::Payments::ConfigurationError => e
        render json: { error: e.message }, status: :service_unavailable
      rescue StandardError => e
        Rails.logger.error("Stripe webhook processing failed: #{e.class}: #{e.message}")
        render json: { error: "Webhook processing failed." }, status: :internal_server_error
      end
    end
  end
end
