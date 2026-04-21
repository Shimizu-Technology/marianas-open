module Api
  module V1
    class EventResultsController < ApplicationController
      def index
        event = Event.publicly_visible.find_by!(slug: params[:event_slug])
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
        event = Event.publicly_visible.find_by!(slug: params[:event_slug])
        results = event.event_results

        render json: {
          total_results: results.count,
          gold_medals: results.gold.count,
          divisions: results.distinct.pluck(:division).count,
          countries: results.distinct.pluck(:country_code).compact.count,
          academies: results.distinct.pluck(:academy).compact.count,
          belt_breakdown: EventResult::BELT_RANKS.each_with_object({}) do |belt, acc|
            acc[belt] = results.where(belt_rank: belt).gold.count
          end,
          top_academies: top_academies_summary(results)
        }
      end

      private

      def top_academies_summary(results)
        rows = results
          .where.not(academy: [nil, ""])
          .group(:academy)
          .pluck(
            :academy,
            Arel.sql("SUM(CASE WHEN placement = 1 THEN 1 ELSE 0 END)"),
            Arel.sql("SUM(CASE WHEN placement = 2 THEN 1 ELSE 0 END)"),
            Arel.sql("SUM(CASE WHEN placement = 3 THEN 1 ELSE 0 END)"),
            Arel.sql("COUNT(*)")
          )

        rows
          .map { |academy, gold, silver, bronze, total|
            {
              name: academy,
              gold: gold,
              silver: silver,
              bronze: bronze,
              total: total
            }
          }
          .sort_by { |academy| [-academy[:gold], -academy[:silver], -academy[:bronze], -academy[:total], academy[:name]] }
          .first(10)
      end
    end
  end
end
