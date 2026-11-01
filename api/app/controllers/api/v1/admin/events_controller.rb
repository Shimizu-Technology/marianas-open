module Api
  module V1
    module Admin
      class EventsController < ApplicationController
        include ClerkAuthenticatable

        rescue_from ActiveRecord::RecordInvalid do |error|
          render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
        end
        rescue_from ActiveRecord::RecordNotUnique do
          render json: { errors: ["An event with that public URL already exists. Choose another slug."] }, status: :conflict
        end
        rescue_from ArgumentError do |error|
          render json: { errors: [error.message] }, status: :unprocessable_entity
        end
        rescue_from EventPublishingService::NotReady do |error|
          render json: { errors: [error.message], readiness: error.readiness }, status: :unprocessable_entity
        end
        rescue_from EventPublishingService::ForbiddenOverride do |error|
          render json: { error: error.message }, status: :forbidden
        end

        before_action :require_staff!
        before_action :complete_past_events, only: [:index]
        before_action :set_event, only: [:show, :update, :destroy, :upload_image, :upload_poster, :remove_poster, :upload_ticket_banner, :remove_ticket_banner, :import_results_preview, :import_results, :retranslate, :clone, :publish, :unpublish, :fill_asjjf]

        def index
          org = Organization.first
          return render json: { error: "No organization configured" }, status: :unprocessable_entity unless org
          events = org.events.includes(:event_schedule_items, :prize_categories, { event_accommodations: { image_attachment: :blob } }).order(date: :desc)
          render json: { events: events.map(&:admin_json) }
        end

        def show
          @event.complete_if_past!
          render json: { event: @event.admin_json }
        end

        def create
          org = Organization.first
          return render json: { error: "No organization found" }, status: :unprocessable_entity unless org
          event = EventPublishingService.call(event: org.events.build, actor: current_user, attributes: event_params, override_reason: params[:override_reason])
          render json: { event: event.admin_json }, status: :created
        end

        def update
          event = EventPublishingService.call(event: @event, actor: current_user, attributes: event_params, override_reason: params[:override_reason])
          render json: { event: event.reload.admin_json }
        end

        def publish
          status = params[:status].presence || "upcoming"
          raise ArgumentError, "Choose a public event status" unless Event::PUBLIC_STATUSES.include?(status)
          event = EventPublishingService.call(event: @event, actor: current_user, attributes: { status: status }, action: "publish", override_reason: params[:override_reason])
          render json: { event: event.reload.admin_json }
        end

        def unpublish
          event = EventPublishingService.call(event: @event, actor: current_user, attributes: { status: "draft", live_stream_active: false }, action: "unpublish")
          render json: { event: event.reload.admin_json }
        end

        def fill_asjjf
          Asjjf::EventFacts.new(@event, actor: current_user).call(params[:asjjf_event_id])
          render json: { event: @event.reload.admin_json, message: facts_message(@event) }
        end

        def rollover
          ids = params[:asjjf_event_ids]
          raise ArgumentError, "ASJJF event IDs must be a mapping of source event IDs to ASJJF IDs" if ids.present? && !ids.is_a?(ActionController::Parameters)
          events = SeasonRolloverService.call(source_year: params[:source_year], target_year: params[:target_year], actor: current_user,
            keep_tagline: ActiveModel::Type::Boolean.new.cast(params[:keep_tagline]), asjjf_event_ids: (ids&.to_unsafe_h || {}))
          render json: { events: events.map(&:admin_json), message: "Created #{events.size} draft events. Review all copied content before publishing." }, status: :created
        end

        def destroy
          @event.destroy
          head :no_content
        end

        # Compatibility endpoints: saved snapshots only, never outbound scraping.
        def import_results_preview
          run = Asjjf::ResultsSync.new(@event).call(trigger: "manual", apply: false)
          render json: { run: run, status: run.status }
        end

        def import_results
          return unless require_results_admin
          run = @event.results_sync_runs.find(params.require(:run_id))
          run = Asjjf::ResultsSync.new(@event).approve!(run, user: current_user)
          render json: { run: run, status: run.status }, status: run.status == "failed" ? :unprocessable_entity : :ok
        rescue Asjjf::ResultsSync::StaleReview, Asjjf::ResultsSync::InvalidReview => e
          render json: { error: e.message }, status: :conflict
        end

        def upload_image
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @event.hero_image.attach(params[:image])
          render json: { event: @event.reload.admin_json }
        end

        def upload_poster
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @event.poster_image.attach(params[:image])
          render json: { event: @event.reload.admin_json }
        end

        def remove_poster
          @event.poster_image.purge if @event.poster_image.attached?
          render json: { event: @event.reload.admin_json }
        end

        def upload_ticket_banner
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @event.ticket_banner_image.attach(params[:image])
          if @event.valid?
            render json: { event: @event.reload.admin_json }
          else
            @event.ticket_banner_image.purge
            render json: { errors: @event.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def remove_ticket_banner
          @event.ticket_banner_image.purge if @event.ticket_banner_image.attached?
          render json: { event: @event.reload.admin_json }
        end

        # POST /api/v1/admin/events/:id/retranslate
        def retranslate
          @event.retranslate!
          render json: { message: "Translation enqueued for event and child records", event: @event.reload.admin_json }
        end

        # Compatibility endpoint now uses the same fail-closed rollover policy.
        def clone
          year = params[:target_year].presence || ((@event.season_year || @event.date&.year || Date.current.year) + 1)
          event = EventRolloverService.call(source_event: @event, target_year: year, actor: current_user,
            keep_tagline: ActiveModel::Type::Boolean.new.cast(params[:keep_tagline]), asjjf_event_id: params[:asjjf_event_id])
          render json: { event: event.admin_json, message: facts_message(event) }, status: :created
        end

        private

        def complete_past_events
          Event.complete_past_events!
        end

        def set_event
          @event = Event.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Event not found" }, status: :not_found
        end

        def event_params
          params.permit(
            :name, :slug, :description, :date, :end_date, :season_year, :registration_not_open, :content_review_required,
            :venue_name, :venue_address, :city, :country, :country_code,
            :asjjf_stars, :is_main_event, :prize_pool, :registration_url,
            :registration_url_gi, :registration_url_nogi,
            :ticket_sales_status, :ticket_sales_url, :ticket_early_bird_ends_on,
            :ticket_in_person_name, :ticket_in_person_phone, :ticket_in_person_address,
            :status, :latitude, :longitude,
            :live_stream_url, :live_stream_active,
            :tagline, :schedule_note, :travel_description, :visa_description,
            :prize_title, :prize_description,
            asjjf_event_ids: [],
            ticket_options: [:label, :description, :early_bird_price, :regular_price],
            venue_highlights: [:title, :description],
            registration_steps: [:title, :description, :url, :link_label],
            registration_fee_sections: [:title, { rows: [:deadline, :fee, :option] }],
            registration_info_items: [:label, :value],
            travel_items: [:key, :kind, :title, :description, :value, :code, :url, :link_label],
            visa_items: [:title, :description],
            event_schedule_items_attributes: [:id, :time, :description, :sort_order, :confirmed, :_destroy],
            prize_categories_attributes: [:id, :name, :amount, :sort_order, :confirmed, :_destroy]
          )
        end

        def require_results_admin
          require_admin!
          !performed?
        end

        def facts_message(event)
          case event.asjjf_info_status
          when "pending" then "ASJJF snapshot is not available yet. A fetch is queued; fill facts again after the saved page is parsed. No facts were guessed."
          when "applied" then "Dates, venue, stars, fees and deadlines filled from the saved ASJJF page. Review before publishing."
          else "Draft created. Dates, links, prices and live state were cleared. Confirm copied schedule and prize rows before publishing."
          end
        end
      end
    end
  end
end
