module Api
  module V1
    module Admin
      class EventAccommodationsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_event
        before_action :set_accommodation, only: [:update, :destroy]

        def index
          accommodations = @event.event_accommodations.sorted
          render json: { accommodations: accommodations.as_json(except: [:created_at, :updated_at]) }
        end

        def create
          accommodation = @event.event_accommodations.build(accommodation_params)
          if accommodation.save
            render json: { accommodation: accommodation.as_json(except: [:created_at, :updated_at]) }, status: :created
          else
            render json: { errors: accommodation.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @accommodation.update(accommodation_params)
            render json: { accommodation: @accommodation.as_json(except: [:created_at, :updated_at]) }
          else
            render json: { errors: @accommodation.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @accommodation.destroy
          head :no_content
        end

        private

        def set_event
          @event = Event.find(params[:event_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Event not found" }, status: :not_found
        end

        def set_accommodation
          @accommodation = @event.event_accommodations.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Accommodation not found" }, status: :not_found
        end

        def accommodation_params
          params.require(:accommodation).permit(
            :hotel_name, :description, :room_types, :rate_info,
            :inclusions, :check_in_date, :check_out_date,
            :booking_url, :booking_code, :contact_email, :contact_phone,
            :sort_order, :active
          )
        end
      end
    end
  end
end
