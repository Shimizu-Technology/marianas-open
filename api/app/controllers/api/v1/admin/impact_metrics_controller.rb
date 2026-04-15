module Api
  module V1
    module Admin
      class ImpactMetricsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!
        before_action :set_metric, only: [:show, :update, :destroy]

        def index
          metrics = ImpactMetric.order(:sort_order, :created_at)
          render json: { impact_metrics: metrics.as_json }
        end

        def show
          render json: { impact_metric: @metric.as_json }
        end

        def create
          metric = ImpactMetric.new(metric_params)
          if metric.save
            render json: { impact_metric: metric.as_json }, status: :created
          else
            render json: { errors: metric.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @metric.update(metric_params)
            render json: { impact_metric: @metric.as_json }
          else
            render json: { errors: @metric.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @metric.destroy
          head :no_content
        end

        def reorder
          ids = params[:ids]
          return head(:bad_request) unless ids.is_a?(Array)

          ImpactMetric.transaction do
            ids.each_with_index do |id, idx|
              ImpactMetric.where(id: id).update_all(sort_order: idx)
            end
          end
          head :ok
        end

        private

        def set_metric
          @metric = ImpactMetric.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Impact metric not found" }, status: :not_found
        end

        def metric_params
          params.permit(:label, :value, :description, :category, :icon, :sort_order, :active, :highlight)
        end
      end
    end
  end
end
