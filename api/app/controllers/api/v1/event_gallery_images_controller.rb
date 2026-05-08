module Api
  module V1
    class EventGalleryImagesController < ApplicationController
      def index
        event = Event.publicly_visible.find_by!(slug: params[:event_slug])
        per_page = [[params.fetch(:per_page, 48).to_i, 1].max, 96].min
        page = [params.fetch(:page, 1).to_i, 1].max
        scope = event.event_gallery_images.active.ready.with_image_variant_records.sorted
        total = scope.count
        images = scope.offset((page - 1) * per_page).limit(per_page)

        render json: {
          gallery_images: images.as_json,
          total: total,
          page: page,
          per_page: per_page
        }
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Event not found" }, status: :not_found
      end
    end
  end
end
