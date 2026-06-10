module Api
  module V1
    module Admin
      class EventGalleryImagesController < ApplicationController
        include ClerkAuthenticatable

        UploadAlreadyUsed = Class.new(StandardError)
        UNCATEGORIZED_FILTER = "__uncategorized__".freeze

        before_action :require_staff!
        before_action :set_event
        before_action :set_gallery_image, only: [ :update, :destroy, :upload ]

        def index
          per_page = [ [ params.fetch(:per_page, 100).to_i, 1 ].max, 200 ].min
          page = [ params.fetch(:page, 1).to_i, 1 ].max
          scope = @event.event_gallery_images.with_image_variant_records.sorted
          scope = scope.where(event_gallery_upload_batch_id: params[:batch_id]) if params[:batch_id].present?
          scope = scope.where(status: params[:status]) if params[:status].present?
          if params[:category].present?
            scope = if params[:category] == UNCATEGORIZED_FILTER
              scope.where(category: [ nil, "" ])
            else
              scope.categorized_as(params[:category])
            end
          end
          total = scope.count
          gallery_images = scope.offset((page - 1) * per_page).limit(per_page)

          render json: {
            gallery_images: gallery_images.as_json,
            categories: gallery_categories,
            uncategorized_count: uncategorized_count,
            total: total,
            page: page,
            per_page: per_page
          }
        end

        def create
          batch = find_batch
          gallery_image = @event.event_gallery_images.build(gallery_image_params)
          gallery_image.event_gallery_upload_batch = batch
          gallery_image.image.attach(params[:image]) if params[:image].present?
          apply_blob_metadata(gallery_image)
          gallery_image.status = "uploaded" if gallery_image.image.attached?

          if gallery_image.save
            refresh_batch_counts(batch)
            render json: { gallery_image: gallery_image.as_json }, status: :created
          else
            render json: { errors: gallery_image.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Upload batch not found" }, status: :unprocessable_entity
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
          if @gallery_image.save
            render json: { gallery_image: @gallery_image.reload.as_json }
          else
            render json: { errors: @gallery_image.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def prepare_direct_upload
          filename = params.require(:filename).to_s
          content_type = EventGalleryImageUploadPolicy.normalize(
            filename: filename,
            content_type: params[:content_type].to_s
          )
          unless content_type.in?(EventGalleryImage::ALLOWED_CONTENT_TYPES)
            return render json: { error: EventGalleryImageUploadPolicy.choose_error }, status: :unprocessable_entity
          end
          byte_size = params.require(:byte_size).to_i
          if byte_size <= 0 || byte_size > EventGalleryImage::MAX_BYTE_SIZE
            return render json: { error: "Images must be smaller than #{EventGalleryImage::MAX_BYTE_SIZE / 1.megabyte} MB" }, status: :unprocessable_entity
          end

          blob = ActiveStorage::Blob.create_before_direct_upload!(
            filename: filename,
            byte_size: byte_size,
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
          saved_image = nil
          saved_existing = false
          errors = nil

          blob.with_lock do
            if (existing_image = attached_gallery_image_for(blob))
              saved_image = existing_image
              saved_existing = true
              next
            end

            raise UploadAlreadyUsed if ActiveStorage::Attachment.exists?(blob_id: blob.id)
            EventGalleryImageUploadPolicy.normalize_blob!(blob)

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
              saved_image = gallery_image
            else
              errors = gallery_image.errors.full_messages
            end
          end

          if saved_image
            refresh_batch_counts(saved_image.event_gallery_upload_batch || batch)
            render json: { gallery_image: saved_image.as_json }, status: saved_existing ? :ok : :created
          else
            render json: { errors: errors }, status: :unprocessable_entity
          end
        rescue ActiveSupport::MessageVerifier::InvalidSignature, ActiveRecord::RecordNotFound
          render json: { error: "Uploaded image could not be found" }, status: :unprocessable_entity
        rescue UploadAlreadyUsed
          render json: { error: "This upload has already been used" }, status: :unprocessable_entity
        end

        def bulk_update
          ids = Array(params[:ids]).map(&:to_i).reject(&:zero?)
          return render json: { error: "No gallery images selected" }, status: :unprocessable_entity if ids.empty?

          attrs = params.permit(:active, :category).to_h.with_indifferent_access
          attrs[:category] = attrs[:category].to_s.squish.presence if attrs.key?(:category)
          return render json: { error: "No supported updates provided" }, status: :unprocessable_entity if attrs.empty?
          if attrs[:category].to_s.length > EventGalleryImage::CATEGORY_MAX_LENGTH
            return render json: { error: "Category must be #{EventGalleryImage::CATEGORY_MAX_LENGTH} characters or fewer" }, status: :unprocessable_entity
          end

          updated = @event.event_gallery_images.where(id: ids).update_all(attrs.merge(updated_at: Time.current))
          render json: { updated: updated }
        end

        def bulk_destroy
          ids = Array(params[:ids]).map(&:to_i).reject(&:zero?)
          return render json: { error: "No gallery images selected" }, status: :unprocessable_entity if ids.empty?

          images = @event.event_gallery_images.with_attached_image.where(id: ids)
          count = images.count
          images.find_each do |image|
            image.image.purge_later if image.image.attached?
            image.destroy
          end
          render json: { deleted: count }
        end

        def destroy
          @gallery_image.image.purge_later if @gallery_image.image.attached?
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
          permitted = params.permit(:title, :alt_text, :caption, :category, :sort_order, :active)
          permitted[:category] = permitted[:category].to_s.squish.presence if permitted.key?(:category)
          permitted
        end

        def gallery_categories
          counts = category_counts
          custom_categories = counts.keys.compact.map { |category| category.to_s.squish }.reject(&:blank?).sort
          (EventGalleryImage::PRESET_CATEGORIES + custom_categories).uniq.map do |category|
            { name: category, count: counts[category].to_i }
          end
        end

        def uncategorized_count
          category_counts[nil].to_i + category_counts[""].to_i
        end

        def category_counts
          @category_counts ||= @event.event_gallery_images.group(:category).count
        end

        def apply_blob_metadata(gallery_image)
          return unless gallery_image.image.attached?

          blob = gallery_image.image.blob
          EventGalleryImageUploadPolicy.normalize_blob!(blob)
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

        def attached_gallery_image_for(blob)
          attachment = ActiveStorage::Attachment.includes(:record).find_by(
            blob_id: blob.id,
            name: "image",
            record_type: "EventGalleryImage"
          )
          return nil unless attachment

          gallery_image = attachment.record
          raise UploadAlreadyUsed unless gallery_image&.event_id == @event.id

          gallery_image
        end

        def refresh_batch_counts(batch)
          return unless batch

          RefreshEventGalleryUploadBatchJob.perform_later(batch.id)
        end
      end
    end
  end
end
