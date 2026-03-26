module Api
  module V1
    class AcademiesController < ApplicationController
      PER_PAGE = 50

      def index
        scope = Academy.with_competitors

        scope = scope.where(country_code: params[:country_code]) if params[:country_code].present?
        scope = scope.search_by_name(params[:search]) if params[:search].present?

        total = scope.count

        page = (params[:page] || 1).to_i

        records = scope
          .joins(stats_join_sql)
          .select(
            "academies.*",
            "COALESCE(stats.total_points, 0) as computed_total_points",
            "COALESCE(stats.gold, 0) as computed_gold",
            "COALESCE(stats.silver, 0) as computed_silver",
            "COALESCE(stats.bronze, 0) as computed_bronze",
            "COALESCE(stats.athletes, 0) as computed_athletes",
            "COALESCE(stats.events_competed, 0) as computed_events_competed",
            "COALESCE(stats.results_count, 0) as computed_results_count"
          )
          .order(Arel.sql("COALESCE(stats.total_points, 0) DESC, COALESCE(stats.gold, 0) DESC"))
          .offset((page - 1) * PER_PAGE)
          .limit(PER_PAGE)

        data = records.map { |a| serialize_from_record(a) }

        render json: { academies: data, total: total, page: page, per_page: PER_PAGE }
      end

      def show
        academy = Academy.find_by!(slug: params[:id])
        stats = bulk_compute_stats([academy.id])[academy.id] || empty_stats

        athletes = academy.competitors.to_a
        athlete_ids = athletes.map(&:id)
        athlete_stats = bulk_compute_athlete_stats(athlete_ids)

        athlete_data = athletes
          .map { |c| serialize_athlete(c, athlete_stats[c.id]) }
          .sort_by { |h| [-(h[:total_points] || 0)] }

        render json: serialize_with_stats(academy, stats).merge(
          athletes: athlete_data
        )
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Academy not found" }, status: :not_found
      end

      private

      def stats_join_sql
        points = RankingCalculator.points_sql
        <<~SQL
          LEFT JOIN (
            SELECT
              competitors.academy_id,
              COUNT(*) as results_count,
              COUNT(DISTINCT event_results.competitor_id) as athletes,
              COUNT(DISTINCT event_results.event_id) as events_competed,
              COUNT(*) FILTER (WHERE event_results.placement = 1) as gold,
              COUNT(*) FILTER (WHERE event_results.placement = 2) as silver,
              COUNT(*) FILTER (WHERE event_results.placement = 3) as bronze,
              #{points} as total_points
            FROM event_results
            INNER JOIN competitors ON competitors.id = event_results.competitor_id
            INNER JOIN events ON events.id = event_results.event_id
            WHERE competitors.academy_id IS NOT NULL
            GROUP BY competitors.academy_id
          ) stats ON stats.academy_id = academies.id
        SQL
      end

      def serialize_from_record(a)
        {
          id: a.id,
          name: a.name,
          slug: a.slug,
          country_code: a.country_code,
          location: a.location,
          website_url: a.website_url,
          instagram_url: a.instagram_url,
          facebook_url: a.facebook_url,
          description: a.description,
          logo_url: a.logo_url,
          total_points: a.computed_total_points.to_i,
          gold: a.computed_gold.to_i,
          silver: a.computed_silver.to_i,
          bronze: a.computed_bronze.to_i,
          athletes: a.computed_athletes.to_i,
          events_competed: a.computed_events_competed.to_i,
          results_count: a.computed_results_count.to_i
        }
      end

      def bulk_compute_stats(academy_ids)
        return {} if academy_ids.empty?

        rows = EventResult
          .joins(competitor: :team)
          .joins(:event)
          .where(competitors: { academy_id: academy_ids })
          .group("competitors.academy_id")
          .select(
            "competitors.academy_id",
            "COUNT(*) as results_count",
            "COUNT(DISTINCT event_results.competitor_id) as athletes",
            "COUNT(DISTINCT event_results.event_id) as events_competed",
            "COUNT(*) FILTER (WHERE event_results.placement = 1) as gold",
            "COUNT(*) FILTER (WHERE event_results.placement = 2) as silver",
            "COUNT(*) FILTER (WHERE event_results.placement = 3) as bronze",
            "#{RankingCalculator.points_sql} as total_points"
          )

        rows.each_with_object({}) do |row, map|
          map[row.academy_id] = {
            gold: row.gold.to_i, silver: row.silver.to_i, bronze: row.bronze.to_i,
            total_points: row.total_points.to_i, events_competed: row.events_competed.to_i,
            athletes: row.athletes.to_i, results_count: row.results_count.to_i
          }
        end
      end

      def bulk_compute_athlete_stats(competitor_ids)
        return {} if competitor_ids.empty?

        rows = EventResult
          .where(competitor_id: competitor_ids)
          .joins(:event)
          .group(:competitor_id)
          .select(
            "competitor_id",
            "COUNT(*) FILTER (WHERE placement = 1) as gold",
            "COUNT(*) FILTER (WHERE placement = 2) as silver",
            "COUNT(*) FILTER (WHERE placement = 3) as bronze",
            "#{RankingCalculator.points_sql(placement_col: 'placement')} as total_points"
          )

        rows.each_with_object({}) do |row, map|
          map[row.competitor_id] = {
            gold: row.gold.to_i, silver: row.silver.to_i, bronze: row.bronze.to_i,
            total_points: row.total_points.to_i
          }
        end
      end

      def serialize_with_stats(academy, stats)
        s = stats || empty_stats
        {
          id: academy.id,
          name: academy.name,
          slug: academy.slug,
          country_code: academy.country_code,
          location: academy.location,
          website_url: academy.website_url,
          instagram_url: academy.instagram_url,
          facebook_url: academy.facebook_url,
          description: academy.description,
          logo_url: academy.logo_url,
          total_points: s[:total_points],
          gold: s[:gold],
          silver: s[:silver],
          bronze: s[:bronze],
          athletes: s[:athletes],
          events_competed: s[:events_competed],
          results_count: s[:results_count]
        }
      end

      def serialize_athlete(competitor, stats)
        s = stats || { gold: 0, silver: 0, bronze: 0, total_points: 0 }
        {
          id: competitor.id,
          first_name: competitor.first_name,
          last_name: competitor.last_name,
          full_name: competitor.full_name,
          belt_rank: competitor.belt_rank,
          country_code: competitor.country_code,
          photo_url: competitor.photo_url,
          total_points: s[:total_points],
          gold: s[:gold],
          silver: s[:silver],
          bronze: s[:bronze]
        }
      end

      def empty_stats
        { gold: 0, silver: 0, bronze: 0, total_points: 0, events_competed: 0, athletes: 0, results_count: 0 }
      end
    end
  end
end
