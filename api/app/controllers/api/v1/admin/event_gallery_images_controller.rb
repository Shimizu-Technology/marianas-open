module Api
  module V1
    module Admin
      class EventGalleryImagesController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_event
        before_action :set_gallery_image, only: [:update, :destroy, :upload]

        def index
          gallery_images = @event.event_gallery_images.sorted
          render json: { gallery_images: gallery_images.as_json }
        end

        def create
          gallery_image = @event.event_gallery_images.build(gallery_image_params)
          gallery_image.image.attach(params[:image]) if params[:image].present?

          if gallery_image.save
            render json: { gallery_image: gallery_image.as_json }, status: :created
          else
            render json: { errors: gallery_image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @gallery_image.update(gallery_image_params)
            render json: { gallery_image: @gallery_image.reload.as_json }
          else
            render json: { errors: @gallery_image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def upload
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @gallery_image.image.attach(params[:image])
          render json: { gallery_image: @gallery_image.reload.as_json }
        end

        def destroy
          @gallery_image.image.purge if @gallery_image.image.attached?
          @gallery_image.destroy
          head :no_content
        end

        private

        def set_event
          @event = Event.find(params[:event_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Event not found" }, status: :not_found
        end

        def set_gallery_image
          @gallery_image = @event.event_gallery_images.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Gallery image not found" }, status: :not_found
        end

        def gallery_image_params
          params.permit(:title, :alt_text, :caption, :sort_order, :active)
        end
      end
    end
  end
end
