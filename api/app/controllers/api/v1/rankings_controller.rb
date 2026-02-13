module Api
  module V1
    class RankingsController < ApplicationController
      # GET /api/v1/rankings
      # Params: type (individual|team|country), belt, gi_nogi, gender, limit
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
    end
  end
end
