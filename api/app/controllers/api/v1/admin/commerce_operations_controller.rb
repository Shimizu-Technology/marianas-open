module Api
  module V1
    module Admin
      class CommerceOperationsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!

        def show
          render json: Commerce::OperationsSnapshot.new(organization:, from: params[:from], to: params[:to]).as_json
        rescue ArgumentError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        def report
          snapshot = Commerce::OperationsSnapshot.new(organization:, from: params[:from], to: params[:to])
          period = snapshot.period
          send_data snapshot.to_csv, type: "text/csv; charset=utf-8", disposition: "attachment",
            filename: "marianas-open-commerce-#{period[:from]}-to-#{period[:to]}.csv"
        rescue ArgumentError => e
          render json: { error: e.message }, status: :unprocessable_entity
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end
      end
    end
  end
end
