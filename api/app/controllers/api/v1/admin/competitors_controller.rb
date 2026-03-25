module Api
  module V1
    module Admin
      class CompetitorsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_competitor, only: [:show, :update, :destroy, :upload_photo]

        def index
          page = (params[:page] || 1).to_i
          per_page = [(params[:per_page] || 50).to_i, 100].min

          scope = Competitor.all
          scope = scope.search_by_name(params[:search]) if params[:search].present?

          total = scope.count

          dir = params[:sort_dir] == "asc" ? "ASC" : "DESC"
          order_clause = case params[:sort_by]
          when "name" then "competitors.last_name #{dir}, competitors.first_name #{dir}"
          when "events" then "COALESCE(stats.events_competed, 0) #{dir}, competitors.last_name, competitors.first_name"
          when "gold" then "COALESCE(stats.gold, 0) #{dir}, COALESCE(stats.total_points, 0) DESC"
          else "COALESCE(stats.total_points, 0) #{dir}, COALESCE(stats.gold, 0) DESC"
          end

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
            .order(Arel.sql(order_clause))
            .offset((page - 1) * per_page)
            .limit(per_page)

          data = records.map do |c|
            serialize_for_list(c)
          end

          render json: { competitors: data, total: total, page: page, per_page: per_page }
        end

        def show
          stats = bulk_compute_stats([@competitor.id])[@competitor.id] || empty_stats

          results = @competitor.event_results
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

          data = @competitor.as_json.merge(
            "total_points" => stats[:total_points],
            "gold_medals" => stats[:gold],
            "silver_medals" => stats[:silver],
            "bronze_medals" => stats[:bronze],
            "events_competed" => stats[:events_competed],
            "results_count" => stats[:results_count],
            "results" => result_data
          )

          render json: { competitor: data }
        end

        def create
          competitor = Competitor.new(competitor_params)
          if competitor.save
            render json: { competitor: competitor.as_json }, status: :created
          else
            render json: { errors: competitor.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @competitor.update(competitor_params)
            render json: { competitor: @competitor.reload.as_json }
          else
            render json: { errors: @competitor.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @competitor.event_results.update_all(competitor_id: nil)
          @competitor.destroy
          head :no_content
        end

        def upload_photo
          unless params[:photo].present?
            return render json: { error: "No photo provided" }, status: :unprocessable_entity
          end

          @competitor.photo.attach(params[:photo])
          render json: { competitor: @competitor.reload.as_json }
        end

        private

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

        def set_competitor
          @competitor = Competitor.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Competitor not found" }, status: :not_found
        end

        def competitor_params
          params.permit(
            :first_name, :last_name, :nickname, :country_code, :belt_rank,
            :weight_class, :academy, :bio, :instagram_url, :youtube_url,
            :wins, :losses, :draws
          )
        end

        def serialize_for_list(c)
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
            academy_id: c.academy_id,
            bio: c.bio,
            instagram_url: c.instagram_url,
            youtube_url: c.youtube_url,
            photo_url: c.photo_url,
            wins: c.wins,
            losses: c.losses,
            draws: c.draws,
            total_points: c.computed_total_points.to_i,
            gold_medals: c.computed_gold.to_i,
            silver_medals: c.computed_silver.to_i,
            bronze_medals: c.computed_bronze.to_i,
            events_competed: c.computed_events_competed.to_i,
            results_count: c.computed_results_count.to_i
          }
        end

        def bulk_compute_stats(competitor_ids)
          return {} if competitor_ids.empty?

          rows = EventResult
            .where(competitor_id: competitor_ids)
            .joins(:event)
            .group(:competitor_id)
            .select(
              "competitor_id",
              "COUNT(*) as results_count",
              "COUNT(DISTINCT event_results.event_id) as events_competed",
              "COUNT(*) FILTER (WHERE placement = 1) as gold",
              "COUNT(*) FILTER (WHERE placement = 2) as silver",
              "COUNT(*) FILTER (WHERE placement = 3) as bronze",
              "#{RankingCalculator.points_sql(placement_col: 'placement')} as total_points"
            )

          rows.each_with_object({}) do |row, map|
            map[row.competitor_id] = {
              gold: row.gold.to_i, silver: row.silver.to_i, bronze: row.bronze.to_i,
              total_points: row.total_points.to_i, events_competed: row.events_competed.to_i,
              results_count: row.results_count.to_i
            }
          end
        end

        def empty_stats
          { gold: 0, silver: 0, bronze: 0, total_points: 0, events_competed: 0, results_count: 0 }
        end
      end
    end
  end
end
