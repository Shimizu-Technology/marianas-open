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
          limit: (params[:limit] || 50).to_i
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
        return render json: { error: "name parameter is required" }, status: :bad_request if name.blank?

        results = EventResult
          .joins(:event)
          .select(
            "event_results.*, events.asjjf_stars as event_stars, " \
            "events.name as event_name, events.slug as event_slug, events.date as event_date"
          )
          .where("LOWER(TRIM(event_results.competitor_name)) = ?", name.downcase)
          .order("events.date DESC")

        return render json: { error: "Competitor not found" }, status: :not_found if results.empty?

        total_points = results.sum { |r| RankingCalculator.points_for(r.placement, r.event_stars) }
        golds   = results.count { |r| r.placement == 1 }
        silvers = results.count { |r| r.placement == 2 }
        bronzes = results.count { |r| r.placement == 3 }

        render json: {
          competitor_name: results.first.competitor_name,
          academy: most_common_value(results.map(&:academy)),
          country_code: most_common_value(results.map(&:country_code)),
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
        render json: { error: e.message }, status: :internal_server_error
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
