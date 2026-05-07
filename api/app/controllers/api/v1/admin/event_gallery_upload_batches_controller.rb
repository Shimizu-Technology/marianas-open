module Api
  module V1
    module Admin
      class EventGalleryUploadBatchesController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_event
        before_action :set_batch, only: [:show, :update, :destroy]

        def index
          batches = @event.event_gallery_upload_batches.recent.limit(25)
          render json: { batches: batches.as_json }
        end

        def show
          @batch.refresh_counts!
          render json: { batch: @batch.reload.as_json }
        end

        def create
          batch = @event.event_gallery_upload_batches.build(batch_params)
          if batch.save
            render json: { batch: batch.as_json }, status: :created
          else
            render json: { errors: batch.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @batch.update(batch_params)
            @batch.refresh_counts! unless @batch.status == "cancelled"
            render json: { batch: @batch.reload.as_json }
          else
            render json: { errors: @batch.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @batch.update!(status: "cancelled", completed_at: Time.current)
          render json: { batch: @batch.as_json }
        end

        private

        def set_event
          @event = Event.find(params[:event_id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Event not found" }, status: :not_found
        end

        def set_batch
          @batch = @event.event_gallery_upload_batches.find(params[:id])
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Upload batch not found" }, status: :not_found
        end

        def batch_params
          params.permit(:title, :status, :total_files, :total_bytes, :notes)
        end
      end
    end
  end
end
