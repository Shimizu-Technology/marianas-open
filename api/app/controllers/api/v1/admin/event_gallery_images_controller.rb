module Api
  module V1
    module Admin
      class EventGalleryImagesController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_event
        before_action :set_gallery_image, only: [:update, :destroy, :upload]

        def index
          per_page = [[params.fetch(:per_page, 100).to_i, 1].max, 200].min
          page = [params.fetch(:page, 1).to_i, 1].max
          scope = @event.event_gallery_images.with_attached_image.sorted
          scope = scope.where(event_gallery_upload_batch_id: params[:batch_id]) if params[:batch_id].present?
          scope = scope.where(status: params[:status]) if params[:status].present?
          total = scope.count
          gallery_images = scope.offset((page - 1) * per_page).limit(per_page)

          render json: {
            gallery_images: gallery_images.as_json,
            total: total,
            page: page,
            per_page: per_page
          }
        end

        def create
          gallery_image = @event.event_gallery_images.build(gallery_image_params)
          gallery_image.image.attach(params[:image]) if params[:image].present?
          apply_blob_metadata(gallery_image)
          gallery_image.status = "uploaded" if gallery_image.image.attached?

          if gallery_image.save
            render json: { gallery_image: gallery_image.as_json }, status: :created
          else
            render json: { errors: gallery_image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @gallery_image.update(gallery_image_params)
            render json: { gallery_image: @gallery_image.reload.as_json }
          else
            render json: { errors: @gallery_image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def upload
          unless params[:image].present?
            return render json: { error: "No image provided" }, status: :unprocessable_entity
          end

          @gallery_image.image.attach(params[:image])
          apply_blob_metadata(@gallery_image)
          @gallery_image.status = "uploaded"
          @gallery_image.save!
          render json: { gallery_image: @gallery_image.reload.as_json }
        end

        def prepare_direct_upload
          content_type = params[:content_type].to_s
          unless content_type.start_with?("image/")
            return render json: { error: "Only image uploads are supported" }, status: :unprocessable_entity
          end

          blob = ActiveStorage::Blob.create_before_direct_upload!(
            filename: params.require(:filename),
            byte_size: params.require(:byte_size).to_i,
            checksum: params.require(:checksum),
            content_type: content_type,
            metadata: { event_id: @event.id }
          )

          render json: {
            signed_id: blob.signed_id,
            direct_upload: {
              url: blob.service_url_for_direct_upload,
              headers: blob.service_headers_for_direct_upload
            }
          }
        end

        def complete_direct_upload
          blob = ActiveStorage::Blob.find_signed!(params.require(:signed_id))
          batch = find_batch
          gallery_image = @event.event_gallery_images.build(gallery_image_params)
          gallery_image.event_gallery_upload_batch = batch
          gallery_image.status = "uploaded"
          gallery_image.original_filename = blob.filename.to_s
          gallery_image.content_type = blob.content_type
          gallery_image.byte_size = blob.byte_size
          gallery_image.title = gallery_image.title.presence || blob.filename.base
          gallery_image.alt_text = gallery_image.alt_text.presence || gallery_image.title
          gallery_image.image.attach(blob)

          if gallery_image.save
            batch&.refresh_counts!
            render json: { gallery_image: gallery_image.as_json }, status: :created
          else
            render json: { errors: gallery_image.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
          render json: { error: "Uploaded image could not be found" }, status: :unprocessable_entity
        end

        def bulk_update
          ids = Array(params[:ids]).map(&:to_i).reject(&:zero?)
          return render json: { error: "No gallery images selected" }, status: :unprocessable_entity if ids.empty?

          attrs = params.permit(:active, :status).to_h
          attrs.delete("status") unless attrs["status"].in?(EventGalleryImage::STATUSES)
          updated = @event.event_gallery_images.where(id: ids).update_all(attrs.merge(updated_at: Time.current))
          render json: { updated: updated }
        end

        def bulk_destroy
          ids = Array(params[:ids]).map(&:to_i).reject(&:zero?)
          return render json: { error: "No gallery images selected" }, status: :unprocessable_entity if ids.empty?

          images = @event.event_gallery_images.where(id: ids)
          count = images.count
          images.find_each do |image|
            image.image.purge if image.image.attached?
            image.destroy
          end
          render json: { deleted: count }
        end

        def destroy
          @gallery_image.image.purge if @gallery_image.image.attached?
          @gallery_image.destroy
          head :no_content
        end

        private

        def set_event
          @event = Event.find(params[:event_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Event not found" }, status: :not_found
        end

        def set_gallery_image
          @gallery_image = @event.event_gallery_images.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Gallery image not found" }, status: :not_found
        end

        def gallery_image_params
          params.permit(:title, :alt_text, :caption, :sort_order, :active)
        end

        def apply_blob_metadata(gallery_image)
          return unless gallery_image.image.attached?

          blob = gallery_image.image.blob
          gallery_image.original_filename = blob.filename.to_s
          gallery_image.content_type = blob.content_type
          gallery_image.byte_size = blob.byte_size
          gallery_image.title = gallery_image.title.presence || blob.filename.base
          gallery_image.alt_text = gallery_image.alt_text.presence || gallery_image.title
        end

        def find_batch
          return nil if params[:batch_id].blank?

          @event.event_gallery_upload_batches.find(params[:batch_id])
        end
      end
    end
  end
end
