module Api
  module V1
    class CompetitorsController < ApplicationController
      def index
        competitors = Competitor.all

        competitors = competitors.where(belt_rank: params[:belt_rank]) if params[:belt_rank].present?
        competitors = competitors.where(weight_class: params[:weight_class]) if params[:weight_class].present?
        competitors = competitors.where(country_code: params[:country_code]) if params[:country_code].present?
        competitors = competitors.search_by_name(params[:search]) if params[:search].present?

        competitors = competitors.order(:last_name, :first_name)
        render json: competitors
      end

      def show
        competitor = Competitor.find(params[:id])
        render json: competitor
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Competitor not found" }, status: :not_found
      end
    end
  end
end
