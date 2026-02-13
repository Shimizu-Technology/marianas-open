module Api
  module V1
    class OrganizationsController < ApplicationController
      def show
        org = Organization.first
        if org
          render json: org
        else
          render json: { error: "Organization not found" }, status: :not_found
        end
      end
    end
  end
end
