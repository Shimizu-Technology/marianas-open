module Api
  module V1
    class VideosController < ApplicationController
      def index
        videos = Video.published.includes(:event).order(sort_order: :asc, created_at: :desc)
        videos = videos.where(event_id: params[:event_id]) if params[:event_id].present?
        videos = videos.where(belt_rank: params[:belt_rank]) if params[:belt_rank].present?
        videos = videos.where(weight_class: params[:weight_class]) if params[:weight_class].present?
        videos = videos.where(category: params[:category]) if params[:category].present?
        videos = videos.featured if params[:featured] == 'true'
        render json: videos
      end

      def show
        video = Video.find(params[:id])
        render json: video
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Video not found" }, status: :not_found
      end
    end
  end
end
