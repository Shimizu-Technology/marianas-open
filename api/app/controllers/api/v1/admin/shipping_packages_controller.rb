module Api
  module V1
    module Admin
      class ShippingPackagesController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_package, only: %i[update destroy]

        def index
          render json: { shipping_packages: organization.shipping_packages.order(:sort_order, :id).map { |package| payload(package) } }
        end

        def create
          package = organization.shipping_packages.create!(package_params)
          render json: { shipping_package: payload(package) }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        def update
          @package.update!(package_params)
          render json: { shipping_package: payload(@package) }
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        def destroy
          @package.destroy!
          head :no_content
        rescue ActiveRecord::DeleteRestrictionError
          render json: { error: "This package is attached to a shipping quote and can only be archived." }, status: :unprocessable_entity
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def set_package
          @package = organization.shipping_packages.find(params[:id])
        end

        def package_params
          params.require(:shipping_package).permit(
            :name, :length_mm, :width_mm, :height_mm, :empty_weight_grams,
            :max_weight_grams, :sort_order, :active
          )
        end

        def payload(package)
          package.slice(
            :id, :name, :length_mm, :width_mm, :height_mm,
            :empty_weight_grams, :max_weight_grams, :sort_order, :active
          )
        end
      end
    end
  end
end
