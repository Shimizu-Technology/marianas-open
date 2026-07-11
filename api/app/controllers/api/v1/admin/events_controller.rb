module Api
  module V1
    module Admin
      class EventsController < ApplicationController
        include ClerkAuthenticatable
        include AdminAuditable

        before_action :require_admin_access!
        before_action :complete_past_events, only: [:index]
        before_action :set_event, only: [:show, :update, :destroy, :upload_image, :upload_poster, :remove_poster, :import_results_preview, :import_results, :retranslate, :clone, :publish, :unpublish]

        def index
          org = Organization.first
          return render json: { error: "No organization configured" }, status: :unprocessable_entity unless org
          events = org.events.includes(
            :season,
            :source_event,
            :event_schedule_items,
            :prize_categories,
            { hero_image_attachment: :blob },
            { poster_image_attachment: :blob },
            { event_accommodations: { image_attachment: :blob } }
          ).order(date: :desc)
          render json: { events: events.as_json }
        end

        def show
          @event.complete_if_past!
          render json: { event: @event.as_json }
        end

        def create
          org = Organization.first
          return render json: { error: "No organization found" }, status: :unprocessable_entity unless org

          event = org.events.build(event_params)
          event.slug = generate_unique_slug(event.name) if event.slug.blank?
          event.season ||= Season.current_season
          if event.save
            record_admin_action!("create", event, changes: event.previous_changes)
            render json: { event: event.as_json }, status: :created
          else
            render json: { errors: event.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          previous = @event.attributes
          @event.assign_attributes(event_params)
          if previous["status"] == "draft" && @event.status.in?(%w[upcoming live]) && !@event.publishable?
            return render json: { errors: ["Complete all required readiness checks before publishing."], readiness: @event.readiness }, status: :unprocessable_entity
          end

          if @event.save
            record_admin_action!("update", @event, changes: audited_changes(previous, @event.attributes))
            render json: { event: @event.reload.as_json }
          else
            render json: { errors: @event.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @event.destroy!
          record_admin_action!("destroy", @event)
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
          record_admin_action!("import_results", @event, metadata: { imported: result[:imported], asjjf_event_ids: ids })
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
          record_admin_action!("upload_hero_image", @event, metadata: { filename: params[:image].original_filename })
          render json: { event: @event.reload.as_json }
        end

        def upload_poster
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @event.poster_image.attach(params[:image])
          record_admin_action!("upload_poster", @event, metadata: { filename: params[:image].original_filename })
          render json: { event: @event.reload.as_json }
        end

        def remove_poster
          @event.poster_image.purge if @event.poster_image.attached?
          record_admin_action!("remove_poster", @event)
          render json: { event: @event.reload.as_json }
        end

        # POST /api/v1/admin/events/:id/retranslate
        def retranslate
          @event.retranslate!
          record_admin_action!("retranslate", @event)
          render json: { message: "Translation enqueued for event and child records", event: @event.reload.as_json }
        end

        # POST /api/v1/admin/events/:id/clone
        def clone
          target_season = Season.find_by(id: params[:season_id])
          new_event = EventRolloverService.call(
            source_event: @event,
            target_season: target_season,
            target_year: params[:target_year],
            copy_hero: params.fetch(:copy_hero, true),
            copy_accommodations: params.fetch(:copy_accommodations, true)
          )
          record_admin_action!("clone", new_event, metadata: { source_event_id: @event.id })

          render json: { event: new_event.reload.as_json }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        rescue ActiveRecord::RecordNotUnique
          render json: { errors: ["An event with that slug already exists. Please try again."] }, status: :conflict
        end

        def publish
          @event.assign_attributes(event_params.except(:status)) if event_params.present?
          readiness = @event.readiness
          unless readiness[:publishable]
            return render json: { errors: ["Complete all required readiness checks before publishing."], readiness: readiness }, status: :unprocessable_entity
          end

          @event.status = params[:publish_status].presence_in(%w[upcoming live]) || "upcoming"
          @event.save!
          record_admin_action!("publish", @event, changes: @event.previous_changes)
          render json: { event: @event.reload.as_json }
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        def unpublish
          previous_status = @event.status
          @event.update!(status: "draft", live_stream_active: false)
          record_admin_action!("unpublish", @event, changes: { status: [previous_status, "draft"] })
          render json: { event: @event.reload.as_json }
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
            :name, :slug, :description, :date, :end_date, :season_id,
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

        def audited_changes(before, after)
          before.each_with_object({}) do |(key, old_value), changes|
            new_value = after[key]
            changes[key] = [old_value, new_value] if old_value != new_value
          end.except("updated_at")
        end
      end
    end
  end
end
