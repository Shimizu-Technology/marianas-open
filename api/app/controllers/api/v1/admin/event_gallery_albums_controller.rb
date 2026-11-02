module Api
  module V1
    module Admin
      class EventGalleryAlbumsController < GalleryIntakeController
        def index
          render json: { albums: @event.event_gallery_albums.sorted.map(&:summary), settings: settings_json }
        end

        def create
          album = nil
          @event.with_lock do
            album = @event.event_gallery_albums.create!(name: params.require(:name), sort_order: @event.event_gallery_albums.count)
          end
          render json: { album: album.summary }, status: :created
        end

        def update
          album = @event.event_gallery_albums.find(params[:id])
          album.move_and_rename!(params.permit(:name, :sort_order).to_h)
          render json: { album: album.summary }
        end

        def settings
          timezone = params[:timezone] || @event.gallery_timezone
          PhotoIntake::CaptureTime.zone(timezone)
          @event.update!(gallery_timezone: timezone, gallery_hold_flagged: boolean_param(:hold_flagged, default: @event.gallery_hold_flagged))
          render json: { settings: settings_json }
        end
      end
    end
  end
end
