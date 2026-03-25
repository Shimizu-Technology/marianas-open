module Api
  module V1
    class CompetitorsController < ApplicationController
      PER_PAGE = 50

      def stats_join_sql
        points = RankingCalculator.points_sql
        <<~SQL
          LEFT JOIN (
            SELECT
              event_results.competitor_id,
              COUNT(*) as results_count,
              COUNT(DISTINCT event_results.event_id) as events_competed,
              COUNT(*) FILTER (WHERE event_results.placement = 1) as gold,
              COUNT(*) FILTER (WHERE event_results.placement = 2) as silver,
              COUNT(*) FILTER (WHERE event_results.placement = 3) as bronze,
              #{points} as total_points
            FROM event_results
            INNER JOIN events ON events.id = event_results.event_id
            GROUP BY event_results.competitor_id
          ) stats ON stats.competitor_id = competitors.id
        SQL
      end

      def index
        scope = Competitor.with_results

        scope = scope.where(belt_rank: params[:belt_rank]) if params[:belt_rank].present?
        scope = scope.where(country_code: params[:country_code]) if params[:country_code].present?
        scope = scope.search_by_name(params[:search]) if params[:search].present?

        total = scope.count

        page = (params[:page] || 1).to_i

        records = scope
          .joins(stats_join_sql)
          .select(
            "competitors.*",
            "COALESCE(stats.total_points, 0) as computed_total_points",
            "COALESCE(stats.gold, 0) as computed_gold",
            "COALESCE(stats.silver, 0) as computed_silver",
            "COALESCE(stats.bronze, 0) as computed_bronze",
            "COALESCE(stats.events_competed, 0) as computed_events_competed",
            "COALESCE(stats.results_count, 0) as computed_results_count"
          )
          .order(Arel.sql("COALESCE(stats.total_points, 0) DESC, COALESCE(stats.gold, 0) DESC"))
          .offset((page - 1) * PER_PAGE)
          .limit(PER_PAGE)

        data = records.map { |c| serialize_record(c) }

        render json: { competitors: data, total: total, page: page, per_page: PER_PAGE }
      end

      def show
        competitor = Competitor.find(params[:id])

        record = Competitor.where(id: competitor.id)
          .joins(stats_join_sql)
          .select(
            "competitors.*",
            "COALESCE(stats.total_points, 0) as computed_total_points",
            "COALESCE(stats.gold, 0) as computed_gold",
            "COALESCE(stats.silver, 0) as computed_silver",
            "COALESCE(stats.bronze, 0) as computed_bronze",
            "COALESCE(stats.events_competed, 0) as computed_events_competed",
            "COALESCE(stats.results_count, 0) as computed_results_count"
          ).first

        results = competitor.event_results
          .joins(:event)
          .select("event_results.*, events.name as event_name, events.slug as event_slug, events.date as event_date, events.asjjf_stars as event_stars")
          .order("events.date DESC")

        result_data = results.map do |r|
          {
            event_id: r.event_id,
            event_name: r.event_name,
            event_slug: r.event_slug,
            event_date: r.event_date,
            division: r.division,
            placement: r.placement,
            belt_rank: r.belt_rank,
            points_earned: RankingCalculator.points_for(r.placement, r.event_stars)
          }
        end

        render json: serialize_record(record).merge(results: result_data)
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Competitor not found" }, status: :not_found
      end

      private

      def serialize_record(c)
        {
          id: c.id,
          first_name: c.first_name,
          last_name: c.last_name,
          full_name: c.full_name,
          nickname: c.nickname,
          country_code: c.country_code,
          belt_rank: c.belt_rank,
          weight_class: c.weight_class,
          academy: c.read_attribute(:academy),
          bio: c.bio,
          instagram_url: c.instagram_url,
          youtube_url: c.youtube_url,
          photo_url: c.photo_url,
          total_points: c.computed_total_points.to_i,
          gold_medals: c.computed_gold.to_i,
          silver_medals: c.computed_silver.to_i,
          bronze_medals: c.computed_bronze.to_i,
          events_competed: c.computed_events_competed.to_i,
          results_count: c.computed_results_count.to_i,
          wins: c.wins,
          losses: c.losses,
          draws: c.draws
        }
      end
    end
  end
end
