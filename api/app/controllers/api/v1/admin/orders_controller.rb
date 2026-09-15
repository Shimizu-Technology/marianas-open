module Api
  module V1
    module Admin
      class OrdersController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_order, only: :show

        def index
          orders = organization.orders.includes(:fulfillment, :shipment, :order_items, :inventory_location)
            .where(status: "paid").order(created_at: :desc)
          orders = orders.where(fulfillment_method: params[:method]) if Order::FULFILLMENT_METHODS.include?(params[:method])
          if params[:status].present?
            ids = Fulfillment.where(status: params[:status]).select(:order_id)
            orders = params[:status] == "unfulfilled" ? orders.where(id: ids).or(orders.where.not(id: Fulfillment.select(:order_id))) : orders.where(id: ids)
          end
          if params[:q].present?
            term = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].to_s.strip)}%"
            orders = orders.where("orders.number ILIKE :term OR orders.customer_name ILIKE :term OR orders.customer_email ILIKE :term", term:)
          end
          render json: { orders: orders.limit(100).map { |order| present(order) } }
        end

        def show
          render json: { order: present(@order) }
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def set_order
          @order = organization.orders.includes(:fulfillment, :shipment, :shipping_quote, :order_items, :inventory_location).find(params[:id])
        end

        def present(order)
          Commerce::AdminOrderPresenter.new(order).as_json
        end
      end
    end
  end
end
