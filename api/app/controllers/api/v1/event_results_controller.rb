module Api
  module V1
    class EventResultsController < ApplicationController
      def index
        event = Event.find_by!(slug: params[:event_slug])
        results = event.event_results

        results = results.by_belt(params[:belt_rank]) if params[:belt_rank].present?
        results = results.by_gender(params[:gender]) if params[:gender].present?
        results = results.by_weight(params[:weight_class]) if params[:weight_class].present?
        results = results.search(params[:q]) if params[:q].present?

        results = results.order(:division, :placement)

        # Group by division for frontend
        grouped = results.group_by(&:division).map do |division, div_results|
          {
            division: division,
            results: div_results.as_json
          }
        end

        render json: grouped
      end

      def summary
        event = Event.find_by!(slug: params[:event_slug])
        results = event.event_results

        render json: {
          total_results: results.count,
          gold_medals: results.gold.count,
          divisions: results.distinct.pluck(:division).count,
          countries: results.distinct.pluck(:country_code).compact.count,
          academies: results.distinct.pluck(:academy).compact.count,
          belt_breakdown: EventResult::BELT_RANKS.map { |belt|
            { belt: belt, count: results.where(belt_rank: belt).gold.count }
          },
          top_academies: results.gold
            .group(:academy)
            .count
            .sort_by { |_, v| -v }
            .first(10)
            .map { |academy, count| { academy: academy, gold_count: count } }
        }
      end
    end
  end
end
