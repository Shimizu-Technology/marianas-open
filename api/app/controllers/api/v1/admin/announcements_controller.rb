module Api
  module V1
    module Admin
      class AnnouncementsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_announcement, only: [:show, :update, :destroy, :upload_image, :remove_image]

        def index
          announcements = Announcement.order(created_at: :desc)
          render json: { announcements: announcements }
        end

        def show
          render json: { announcement: @announcement.as_json }
        end

        def create
          announcement = Announcement.new(announcement_params)
          if announcement.save
            deactivate_others(announcement) if announcement.active?
            render json: { announcement: announcement.as_json }, status: :created
          else
            render json: { errors: announcement.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @announcement.update(announcement_params)
            deactivate_others(@announcement) if @announcement.active?
            render json: { announcement: @announcement.reload.as_json }
          else
            render json: { errors: @announcement.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @announcement.destroy
          head :no_content
        end

        def upload_image
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @announcement.image.attach(params[:image])
          render json: { announcement: @announcement.reload.as_json }
        end

        def remove_image
          @announcement.image.purge if @announcement.image.attached?
          render json: { announcement: @announcement.reload.as_json }
        end

        private

        def set_announcement
          @announcement = Announcement.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Announcement not found" }, status: :not_found
        end

        def announcement_params
          params.permit(:title, :body, :link_url, :link_text, :announcement_type, :active, :starts_at, :ends_at)
        end

        def deactivate_others(announcement)
          Announcement.where.not(id: announcement.id).where(active: true).update_all(active: false)
        end
      end
    end
  end
end
