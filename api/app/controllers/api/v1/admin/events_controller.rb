module Api
  module V1
    module Admin
      class EventsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_event, only: [:show, :update, :destroy, :upload_image]

        def index
          org = Organization.first
          return render json: { error: "No organization configured" }, status: :unprocessable_entity unless org
          events = org.events.includes(:event_schedule_items, :prize_categories).order(date: :desc)
          render json: { events: events.as_json }
        end

        def show
          render json: { event: @event.as_json }
        end

        def create
          org = Organization.first
          return render json: { error: "No organization found" }, status: :unprocessable_entity unless org

          event = org.events.build(event_params)
          if event.save
            render json: { event: event.as_json }, status: :created
          else
            render json: { errors: event.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @event.update(event_params)
            render json: { event: @event.reload.as_json }
          else
            render json: { errors: @event.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @event.destroy
          head :no_content
        end

        def upload_image
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @event.hero_image.attach(params[:image])
          render json: { event: @event.reload.as_json }
        end

        private

        def set_event
          @event = Event.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Event not found" }, status: :not_found
        end

        def event_params
          params.permit(
            :name, :slug, :description, :date, :end_date,
            :venue_name, :venue_address, :city, :country, :country_code,
            :asjjf_stars, :is_main_event, :prize_pool, :registration_url,
            :status, :latitude, :longitude,
            event_schedule_items_attributes: [:id, :time, :description, :sort_order, :_destroy],
            prize_categories_attributes: [:id, :name, :amount, :sort_order, :_destroy]
          )
        end
      end
    end
  end
end
