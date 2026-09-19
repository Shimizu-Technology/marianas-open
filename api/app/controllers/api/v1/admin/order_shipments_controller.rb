module Api
  module V1
    module Admin
      class OrderShipmentsController < ApplicationController
        include ClerkAuthenticatable
        before_action -> { require_permission!(:commerce_fulfillment_manage) }

        def create
          order = organization.orders.find(params[:order_id])
          Commerce::Fulfillment::PurchaseLabel.call(order:)
          render json: { order: Commerce::AdminOrderPresenter.new(order.reload, financial: current_user.can?(:commerce_refunds_manage)).as_json }, status: :created
        rescue Commerce::Fulfillment::InvalidTransition, Commerce::Fulfillment::PurchaseLabel::Busy => e
          render json: { error: e.message }, status: :unprocessable_entity
        rescue Commerce::Shipping::Error => e
          render json: { error: e.message }, status: :bad_gateway
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end
      end
    end
  end
end
