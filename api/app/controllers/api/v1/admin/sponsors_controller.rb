module Api
  module V1
    module Admin
      class SponsorsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_sponsor, only: [:show, :update, :destroy, :upload_logo]

        def index
          sponsors = Organization.first&.sponsors&.order(:tier, :sort_order) || []
          render json: { sponsors: sponsors.as_json }
        end

        def create
          org = Organization.first
          return render json: { error: "No organization found" }, status: :unprocessable_entity unless org

          sponsor = org.sponsors.build(sponsor_params)
          if sponsor.save
            render json: { sponsor: sponsor.as_json }, status: :created
          else
            render json: { errors: sponsor.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @sponsor.update(sponsor_params)
            render json: { sponsor: @sponsor.reload.as_json }
          else
            render json: { errors: @sponsor.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @sponsor.destroy
          head :no_content
        end

        def upload_logo
          unless params[:logo].present?
            return render json: { error: "No logo provided" }, status: :unprocessable_entity
          end

          @sponsor.logo.attach(params[:logo])
          render json: { sponsor: @sponsor.reload.as_json }
        end

        private

        def set_sponsor
          @sponsor = Sponsor.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Sponsor not found" }, status: :not_found
        end

        def sponsor_params
          params.permit(:name, :tier, :website_url, :sort_order)
        end
      end
    end
  end
end
