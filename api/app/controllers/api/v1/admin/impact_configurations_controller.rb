module Api
  module V1
    module Admin
      class ImpactConfigurationsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!

        def show
          config = ImpactConfiguration.current
          render json: { impact_configuration: config.as_json }
        end

        def update
          config = ImpactConfiguration.current
          if config.update(config_params)
            render json: { impact_configuration: config.as_json }
          else
            render json: { errors: config.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def config_params
          params.permit(:economic_impact, :economic_impact_label, :investment_label, :roi_description, :year_label)
        end
      end
    end
  end
end
