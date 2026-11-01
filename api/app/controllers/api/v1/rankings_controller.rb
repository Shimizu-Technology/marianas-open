module Api
  module V1
    class RankingsController < ApplicationController
      # GET /api/v1/rankings
      def index
        options = {
          belt: params[:belt],
          gi_nogi: params[:gi_nogi],
          gender: params[:gender],
          event_id: params[:event_id],
          limit: pagination_limit(:limit)
        }

        rankings = case params[:type]
        when "team"
                     RankingCalculator.teams(options)
        when "country"
                     RankingCalculator.countries(options)
        else
                     RankingCalculator.individual(options)
        end

        render json: {
          rankings: rankings,
          meta: {
            type: params[:type] || "individual",
            formula: "ASJJF star-based points (Gold=15×stars, Silver=7×stars, Bronze=3×stars)",
            note: "Per-match bonus points (+3 submission, +1 decision) not included",
            filters: options.compact_blank,
            total: rankings.size
          }
        }
      end

      # GET /api/v1/rankings/competitor?name=Cruz+Anthony
      def competitor
        name = params[:name].to_s.strip
        if name.blank? && params[:result_id].blank?
          return render json: { error: "name or result_id parameter is required" }, status: :bad_request
        end

        results = EventResult
          .joins(:event)
          .merge(Event.publicly_visible)
          .select(
            "event_results.*, events.asjjf_stars as event_stars, " \
            "events.name as event_name, events.slug as event_slug, events.date as event_date"
          )
          .includes(:competitor)
          .order("events.date DESC")

        if params[:result_id].present?
          reference = results.find_by(id: params[:result_id])
          return render json: { error: "Result not found" }, status: :not_found unless reference
          results = reference.competitor_id ? results.where(competitor_id: reference.competitor_id) : results.where(id: reference.id)
        else
          candidates = CompetitorLinker.candidates_for(name)
          if candidates.many? || candidates.any?(&:identity_separate?)
            return render json: { error: "Ambiguous identity; select an athlete or result link" }, status: :conflict
          end
          if candidates.one?
            results = results.where(competitor_id: candidates.first.id)
          else
            # Unlinked rows have no established person identity. A stable result
            # link is required rather than combining rows that share a label.
            return render json: { error: "Select a result link for this unlinked identity" }, status: :conflict
          end
        end

        return render json: { error: "Competitor not found" }, status: :not_found if results.empty?

        total_points = results.sum { |r| RankingCalculator.points_for(r.placement, r.event_stars) }
        golds   = results.count { |r| r.placement == 1 }
        silvers = results.count { |r| r.placement == 2 }
        bronzes = results.count { |r| r.placement == 3 }

        render json: {
          competitor_name: results.first.display_competitor_name,
          academy: most_common_value(results.map(&:academy)),
          country_code: most_common_value(results.map { |r| Identity::CountryCode.normalize(r.country_code) }),
          total_points: total_points,
          gold: golds,
          silver: silvers,
          bronze: bronzes,
          events_competed: results.map(&:event_id).uniq.count,
          results: results.map { |r|
            {
              event_name: r.event_name,
              event_slug: r.event_slug,
              event_date: r.event_date,
              division: r.division,
              placement: r.placement,
              belt_rank: r.belt_rank,
              points_earned: RankingCalculator.points_for(r.placement, r.event_stars)
            }
          }
        }
      rescue => e
        Rails.logger.error("Competitor lookup failed: #{e.message}\n#{e.backtrace&.first(5)&.join("\n")}")
        render json: { error: "Internal server error" }, status: :internal_server_error
      end

      private

      def most_common_value(arr)
        arr.compact.reject(&:blank?)
           .tally
           .max_by { |_, count| count }
           &.first
      end
    end
  end
end
