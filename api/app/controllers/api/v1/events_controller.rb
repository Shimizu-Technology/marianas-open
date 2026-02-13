module Api
  module V1
    class EventsController < ApplicationController
      def index
        events = Event.includes(:event_schedule_items, :prize_categories).order(:date)
        render json: events
      end

      def show
        event = Event.includes(:event_schedule_items, :prize_categories).find_by!(slug: params[:slug])
        render json: event
      rescue ActiveRecord::RecordNotFound
        render json: { error: "Event not found" }, status: :not_found
      end
    end
  end
end
