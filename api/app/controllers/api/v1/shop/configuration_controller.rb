module Api
  module V1
    module Shop
      class ConfigurationController < ApplicationController
        def show
          render json: { enabled: Commerce::Configuration.enabled? }
        end
      end
    end
  end
end
