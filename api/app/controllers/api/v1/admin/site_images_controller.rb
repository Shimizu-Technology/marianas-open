module Api
  module V1
    module Admin
      class SiteImagesController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_site_image, only: [:show, :update, :destroy, :upload]

        def index
          images = SiteImage.order(:placement, :sort_order)
          render json: { site_images: images.as_json }
        end

        def show
          render json: { site_image: @site_image.as_json }
        end

        def create
          site_image = SiteImage.new(site_image_params)

          if params[:image].present?
            site_image.image.attach(params[:image])
          end

          if site_image.save
            render json: { site_image: site_image.as_json }, status: :created
          else
            render json: { errors: site_image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @site_image.update(site_image_params)
            render json: { site_image: @site_image.reload.as_json }
          else
            render json: { errors: @site_image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def upload
          if params[:image].present?
            @site_image.image.attach(params[:image])
            render json: { site_image: @site_image.reload.as_json }
          else
            render json: { error: "No image provided" }, status: :unprocessable_entity
          end
        end

        def destroy
          @site_image.image.purge if @site_image.image.attached?
          @site_image.destroy
          head :no_content
        end

        private

        def set_site_image
          @site_image = SiteImage.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Site image not found" }, status: :not_found
        end

        def site_image_params
          params.permit(:title, :alt_text, :placement, :sort_order, :active, :caption)
        end
      end
    end
  end
end
