module Api
  module V1
    module Admin
      class CompetitorsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_competitor, only: [:show, :update, :destroy, :upload_photo]

        def index
          competitors = Competitor.order(:last_name, :first_name)
          render json: { competitors: competitors.as_json }
        end

        def show
          render json: { competitor: @competitor.as_json }
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

        def set_competitor
          @competitor = Competitor.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Competitor not found" }, status: :not_found
        end

        def competitor_params
          params.permit(
            :first_name, :last_name, :nickname, :country_code, :belt_rank,
            :weight_class, :academy, :bio, :instagram_url, :youtube_url,
            :wins, :losses, :draws, :gold_medals, :silver_medals, :bronze_medals
          )
        end
      end
    end
  end
end
