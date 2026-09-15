module Api
  module V1
    module Admin
      class CommerceLaunchReadinessController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!

        def show
          render json: readiness.as_json
        end

        def update_check
          gate = Commerce::LaunchReadiness.manual_gate(params[:key])
          return render json: { error: "Unknown launch check." }, status: :not_found unless gate

          attributes = params.require(:check).permit(:status, :note)
          status = attributes.fetch(:status).to_s
          unless CommerceLaunchCheck::STATUSES.include?(status)
            return render json: { error: "Status must be pending, passed, or blocked." }, status: :unprocessable_entity
          end
          if status != "pending" && attributes[:note].to_s.strip.blank?
            return render json: { error: "Add an evidence or blocker note before saving this sign-off." }, status: :unprocessable_entity
          end

          check = organization.commerce_launch_checks.find_or_initialize_by(key: gate.fetch(:key))
          check.assign_attributes(status:, note: attributes[:note].to_s.strip.first(2_000))
          check.reviewed_by = status == "pending" ? nil : current_user
          check.reviewed_at = status == "pending" ? nil : Time.current
          check.save!
          render json: readiness.as_json
        rescue ActionController::ParameterMissing, KeyError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def readiness
          Commerce::LaunchReadiness.new(organization:)
        end
      end
    end
  end
end
