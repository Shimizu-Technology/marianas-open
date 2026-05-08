module Api
  module V1
    class EventsController < ApplicationController
      before_action :complete_past_events, only: [:index]

      def index
        events = Event.publicly_visible
                      .includes(:event_schedule_items, :prize_categories, { event_accommodations: { image_attachment: :blob } }, { event_gallery_images: { image_attachment: { blob: :variant_records } } })
                      .order(:date)
        render json: events
      end

      def show
        event = Event.publicly_visible
                     .includes(:event_schedule_items, :prize_categories, { event_accommodations: { image_attachment: :blob } }, { event_gallery_images: { image_attachment: { blob: :variant_records } } })
                     .find_by!(slug: params[:slug])
        event.complete_if_past!
        render json: event
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Event not found" }, status: :not_found
      end

      private

      def complete_past_events
        Event.complete_past_events!
      end
    end
  end
end
