module Api
  module V1
    module Admin
      class FundAllocationsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!
        before_action :set_allocation, only: [:show, :update, :destroy]

        def index
          allocations = FundAllocation.order(:sort_order, :created_at)
          render json: {
            fund_allocations: allocations.as_json,
            total_amount: allocations.sum(:amount)
          }
        end

        def show
          render json: { fund_allocation: @allocation.as_json }
        end

        def create
          allocation = FundAllocation.new(allocation_params)
          if allocation.save
            render json: { fund_allocation: allocation.as_json }, status: :created
          else
            render json: { errors: allocation.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @allocation.update(allocation_params)
            render json: { fund_allocation: @allocation.as_json }
          else
            render json: { errors: @allocation.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @allocation.destroy
          head :no_content
        end

        def reorder
          ids = params[:ids]
          return head(:bad_request) unless ids.is_a?(Array)

          FundAllocation.transaction do
            ids.each_with_index do |id, idx|
              FundAllocation.where(id: id).update_all(sort_order: idx)
            end
          end
          head :ok
        end

        private

        def set_allocation
          @allocation = FundAllocation.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Fund allocation not found" }, status: :not_found
        end

        def allocation_params
          params.permit(:category, :amount, :description, :color, :sort_order, :active)
        end
      end
    end
  end
end
