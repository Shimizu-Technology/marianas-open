module Api
  module V1
    module Admin
      class AsjjfController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!
        before_action :require_admin!, only: :close_breaker
        rescue_from ArgumentError, ActiveRecord::RecordInvalid, with: :invalid_payload

        def status
          render json: {
            heartbeats: AsjjfFetcherHeartbeat.where.not(received_at: nil).order(received_at: :desc).limit(20)
              .map { |heartbeat| heartbeat.as_json(only: %i[fetcher_id fetcher_version run_started_at run_finished_at fetched challenged received_at updated_at]).merge("errors" => heartbeat.error_count) },
            queue_counts: AsjjfFetchRequest::STATUSES.index_with { |state| AsjjfFetchRequest.where(status: state).count },
            breaker: AsjjfSetting.state,
            recent_snapshots: AsjjfSnapshot.order(created_at: :desc).limit(20)
              .as_json(only: %i[id url page_type source outcome fetched_at parse_status parse_error parsed_summary])
          }
        end

        def check
          event = Event.find(params[:id])
          planner = Asjjf::FetchPlanner.new(requested_by: "User:#{current_user.id}")
          requests = planner.plan_event_results(event) + planner.plan_event_info(event)
          return render json: { error: "No ASJJF source IDs or registration URLs configured for this event." }, status: :unprocessable_entity if requests.empty?
          render json: { queued_count: requests.uniq(&:id).size }
        end

        def snapshots
          file = params[:file]
          unless file.respond_to?(:original_filename) && File.extname(file.original_filename).downcase == ".html"
            return render json: { error: "Choose a saved .html page." }, status: :unprocessable_entity
          end
          return head :content_too_large if file.size > AsjjfSnapshot::MAX_BYTES
          html = file.read(AsjjfSnapshot::MAX_BYTES + 1)
          snapshot = Asjjf::SnapshotIntake.call(url: params[:url], page_type: params[:page_type], html: html,
            source: "admin_upload", uploaded_by_user: current_user)
          render json: { snapshot_id: snapshot.id, parse_status: snapshot.parse_status }, status: :created
        end

        def close_breaker
          AsjjfSetting.close!
          render json: { breaker: AsjjfSetting.state }
        end

        private

        def invalid_payload(error)
          render json: { error: error.message }, status: :unprocessable_entity
        end
      end
    end
  end
end
