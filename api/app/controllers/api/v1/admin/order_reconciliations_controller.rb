module Api
  module V1
    module Admin
      class OrderReconciliationsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!

        def create
          order = organization.orders.find(params[:order_id])
          Commerce::Payments::ReconcilePaidOrder.call(order:)
          render json: { order: Commerce::AdminOrderPresenter.new(order.reload).as_json }
        rescue Commerce::Payments::Error => e
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
