module Api
  module V1
    module Admin
      # All admin endpoints share this boundary, including nested intake controllers.
      class BaseController < ApplicationController
        include ClerkAuthenticatable

        before_action :authorize_admin_access!

        private

        def authorize_admin_access!
          authenticate_user!
          return if performed?
          return if current_user.staff?

          unless current_user.viewer? && (request.get? || request.head?) && action_name != "import_results_preview"
            render_forbidden("Viewer access is read-only")
          end
        end
      end
    end
  end
end
