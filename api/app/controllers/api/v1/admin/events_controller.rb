module Api
  module V1
    module Admin
      class EventsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_event, only: [:show, :update, :destroy, :upload_image, :import_results_preview, :import_results]

        def index
          org = Organization.first
          return render json: { error: "No organization configured" }, status: :unprocessable_entity unless org
          events = org.events.includes(:event_schedule_items, :prize_categories, :event_accommodations).order(date: :desc)
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

        # GET /api/v1/admin/events/:id/import_results_preview
        # Scrapes ASJJF and returns a summary without importing
        def import_results_preview
          ids = resolve_asjjf_ids
          return render json: { error: "No ASJJF event IDs configured. Set asjjf_event_ids on this event first." }, status: :unprocessable_entity if ids.empty?

          result = AsjjfScraper.preview(asjjf_event_ids: ids)
          render json: {
            event: { id: @event.id, name: @event.name, slug: @event.slug },
            existing_results_count: @event.event_results.count,
            preview: result[:summary],
            sample: result[:results].first(10).map { |r| r.slice(:division, :placement, :competitor_name, :academy, :country_code) }
          }
        rescue AsjjfScraper::ScraperError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        # POST /api/v1/admin/events/:id/import_results
        # Scrapes ASJJF and imports results (replaces existing)
        def import_results
          ids = resolve_asjjf_ids
          return render json: { error: "No ASJJF event IDs configured. Set asjjf_event_ids on this event first." }, status: :unprocessable_entity if ids.empty?

          result = AsjjfScraper.import!(event: @event, asjjf_event_ids: ids)
          render json: {
            message: "Successfully imported #{result[:imported]} results",
            imported: result[:imported],
            summary: result[:summary]
          }
        rescue AsjjfScraper::ScraperError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        def upload_image
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @event.hero_image.attach(params[:image])
          render json: { event: @event.reload.as_json }
        end

        # POST /api/v1/admin/events/auto_complete_past
        # Finds all upcoming/published events whose end_date (or date) is before today
        # and marks them as completed. Returns a summary of what changed.
        def auto_complete_past
          today = Date.current
          candidates = Event.where(status: %w[upcoming published])
            .where("COALESCE(end_date, date) < ?", today)

          updated = []
          candidates.each do |event|
            event.update!(status: "completed")
            updated << { id: event.id, name: event.name, date: event.date, slug: event.slug }
          end

          render json: {
            message: updated.any? ? "Marked #{updated.count} event(s) as completed." : "No past events needed updating.",
            updated_count: updated.count,
            updated_events: updated
          }
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
            :live_stream_url, :live_stream_active,
            asjjf_event_ids: [],
            event_schedule_items_attributes: [:id, :time, :description, :sort_order, :_destroy],
            prize_categories_attributes: [:id, :name, :amount, :sort_order, :_destroy]
          )
        end

        def resolve_asjjf_ids
          # Allow passing IDs in request body or use event's stored IDs
          ids = params[:asjjf_event_ids] || @event.asjjf_event_ids
          Array(ids).map(&:to_i).reject(&:zero?)
        end
      end
    end
  end
end
