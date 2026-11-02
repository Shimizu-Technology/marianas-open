module Api
  module V1
    module Admin
      class AsjjfController < BaseController
        before_action :require_admin!, only: %i[close_breaker update_ranking_season apply_ranking]
        rescue_from ArgumentError, ActiveRecord::RecordInvalid, with: :invalid_payload

        def status
          render json: {
            heartbeats: AsjjfFetcherHeartbeat.where.not(received_at: nil).order(received_at: :desc).limit(20)
              .map { |heartbeat| heartbeat.as_json(only: %i[fetcher_id fetcher_version run_started_at run_finished_at fetched challenged received_at updated_at]).merge("errors" => heartbeat.error_count) },
            queue_counts: AsjjfFetchRequest::STATUSES.index_with { |state| AsjjfFetchRequest.where(status: state).count },
            breaker: breaker_state,
            recent_snapshots: AsjjfSnapshot.order(created_at: :desc).limit(20)
              .as_json(only: %i[id url page_type source outcome fetched_at parse_status parse_error parsed_summary ranking_apply_status ranking_apply_error ranking_applied_at])
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


        def ranking_holds
          page = pagination_page
          per_page = pagination_limit(default: 25, maximum: 50)
          scope = AsjjfSnapshot.ranking_holds
          snapshots = scope.offset((page - 1) * per_page).limit(per_page).map do |snapshot|
            snapshot.as_json(only: %i[id url page_type fetched_at ranking_apply_status ranking_apply_error])
              .merge(counts: snapshot.parsed_summary["counts"])
          end
          render json: { snapshots: snapshots, total: scope.count, page: page, per_page: per_page }
        end

        def snapshot
          render json: { snapshot: AsjjfSnapshot.find(params[:id]).as_json(only: %i[id url page_type fetched_at parsed_summary ranking_apply_status ranking_apply_error]) }
        end

        def ranking_seasons
          render json: { seasons: AsjjfRankingSeason.order(season_year: :desc), suggestions: AsjjfRankingSuggestion.order(season_year: :desc, id: :desc) }
        end

        def update_ranking_season
          season = AsjjfRankingSeason.find_or_initialize_by(season_year: params[:season_year])
          attributes = params.permit(:gi_ranking_id, :nogi_ranking_id, :team_ranking_id, :team_nogi_ranking_id, :current).to_h
          attributes.transform_values! { |value| value == "" ? nil : value }
          AsjjfRankingSeason.transaction do
            AsjjfRankingSeason.connection.execute("SELECT pg_advisory_xact_lock(184527005)")
            AsjjfRankingSeason.where(current: true).where.not(id: season.id).update_all(current: false, updated_at: Time.current) if ActiveModel::Type::Boolean.new.cast(attributes["current"])
            season.assign_attributes(attributes)
            season.save!
            season.sync_lists!
          end
          render json: { season: season }
        end

        def apply_ranking
          return render json: { error: "Explicit confirmation is required" }, status: :unprocessable_entity unless params[:confirm] == true
          snapshot = AsjjfSnapshot.find(params[:id])
          unless snapshot.parse_status == "parsed" && %w[individual_ranking individual_ranking_division team_ranking].include?(snapshot.page_type)
            return render json: { error: "Only successfully parsed ranking snapshots can be reviewed" }, status: :unprocessable_entity
          end
          ApplyRankingSnapshotJob.perform_later(snapshot.id, allow_reduction: true)
          render json: { queued: true }
        end

        def close_breaker
          AsjjfSetting.close!
          render json: { breaker: AsjjfSetting.state }
        end

        private

        def breaker_state
          row = AsjjfSetting.find_by(key: "circuit_breaker")
          { paused_until: row&.paused_until, reason: row&.reason, open: row&.open? || false }
        end

        def invalid_payload(error)
          render json: { error: error.message }, status: :unprocessable_entity
        end
      end
    end
  end
end
