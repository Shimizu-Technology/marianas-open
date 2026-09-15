module Api
  module V1
    class EasyPostWebhooksController < ApplicationController
      def create
        secret = ENV["EASYPOST_WEBHOOK_SECRET"].presence
        raise Commerce::Shipping::ConfigurationError, "EasyPost webhook verification is not configured." unless secret

        headers = { "X-Hmac-Signature" => request.headers["X-Hmac-Signature"] }
        payload = EasyPost::Util.validate_webhook(request.raw_post, headers, secret)
        Commerce::Fulfillment::ProcessEasyPostEvent.call(payload:)
        head :ok
      rescue EasyPost::Errors::SignatureVerificationError, JSON::ParserError => e
        render json: { error: e.message }, status: :bad_request
      rescue Commerce::Shipping::ConfigurationError => e
        render json: { error: e.message }, status: :service_unavailable
      rescue StandardError => e
        Rails.logger.error("EasyPost webhook processing failed: #{e.class}: #{e.message}")
        render json: { error: "Webhook processing failed." }, status: :internal_server_error
      end
    end
  end
end
