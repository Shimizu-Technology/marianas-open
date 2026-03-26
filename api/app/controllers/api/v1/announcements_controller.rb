module Api
  module V1
    class AnnouncementsController < ApplicationController
      def index
        announcements = Announcement.active_now
        render json: { announcements: announcements }
      end
    end
  end
end
