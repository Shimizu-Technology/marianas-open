module Api
  module V1
    class OfficialRankingsController < ApplicationController
      rescue_from ActiveRecord::RecordNotFound do
        render json: { error: "Official ranking not found" }, status: :not_found
      end

      def lists
        records = AsjjfRankingList.order(season_year: :desc, discipline: :asc, kind: :asc, category: :asc)
        cached_json(current_season: AsjjfRankingSeason.current_season&.season_year || Date.current.year,
          seasons: AsjjfRankingSeason.order(season_year: :desc).pluck(:season_year), lists: records.map(&:public_json))
      end

      def divisions
        list = AsjjfRankingList.find(params[:id])
        records = list.asjjf_ranking_divisions.order(:position, :id).map(&:public_json)
        groups = records.group_by { |d| d["gender"] }.map do |gender, by_gender|
          { gender: gender, age_groups: by_gender.group_by { |d| d["age_group"] }.map do |age, by_age|
            { age_group: age, divisions: by_age }
          end }
        end
        cached_json(divisions: records, groups: groups)
      end

      def entries
        list = AsjjfRankingList.find(params[:id] || params[:list_id])
        division = list.kind == "individual" ? list.asjjf_ranking_divisions.find(params[:division_id]) : nil
        scope = list.asjjf_ranking_entries.where(asjjf_ranking_division_id: division&.id)
        page = pagination_page
        per_page = pagination_limit(default: 50, maximum: 100)
        records = scope.includes(:competitor, :academy).order(:position, :id).offset((page - 1) * per_page).limit(per_page)
        cached_json(entries: records.map(&:public_json), total: scope.count, page: page, per_page: per_page,
          list: list.public_json, division: division&.public_json)
      end

      def standings
        competitor = Competitor.find(params[:competitor_id])
        season = AsjjfRankingSeason.current_season
        records = AsjjfRankingEntry.where(competitor: competitor, asjjf_ranking_list_id: season&.asjjf_ranking_lists&.select(:id))
          .includes(:asjjf_ranking_list, :asjjf_ranking_division).order(:position, :id)
        cached_json(season_year: season&.season_year || Date.current.year, standings: records.map do |entry|
          { position: entry.position, points: entry.points, list: entry.asjjf_ranking_list.public_json,
            division: entry.asjjf_ranking_division&.public_json }
        end)
      end

      private

      def cached_json(payload)
        expires_in 5.minutes, public: true
        render json: payload if stale?(etag: payload, public: true)
      end
    end
  end
end
