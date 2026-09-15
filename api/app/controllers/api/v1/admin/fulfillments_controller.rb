module Api
  module V1
    module Admin
      class FulfillmentsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!

        def create
          order = organization.orders.find(params[:order_id])
          Commerce::Fulfillment::Transition.call(
            order:, status: fulfillment_params.fetch(:status), actor: current_user,
            staff_note: fulfillment_params[:staff_note]
          )
          render json: { order: Commerce::AdminOrderPresenter.new(order.reload).as_json }
        rescue Commerce::Fulfillment::InvalidTransition => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def fulfillment_params
          params.require(:fulfillment).permit(:status, :staff_note)
        end
      end
    end
  end
end
