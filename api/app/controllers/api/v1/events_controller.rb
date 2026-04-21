module Api
  module V1
    class EventsController < ApplicationController
      def index
        events = Event.publicly_visible
                      .includes(:event_schedule_items, :prize_categories, { event_accommodations: { image_attachment: :blob } }, { event_gallery_images: { image_attachment: :blob } })
                      .order(:date)
        render json: events
      end

      def show
        event = Event.publicly_visible
                     .includes(:event_schedule_items, :prize_categories, { event_accommodations: { image_attachment: :blob } }, { event_gallery_images: { image_attachment: :blob } })
                     .find_by!(slug: params[:slug])
        render json: event
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Event not found" }, status: :not_found
      end
    end
  end
end
