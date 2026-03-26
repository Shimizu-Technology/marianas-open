module Api
  module V1
    module Admin
      class EventsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_event, only: [:show, :update, :destroy, :upload_image, :upload_poster, :remove_poster, :import_results_preview, :import_results, :retranslate, :clone]

        def index
          org = Organization.first
          return render json: { error: "No organization configured" }, status: :unprocessable_entity unless org
          events = org.events.includes(:event_schedule_items, :prize_categories, { event_accommodations: { image_attachment: :blob } }, { event_gallery_images: { image_attachment: :blob } }).order(date: :desc)
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

        def upload_poster
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @event.poster_image.attach(params[:image])
          render json: { event: @event.reload.as_json }
        end

        def remove_poster
          @event.poster_image.purge if @event.poster_image.attached?
          render json: { event: @event.reload.as_json }
        end

        # POST /api/v1/admin/events/:id/retranslate
        def retranslate
          @event.retranslate!
          render json: { message: "Translation enqueued for event and child records", event: @event.reload.as_json }
        end

        # POST /api/v1/admin/events/:id/clone
        def clone
          new_event = @event.dup
          new_event.assign_attributes(
            name: "#{@event.name} (Copy)",
            slug: nil,
            status: "draft",
            date: nil,
            end_date: nil,
            is_main_event: false,
            results_imported_at: nil,
            asjjf_event_ids: [],
            translations: {},
            translation_status: "untranslated"
          )
          new_event.slug = generate_unique_slug(new_event.name)

          acc_blobs = []

          ActiveRecord::Base.transaction do
            new_event.save!

            @event.event_schedule_items.each do |item|
              new_item = item.dup
              new_item.event = new_event
              new_item.save!
            end

            @event.prize_categories.each do |cat|
              new_cat = cat.dup
              new_cat.event = new_event
              new_cat.save!
            end

            @event.event_accommodations.each do |acc|
              new_acc = acc.dup
              new_acc.event = new_event
              new_acc.translations = {}
              new_acc.translation_status = "untranslated"
              new_acc.save!
              acc_blobs << [new_acc, acc.image.blob] if acc.image.attached?
            end
          end

          acc_blobs.each do |new_acc, blob|
            new_acc.image.attach(
              io: blob.open,
              filename: blob.filename,
              content_type: blob.content_type
            )
          end

          if @event.hero_image.attached?
            blob = @event.hero_image.blob
            new_event.hero_image.attach(
              io: blob.open,
              filename: blob.filename,
              content_type: blob.content_type
            )
          end

          render json: { event: new_event.reload.as_json }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        rescue ActiveRecord::RecordNotUnique
          render json: { errors: ["An event with that slug already exists. Please try again."] }, status: :conflict
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
            :registration_url_gi, :registration_url_nogi,
            :status, :latitude, :longitude,
            :live_stream_url, :live_stream_active,
            :tagline, :schedule_note, :travel_description, :visa_description,
            :prize_title, :prize_description,
            asjjf_event_ids: [],
            venue_highlights: [:title, :description],
            registration_steps: [:title, :description, :url, :link_label],
            registration_fee_sections: [:title, { rows: [:deadline, :fee, :option] }],
            registration_info_items: [:label, :value],
            travel_items: [:title, :description, :value, :url, :link_label],
            visa_items: [:title, :description],
            event_schedule_items_attributes: [:id, :time, :description, :sort_order, :_destroy],
            prize_categories_attributes: [:id, :name, :amount, :sort_order, :_destroy]
          )
        end

        def resolve_asjjf_ids
          # Allow passing IDs in request body or use event's stored IDs
          ids = params[:asjjf_event_ids] || @event.asjjf_event_ids
          Array(ids).map(&:to_i).reject(&:zero?)
        end

        def generate_unique_slug(name)
          base = name.to_s.parameterize
          slug = base
          counter = 1
          while Event.exists?(slug: slug)
            slug = "#{base}-#{counter}"
            counter += 1
          end
          slug
        end
      end
    end
  end
end
