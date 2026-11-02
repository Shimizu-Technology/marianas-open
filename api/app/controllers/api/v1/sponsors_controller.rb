module Api
  module V1
    class SponsorsController < ApplicationController
      def index
        sponsors = Sponsor.eager_load(logo_attachment: :blob, logo_dark_attachment: :blob).order(:sort_order)
        render json: sponsors
      end
    end
  end
end
