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
          page = (params[:page] || 1).to_i
          per_page = [(params[:per_page] || 100).to_i, 200].min

          base_scope = @event.event_results.order(:division, :placement)
          base_scope = base_scope.where("competitor_name ILIKE :q OR event_results.academy ILIKE :q", q: "%#{params[:search]}%") if params[:search].present?
          base_scope = base_scope.where(belt_rank: params[:belt_rank]) if params[:belt_rank].present?

          total = base_scope.count

          records = base_scope
            .left_joins(:competitor)
            .select("event_results.*, competitors.academy_id as linked_academy_id")
            .offset((page - 1) * per_page)
            .limit(per_page)

          results = records.map do |r|
            json = r.as_json
            json["linked_academy_id"] = r.try(:linked_academy_id)
            json
          end

          render json: { results: results, total: total, page: page, per_page: per_page }
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
