module Api
  module V1
    module Admin
      class EventGalleryDayProposalsController < GalleryIntakeController
        def index
          render json: PhotoIntake::DayProposals.new(@event, params[:album_type], category: params[:category]).call
        end

        def create
          proposals = params[:proposals]
          # Convert strong parameter objects without permitting arbitrary model fields.
          proposals = proposals.map { |proposal| proposal.permit(:category, image_ids: []).to_h } if proposals.is_a?(Array) && proposals.all? { |proposal| proposal.is_a?(ActionController::Parameters) }
          updated = PhotoIntake::DayProposals.new(@event, params[:album_type], category: params[:category]).apply!(proposals)
          render json: { updated: updated }
        end
      end
    end
  end
end
