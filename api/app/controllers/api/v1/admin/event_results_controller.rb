module Api
  module V1
    module Admin
      class EventResultsController < ApplicationController
        include ClerkAuthenticatable
        before_action :authenticate_user!
        before_action :require_staff!
        before_action :set_event
        before_action :set_result, only: [ :update, :destroy ]

        def index
          page = pagination_page
          per_page = pagination_limit(default: 100)

          base_scope = @event.event_results.order(:division, :placement)
          base_scope = base_scope.where("competitor_name ILIKE :q OR event_results.academy ILIKE :q", q: "%#{params[:search]}%") if params[:search].present?
          base_scope = base_scope.where(belt_rank: params[:belt_rank]) if params[:belt_rank].present?

          total = base_scope.count

          records = base_scope.includes(:competitor, :result_academy)
            .select("event_results.*, event_results.academy_id as linked_academy_id")
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
          saved = @event.with_lock { result.save }
          if saved
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

          @event.with_lock do
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
          saved = @event.with_lock do
            @result.lock!
            @result.sync_key ||= Asjjf::ResultsIdentity.key(@result) if @result.source == "asjjf"
            @result.update(result_params.merge(manually_edited_at: Time.current))
          end
          if saved
            render json: @result
          else
            render json: { errors: @result.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @event.with_lock { @result.destroy! }
          head :no_content
        end

        def destroy_all
          count = nil
          @event.with_lock do
            previous_ids = @event.event_results.where.not(competitor_id: nil).distinct.pluck(:competitor_id)
            count = @event.event_results.delete_all
            Competitor.where(id: previous_ids).find_each(&:refresh_current_academy!)
          end
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
