module Api
  module V1
    module Shop
      class OrdersController < ApplicationController
        def show
          order = Order.find_public_token!(params[:id])
          render json: { order: Commerce::OrderPresenter.new(order).as_json }
        rescue ActiveSupport::MessageVerifier::InvalidSignature
          render json: { error: "Order not found." }, status: :not_found
        end

        def test_payment
          return head :not_found unless Commerce::Payments.fake_checkout_enabled?

          order = Order.find_public_token!(params[:id])
          raise ActiveRecord::RecordNotFound unless order.stripe_checkout_session_id.to_s.start_with?("cs_test_dev_")

          Commerce::Inventory::CaptureOrder.call(order:, payment_intent_id: "pi_test_dev_#{SecureRandom.hex(8)}")
          render json: { order: Commerce::OrderPresenter.new(order.reload).as_json }
        rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
          render json: { error: "Order not found." }, status: :not_found
        end
      end
    end
  end
end
