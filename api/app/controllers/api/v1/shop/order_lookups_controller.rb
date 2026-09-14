module Api
  module V1
    module Shop
      class OrderLookupsController < ApplicationController
        def create
          response.headers["Cache-Control"] = "no-store"
          order = storefront_orders.find_by(number: normalized_number, customer_email: normalized_email)
          if order
            render json: { order_token: order.public_token }
          else
            render json: { error: "We could not find an order matching those details." }, status: :not_found
          end
        end

        private

        def storefront_orders
          Organization.order(:id).first!.orders
        end

        def normalized_number
          lookup_params[:number].to_s.strip.upcase
        end

        def normalized_email
          lookup_params[:email].to_s.strip.downcase
        end

        def lookup_params
          @lookup_params ||= params.require(:order_lookup).permit(:number, :email)
        end
      end
    end
  end
end
