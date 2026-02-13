module Api
  module V1
    module Admin
      class UsersController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_admin!
        before_action :set_user, only: [:show, :update, :destroy]

        # GET /api/v1/admin/users
        def index
          users = User.all.order(:created_at)
          render json: { users: users.map { |u| user_json(u) } }
        end

        # GET /api/v1/admin/users/:id
        def show
          render json: { user: user_json(@user) }
        end

        # POST /api/v1/admin/users
        def create
          user = User.new(user_params)
          user.clerk_id = "pending_#{SecureRandom.uuid}" if user.clerk_id.blank?

          if user.save
            render json: { user: user_json(user) }, status: :created
          else
            render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # PATCH /api/v1/admin/users/:id
        def update
          if @user.update(user_params)
            render json: { user: user_json(@user) }
          else
            render json: { errors: @user.errors.full_messages }, status: :unprocessable_entity
          end
        end

        # DELETE /api/v1/admin/users/:id
        def destroy
          if @user.id == current_user.id
            return render json: { error: "Cannot delete yourself" }, status: :unprocessable_entity
          end

          if @user.admin? && User.where(role: "admin").count <= 1
            return render json: { error: "Cannot delete the last admin user" }, status: :unprocessable_entity
          end

          @user.destroy
          head :no_content
        end

        private

        def set_user
          @user = User.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "User not found" }, status: :not_found
        end

        def user_params
          params.permit(:email, :first_name, :last_name, :role)
        end

        def user_json(user)
          {
            id: user.id,
            clerk_id: user.clerk_id,
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
end
