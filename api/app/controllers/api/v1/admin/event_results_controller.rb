module Api
  module V1
    module Admin
      class EventResultsController < ApplicationController
        include ClerkAuthenticatable
        before_action :authenticate_user!
        before_action :require_staff!
        before_action :set_event
        before_action :set_result, only: [:update, :destroy]

        def index
          results = @event.event_results.order(:division, :placement)
          render json: results
        end

        def create
          result = @event.event_results.new(result_params)
          if result.save
            render json: result, status: :created
          else
            render json: { errors: result.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def bulk_create
          results_data = params[:results]
          return render json: { error: "No results provided" }, status: :bad_request unless results_data.is_a?(Array)

          created = []
          errors = []

          ActiveRecord::Base.transaction do
            results_data.each_with_index do |result_data, i|
              result = @event.event_results.new(
                division: result_data[:division],
                gender: result_data[:gender],
                belt_rank: result_data[:belt_rank],
                age_category: result_data[:age_category],
                weight_class: result_data[:weight_class],
                placement: result_data[:placement],
                competitor_name: result_data[:competitor_name],
                academy: result_data[:academy],
                country_code: result_data[:country_code]
              )
              if result.save
                created << result
              else
                errors << { index: i, errors: result.errors.full_messages }
              end
            end
          end

          render json: { created: created.length, errors: errors }
        end

        def update
          if @result.update(result_params)
            render json: @result
          else
            render json: { errors: @result.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @result.destroy
          head :no_content
        end

        def destroy_all
          count = @event.event_results.delete_all
          render json: { deleted: count }
        end

        private

        def set_event
          @event = Event.find(params[:event_id])
        end

        def set_result
          @result = @event.event_results.find(params[:id])
        end

        def result_params
          params.require(:event_result).permit(
            :division, :gender, :belt_rank, :age_category, :weight_class,
            :placement, :competitor_name, :academy, :country_code,
            :competitor_id, :submission_method, :notes
          )
        end
      end
    end
  end
end
