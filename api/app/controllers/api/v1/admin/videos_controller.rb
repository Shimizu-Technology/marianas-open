module Api
  module V1
    module Admin
      class VideosController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_video, only: [:show, :update, :destroy, :check_availability]

        def index
          videos = Video.includes(:event).order(sort_order: :asc, created_at: :desc)
          videos = videos.where(availability_hidden: true) if params[:unavailable] == "true"
          render json: { videos: videos.as_json }
        end

        def show
          render json: { video: @video.as_json }
        end

        def create
          video = Video.new(video_params)
          if video.save
            CheckVideoAvailabilityJob.perform_later(video.id)
            render json: { video: video.as_json }, status: :created
          else
            render json: { errors: video.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @video.update(video_params)
            CheckVideoAvailabilityJob.perform_later(@video.id)
            render json: { video: @video.reload.as_json }
          else
            render json: { errors: @video.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def check_availability
          CheckVideoAvailabilityJob.perform_later(@video.id)
          render json: { message: "Availability check queued" }, status: :accepted
        end

        def destroy
          @video.destroy
          head :no_content
        end

        private

        def set_video
          @video = Video.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Video not found" }, status: :not_found
        end

        def video_params
          params.permit(
            :title, :youtube_url, :competitor_1_name, :competitor_2_name,
            :weight_class, :belt_rank, :round, :result, :duration_seconds,
            :category, :sort_order, :featured, :status, :event_id
          )
        end
      end
    end
  end
end
