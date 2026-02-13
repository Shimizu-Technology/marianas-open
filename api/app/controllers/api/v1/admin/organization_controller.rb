module Api
  module V1
    module Admin
      class OrganizationController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_organization

        def show
          render json: @organization.as_json
        end

        def update
          if @organization.update(organization_params)
            render json: @organization.reload.as_json
          else
            render json: { errors: @organization.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def upload_logo
          unless params[:logo].present?
            return render json: { error: "No logo provided" }, status: :unprocessable_entity
          end

          @organization.logo.attach(params[:logo])
          render json: @organization.reload.as_json
        end

        def upload_banner
          unless params[:banner].present?
            return render json: { error: "No banner provided" }, status: :unprocessable_entity
          end

          @organization.banner.attach(params[:banner])
          render json: @organization.reload.as_json
        end

        private

        def set_organization
          @organization = Organization.first
          render json: { error: "No organization found" }, status: :not_found unless @organization
        end

        def organization_params
          params.permit(
            :name, :description, :primary_color, :secondary_color,
            :contact_email, :phone, :website_url, :instagram_url, :facebook_url
          )
        end
      end
    end
  end
end
