module Api
  module V1
    module Admin
      class AcademiesController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_academy, only: [:show, :update, :destroy, :upload_logo]

        def index
          academies = Academy.order(:name)
          ids = academies.pluck(:id)
          stats_map = bulk_compute_stats(ids)

          data = academies.map do |a|
            s = stats_map[a.id] || empty_stats
            a.as_json.merge(
              "total_points" => s[:total_points],
              "gold" => s[:gold],
              "silver" => s[:silver],
              "bronze" => s[:bronze],
              "athletes" => s[:athletes],
              "events_competed" => s[:events_competed]
            )
          end

          render json: { academies: data }
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

        def set_academy
          @academy = Academy.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Academy not found" }, status: :not_found
        end

        def academy_params
          params.permit(:name, :country_code, :location, :website_url, :instagram_url, :facebook_url, :description)
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
