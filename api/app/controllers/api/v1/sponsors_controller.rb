module Api
  module V1
    class SponsorsController < ApplicationController
      def index
        sponsors = Sponsor.includes(logo_attachment: :blob).order(:sort_order)
        render json: sponsors
      end
    end
  end
end
