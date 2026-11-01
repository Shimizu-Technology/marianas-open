require "base64"

module Api
  module V1
    module Admin
      class EventGalleryImportsController < GalleryIntakeController
        rescue_from ActiveSupport::MessageVerifier::InvalidSignature do
          render json: { error: "Uploaded archive could not be found" }, status: :unprocessable_entity
        end

        def index
          render json: { imports: @event.event_gallery_imports.order(id: :desc).limit(25).map(&:as_json) }
        end

        def prepare_direct_upload
          filename = params.require(:filename).to_s
          size = Integer(params.require(:byte_size).to_s, 10)
          checksum = params.require(:checksum).to_s
          valid = filename.length <= 255 && filename.match?(/\A[^\/\\\x00-\x1f]+\.zip\z/i) && size.between?(1, PhotoIntake::Archive::MAX_BYTES)
          raise ArgumentError, "Choose a ZIP archive between 1 byte and 4 GiB" unless valid
          raise ArgumentError, "checksum must be base64 MD5" unless Base64.strict_decode64(checksum).bytesize == 16
          blob = ActiveStorage::Blob.create_before_direct_upload!(filename: filename, byte_size: size,
            checksum: checksum, content_type: "application/zip",
            metadata: { photo_intake: true, event_id: @event.id, prepared_by: current_user.id })
          render json: { signed_id: blob.signed_id, direct_upload: {
            url: blob.service_url_for_direct_upload, headers: blob.service_headers_for_direct_upload
          } }
        end

        def create
          signed_id = params.require(:signed_id)
          blob_id = ActiveStorage::Blob.signed_id_verifier.verify(signed_id, purpose: :blob_id)
          prior = @event.event_gallery_imports.find_by(source_blob_id: blob_id, prepared_by_id: current_user.id)
          if prior
            ImportEventGalleryArchiveJob.perform_later(prior.id) unless prior.terminal?
            return render json: { import: prior.as_json }
          end
          blob = ActiveStorage::Blob.find(blob_id)
          unless blob.metadata["photo_intake"] == true && blob.metadata["event_id"] == @event.id && blob.metadata["prepared_by"] == current_user.id
            raise ArgumentError, "Archive was not prepared by this user for this event"
          end
          import = nil
          existing = false
          @event.with_lock do
            import = @event.event_gallery_imports.find_by(source_blob_id: blob.id)
            existing = import.present?
            unless import
              raise ArgumentError, "Archive has already been attached" if blob.attachments.exists?
              type = params.require(:album_type).to_s.squish
              import = @event.event_gallery_imports.build(source_blob_id: blob.id,
                prepared_by_id: current_user.id, filename: blob.filename.to_s, album_type: type, category: params.key?(:category) ? params[:category].to_s.squish.presence : type,
                timezone: params[:timezone].presence || @event.gallery_timezone,
                hold_flagged: boolean_param(:hold_flagged, default: @event.gallery_hold_flagged))
              import.archive.attach(blob)
              import.save!
            end
          end
          # Re-enqueue nonterminal retries to recover a web crash after commit but
          # before enqueue. The worker's event lock and entry ledger make it safe.
          ImportEventGalleryArchiveJob.perform_later(import.id) unless import.terminal?
          render json: { import: import.as_json }, status: existing ? :ok : :accepted
        end
      end
    end
  end
end
