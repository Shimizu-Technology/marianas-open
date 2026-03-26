module Api
  module V1
    module Admin
      class AcademiesController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_academy, only: [:show, :update, :destroy, :upload_logo]

        def index
          scope = Academy.all
          scope = scope.search_by_name(params[:search]) if params[:search].present?

          total = scope.count
          page = (params[:page] || 1).to_i
          per_page = [(params[:per_page] || 50).to_i, 200].min

          records = scope
            .joins(stats_join_sql)
            .select(
              "academies.*",
              "COALESCE(stats.total_points, 0) as computed_total_points",
              "COALESCE(stats.gold, 0) as computed_gold",
              "COALESCE(stats.silver, 0) as computed_silver",
              "COALESCE(stats.bronze, 0) as computed_bronze",
              "COALESCE(stats.athletes, 0) as computed_athletes",
              "COALESCE(stats.events_competed, 0) as computed_events_competed"
            )
            .order(Arel.sql("COALESCE(stats.total_points, 0) DESC, academies.name ASC"))
            .offset((page - 1) * per_page)
            .limit(per_page)

          data = records.map { |a| serialize_for_list(a) }

          render json: { academies: data, total: total, page: page, per_page: per_page }
        end

        def show
          stats = bulk_compute_stats([@academy.id])[@academy.id] || empty_stats

          athletes = @academy.competitors.order(:last_name, :first_name).map do |c|
            { id: c.id, first_name: c.first_name, last_name: c.last_name,
              full_name: c.full_name, belt_rank: c.belt_rank, country_code: c.country_code }
          end

          data = @academy.as_json.merge(
            "total_points" => stats[:total_points],
            "gold" => stats[:gold],
            "silver" => stats[:silver],
            "bronze" => stats[:bronze],
            "athletes_count" => stats[:athletes],
            "events_competed" => stats[:events_competed],
            "athletes" => athletes
          )

          render json: { academy: data }
        end

        def update
          if @academy.update(academy_params)
            render json: { academy: @academy.reload.as_json }
          else
            render json: { errors: @academy.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @academy.destroy
          head :no_content
        end

        def upload_logo
          unless params[:logo].present?
            return render json: { error: "No logo provided" }, status: :unprocessable_entity
          end

          @academy.logo.attach(params[:logo])
          render json: { academy: @academy.reload.as_json }
        end

        private

        def stats_join_sql
          points = RankingCalculator.points_sql
          <<~SQL
            LEFT JOIN (
              SELECT
                competitors.academy_id,
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

        def set_academy
          @academy = Academy.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Academy not found" }, status: :not_found
        end

        def academy_params
          params.permit(:name, :country_code, :location, :website_url, :instagram_url, :facebook_url, :description)
        end

        def serialize_for_list(a)
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
            events_competed: a.computed_events_competed.to_i
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
              athletes: row.athletes.to_i
            }
          end
        end

        def empty_stats
          { gold: 0, silver: 0, bronze: 0, total_points: 0, events_competed: 0, athletes: 0 }
        end
      end
    end
  end
end
