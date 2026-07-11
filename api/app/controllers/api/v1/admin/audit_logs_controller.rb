module Api
  module V1
    module Admin
      class AuditLogsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_admin_access!

        def index
          logs = AuditLog.includes(:actor).recent.limit(params.fetch(:limit, 50).to_i.clamp(1, 100))
          render json: { audit_logs: logs.as_json }
        end
      end
    end
  end
end
