module Api
  module V1
    module Admin
      class AttentionController < BaseController
        def index
          response.headers["Cache-Control"] = "no-store"
          render json: AdminAttention.new.call
        end
      end
    end
  end
end
