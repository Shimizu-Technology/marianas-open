module Api
  module V1
    module Admin
      class GalleryIntakeController < BaseController
        include ActiveStorage::SetCurrent
        before_action :set_event
        rescue_from ActiveRecord::RecordNotFound do
          render json: { error: "Event or gallery record not found" }, status: :not_found
        end
        rescue_from ArgumentError, ActiveRecord::RecordInvalid, ActiveRecord::RecordNotUnique do |error|
          message = error.is_a?(ActiveRecord::RecordNotUnique) ? "Album name already exists" : error.message
          render json: { error: message }, status: :unprocessable_entity
        end

        private

        def set_event
          @event = Event.find(params[:event_id])
        end

        def boolean_param(key, default:)
          return default unless params.key?(key)
          value = params[key]
          raise ArgumentError, "#{key} must be a boolean" unless value == true || value == false
          value
        end

        def settings_json
          { timezone: @event.gallery_timezone, hold_flagged: @event.gallery_hold_flagged }
        end
      end
    end
  end
end
