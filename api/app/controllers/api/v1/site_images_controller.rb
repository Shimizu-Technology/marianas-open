module Api
  module V1
    class SiteImagesController < ApplicationController
      def index
        images = SiteImage.active
        images = images.by_placement(params[:placement]) if params[:placement].present?
        images = images.order(:sort_order) unless params[:placement].present?
        render json: { site_images: images.as_json }
      end
    end
  end
end
