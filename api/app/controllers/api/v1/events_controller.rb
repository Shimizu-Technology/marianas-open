module Api
  module V1
    class EventsController < ApplicationController
      def index
        events = PublicEventLoader.load(Event.publicly_visible.order(:date))
        render json: events
      end

      def show
        event = PublicEventLoader
          .load(Event.publicly_visible.where(slug: params[:slug]).limit(1))
          .first
        raise ActiveRecord::RecordNotFound unless event

        render json: event
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Event not found" }, status: :not_found
      end
    end
  end
end
