module Api
  module V1
    class SponsorsController < ApplicationController
      def index
        sponsors = Sponsor.order(:sort_order)
        render json: sponsors
      end
    end
  end
end
