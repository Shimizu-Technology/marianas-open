module Api
  module V1
    class UsersController < ApplicationController
      include ClerkAuthenticatable

      before_action :authenticate_user!

      # GET /api/v1/me
      def me
        render json: {
          user: user_json(current_user)
        }
      end

      private

      def user_json(user)
        {
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          full_name: user.full_name,
          role: user.role,
          is_admin: user.is_admin,
          is_staff: user.is_staff,
          created_at: user.created_at,
          updated_at: user.updated_at
        }
      end
    end
  end
end
