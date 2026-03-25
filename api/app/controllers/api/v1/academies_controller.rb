module Api
  module V1
    class AcademiesController < ApplicationController
      PER_PAGE = 50

      def index
        academies = Academy.with_competitors

        academies = academies.where(country_code: params[:country_code]) if params[:country_code].present?
        academies = academies.search_by_name(params[:search]) if params[:search].present?

        ids = academies.pluck(:id)
        stats_map = bulk_compute_stats(ids)

        sorted = academies.to_a
          .map { |a| serialize_with_stats(a, stats_map[a.id]) }
          .sort_by { |h| [-(h[:total_points] || 0), -(h[:gold] || 0)] }

        page = (params[:page] || 1).to_i
        total = sorted.size
        paginated = sorted.slice((page - 1) * PER_PAGE, PER_PAGE) || []

        render json: { academies: paginated, total: total, page: page, per_page: PER_PAGE }
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
            "SUM(CASE event_results.placement WHEN 1 THEN 15 WHEN 2 THEN 7 WHEN 3 THEN 3 ELSE 0 END * COALESCE(events.asjjf_stars, 3)) as total_points"
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
            "SUM(CASE placement WHEN 1 THEN 15 WHEN 2 THEN 7 WHEN 3 THEN 3 ELSE 0 END * COALESCE(events.asjjf_stars, 3)) as total_points"
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
