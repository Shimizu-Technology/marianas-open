module Api
  module V1
    class AnnouncementsController < ApplicationController
      def index
        announcements = Announcement.active_now.limit(1)
        render json: { announcements: announcements }
      end
    end
  end
end
