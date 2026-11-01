module Api
  module V1
    module Admin
      class ResultsSyncRunsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!
        before_action :require_admin!, only: %i[approve discard]
        before_action :set_event
        rescue_from Asjjf::ResultsSync::StaleReview, Asjjf::ResultsSync::InvalidReview, with: :review_error

        def show
          render json: { run: @event.results_sync_runs.order(id: :desc).first,
            status: @event.results_sync_status, last_checked_at: @event.results_last_checked_at }
        end

        def preview
          run = Asjjf::ResultsSync.new(@event).call(trigger: "manual", apply: false)
          render json: { run: run, status: run.status, last_checked_at: @event.reload.results_last_checked_at }
        end

        def approve
          run = @event.results_sync_runs.find(params[:run_id])
          Asjjf::ResultsSync.new(@event).approve!(run, user: current_user)
          render json: { run: run, status: run.status }
        end

        def discard
          run = @event.results_sync_runs.find(params[:run_id])
          Asjjf::ResultsSync.new(@event).discard!(run)
          render json: { run: run, status: run.status }
        end

        private

        def set_event
          @event = Event.find(params[:event_id])
        end

        def review_error(error)
          render json: { error: error.message }, status: :conflict
        end
      end
    end
  end
end
