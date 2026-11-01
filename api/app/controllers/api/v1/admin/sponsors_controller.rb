module Api
  module V1
    module Admin
      class SponsorsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!
        before_action :set_sponsor, only: [:show, :update, :destroy, :upload_logo]
        rescue_from ActiveRecord::RecordInvalid do |error|
          render json: { errors: error.record.errors.full_messages }, status: :unprocessable_entity
        end

        def index
          sponsors = Organization.first&.sponsors&.includes(:sponsor_placements, logo_attachment: :blob, logo_dark_attachment: :blob)&.order(:sort_order, :id) || []
          render json: { sponsors: sponsors.map { |sponsor| serialize(sponsor) } }
        end

        def show
          render json: { sponsor: serialize(@sponsor) }
        end

        def create
          org = Organization.first
          return render json: { error: "No organization found" }, status: :unprocessable_entity unless org

          sponsor = org.sponsors.build(sponsor_params)
          Sponsor.transaction do
            sponsor.save!
            audit!(sponsor, "created", sponsor.attributes)
          end
          render json: { sponsor: serialize(sponsor) }, status: :created
        end

        def update
          Sponsor.transaction do
            @sponsor.lock!
            before = audit_state(@sponsor)
            @sponsor.update!(sponsor_params)
            audit!(@sponsor, "updated", { before: before, after: audit_state(@sponsor) })
          end
          render json: { sponsor: serialize(@sponsor.reload) }
        end

        def destroy
          Sponsor.transaction do
            @sponsor.lock!
            audit!(@sponsor, "deleted", audit_state(@sponsor))
            @sponsor.destroy!
          end
          head :no_content
        end

        def upload_logo
          field = params[:variant] == "dark" ? :logo_dark : :logo
          return render json: { error: "No logo provided" }, status: :unprocessable_entity if params[:logo].blank?

          Sponsor.transaction do
            @sponsor.lock!
            @sponsor.public_send(field).attach(params[:logo])
            @sponsor.save!
            audit!(@sponsor, "uploaded_#{field}", { blob_id: @sponsor.public_send(field).blob.id })
          end
          render json: { sponsor: serialize(@sponsor.reload) }
        end

        private

        def set_sponsor
          @sponsor = Organization.first!.sponsors.find(params[:id])
        end

        def serialize(sponsor)
          sponsor.as_json.merge(
            "placements" => sponsor.sponsor_placements.order(:sort_order, :id).map { |p| p.attributes.except("sponsor_id") },
            "audit_history" => SponsorAuditLog.where(sponsor_id: sponsor.id).order(created_at: :desc, id: :desc).limit(10).as_json(only: [:action, :actor_name, :created_at])
          )
        end

        def audit_state(sponsor)
          { sponsor: sponsor.attributes, placements: sponsor.sponsor_placements.reload.map(&:attributes) }
        end

        def audit!(sponsor, action, changes)
          SponsorAuditLog.create!(sponsor: sponsor, sponsor_name: sponsor.name, actor: current_user,
            actor_name: current_user.full_name, action: action, change_set: changes)
        end

        def sponsor_params
          params.permit(:name, :tier, :website_url, :sort_order,
            sponsor_placements_attributes: [:id, :_destroy, :placement_type, :display_tier, :event_id, :sort_order,
              :starts_on, :ends_on, :headline, :blurb, :video_url, :cta_url])
        end
      end
    end
  end
end
