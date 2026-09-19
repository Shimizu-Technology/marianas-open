module Api
  module V1
    module Admin
      class OrderRefundsController < ApplicationController
        include ClerkAuthenticatable
        before_action -> { require_permission!(:commerce_refunds_manage) }

        def create
          order = organization.orders.find(params[:order_id])
          Commerce::Refunds::Create.call(
            order:, amount_cents: refund_params[:amount_cents], reason: refund_params[:reason],
            staff_note: refund_params[:staff_note], request_key: refund_params[:request_key], actor: current_user
          )
          render json: { order: Commerce::AdminOrderPresenter.new(order.reload).as_json }, status: :created
        rescue Commerce::Refunds::InvalidRefund, ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        rescue Commerce::Payments::RefundError => e
          render json: { error: e.message }, status: :bad_gateway
        end

        def reconcile
          order = organization.orders.find(params[:order_id])
          refund = order.order_refunds.find(params[:id])
          Commerce::Refunds::Reconcile.call(refund:)
          render json: { order: Commerce::AdminOrderPresenter.new(order.reload).as_json }
        rescue Commerce::Payments::RefundError => e
          render json: { error: e.message }, status: :bad_gateway
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def refund_params
          params.require(:refund).permit(:amount_cents, :reason, :staff_note, :request_key)
        end
      end
    end
  end
end
