module Api
  module V1
    module Admin
      class SponsorPlacementsController < ApplicationController
        include ClerkAuthenticatable
        include AdminAuditable

        before_action :require_admin_access!
        before_action :set_placement, only: [ :show, :update, :destroy, :upload_media ]

        def index
          placements = SponsorPlacement.with_display_assets.ordered
          render json: { sponsor_placements: placements.as_json }
        end

        def show
          render json: { sponsor_placement: @placement.as_json }
        end

        def create
          placement = SponsorPlacement.new(placement_params)
          if placement.save
            record_admin_action!("create", placement, changes: placement.previous_changes)
            render json: { sponsor_placement: placement.as_json }, status: :created
          else
            render json: { errors: placement.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @placement.update(placement_params)
            record_admin_action!("update", @placement, changes: @placement.previous_changes)
            render json: { sponsor_placement: @placement.reload.as_json }
          else
            render json: { errors: @placement.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @placement.destroy!
          record_admin_action!("destroy", @placement)
          head :no_content
        end

        def upload_media
          return render json: { error: "No media provided" }, status: :unprocessable_entity unless params[:media].present?

          upload = params[:media]
          unless upload.content_type.in?(SponsorPlacement::ALLOWED_MEDIA_TYPES) && upload.size <= SponsorPlacement::MAX_MEDIA_SIZE
            return render json: { errors: [ "Media must be a supported image/video smaller than 100 MB." ] }, status: :unprocessable_entity
          end

          @placement.media.attach(upload)
          record_admin_action!("upload_media", @placement, metadata: { filename: upload.original_filename })
          render json: { sponsor_placement: @placement.reload.as_json }
        end

        private

        def set_placement
          @placement = SponsorPlacement.find(params[:id])
        end

        def placement_params
          params.permit(
            :sponsor_id, :season_id, :event_id, :placement_type, :media_kind,
            :headline, :body, :cta_label, :cta_url, :starts_at, :ends_at,
            :active, :sort_order
          )
        end
      end
    end
  end
end
