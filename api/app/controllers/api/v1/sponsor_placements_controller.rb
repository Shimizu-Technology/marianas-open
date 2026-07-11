module Api
  module V1
    class SponsorPlacementsController < ApplicationController
      def index
        placements = SponsorPlacement.active_now.ordered.includes(:sponsor)
        placements = placements.where(placement_type: params[:placement_type]) if params[:placement_type].present?
        placements = if params[:season_id].present?
          placements.where(season_id: params[:season_id])
        else
          placements.where(season_id: [ nil, Season.current_season&.id ])
        end
        placements = params[:event_id].present? ? placements.where(event_id: params[:event_id]) : placements.where(event_id: nil)
        render json: { sponsor_placements: placements.as_json }
      end
    end
  end
end
