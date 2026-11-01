module Api
  module V1
    class SponsorPlacementsController < ApplicationController
      def index
        placements = SponsorPlacement.active_on.with_assets.ordered
        if params[:event_id].present?
          event = Event.publicly_visible.find_by!(id: params[:event_id])
          placements = placements.where(placement_type: "event", event_id: [ nil, event.id ])
            .joins(:sponsor).where(sponsors: { organization_id: event.organization_id })
        else
          placements = placements.where(event_id: nil).where.not(placement_type: "event")
        end
        render json: { sponsor_placements: placements.as_json }
      end
    end
  end
end
