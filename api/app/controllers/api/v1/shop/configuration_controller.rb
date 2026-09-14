module Api
  module V1
    module Shop
      class ConfigurationController < ApplicationController
        def show
          render json: {
            enabled: Commerce::Configuration.enabled?,
            fake_checkout_enabled: Commerce::Payments.fake_checkout_enabled?
          }
        end
      end
    end
  end
end
