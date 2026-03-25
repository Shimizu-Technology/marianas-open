module Api
  module V1
    module Admin
      class UsersController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_admin!
        before_action :set_user, only: [:show, :update, :destroy, :resend_invitation]

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
          user = User.new(invite_params)
          user.clerk_id = "pending_#{SecureRandom.uuid}"
          user.invitation_status = "pending"
          user.invited_by = current_user
          user.invited_at = Time.current

          unless user.save
            return render json: { errors: user.errors.full_messages }, status: :unprocessable_entity
          end

          invitation_result = send_clerk_invitation(user)

          if invitation_result[:success]
            user.update(clerk_invitation_id: invitation_result[:invitation_id])
            render json: {
              user: user_json(user),
              invitation_sent: true
            }, status: :created
          else
            render json: {
              user: user_json(user),
              invitation_sent: false,
              invitation_error: invitation_result[:error]
            }, status: :created
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

          if @user.clerk_invitation_id.present? && @user.invitation_pending?
            service = ClerkInvitationService.new
            service.revoke_invitation(@user.clerk_invitation_id) if service.configured?
          end

          @user.destroy
          head :no_content
        end

        # POST /api/v1/admin/users/:id/resend_invitation
        def resend_invitation
          unless @user.invitation_pending?
            return render json: { error: "User has already accepted their invitation" }, status: :unprocessable_entity
          end

          invitation_result = send_clerk_invitation(@user, ignore_existing: true)

          if invitation_result[:success]
            @user.update(clerk_invitation_id: invitation_result[:invitation_id], invited_at: Time.current)
            render json: { user: user_json(@user), invitation_sent: true }
          else
            render json: {
              error: "Failed to resend invitation: #{invitation_result[:error]}",
              invitation_sent: false
            }, status: :unprocessable_entity
          end
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

        def invite_params
          permitted = params.permit(:email, :role)
          unless %w[admin staff].include?(permitted[:role])
            permitted[:role] = "staff"
          end
          permitted
        end

        def send_clerk_invitation(user, ignore_existing: false)
          service = ClerkInvitationService.new
          unless service.configured?
            return { success: false, error: "Clerk API not configured" }
          end

          redirect_url = build_redirect_url
          service.create_invitation(
            email: user.email,
            redirect_url: redirect_url,
            public_metadata: { role: user.role },
            ignore_existing: ignore_existing
          )
        end

        def build_redirect_url
          allowed = ENV.fetch("ALLOWED_ORIGINS", "http://localhost:5173")
          origin = allowed.split(",").first.strip
          "#{origin}/admin"
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
            invitation_status: user.invitation_status,
            invitation_pending: user.invitation_pending?,
            invited_at: user.invited_at,
            created_at: user.created_at,
            updated_at: user.updated_at
          }
        end
      end
    end
  end
end
