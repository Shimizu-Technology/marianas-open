module Api
  module V1
    module Admin
      class AsjjfCalendarController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!
        before_action :require_admin!, only: :decide
        rescue_from ArgumentError, ActiveRecord::RecordInvalid do |error|
          render json: { error: error.message }, status: :unprocessable_entity
        end

        def index
          latest = AsjjfSnapshot.where(page_type: "season_calendar").order(fetched_at: :desc, id: :desc).first
          reviews = AsjjfCalendarReview.where(status: "pending").includes(:snapshot, :event).order(id: :desc)
          reviews = reviews.where.not(kind: "new_draft").or(reviews.where(kind: "new_draft", event_id: Event.where(status: "draft").select(:id)))
          page = pagination_page
          per_page = pagination_limit(default: 25, maximum: 50)
          render json: { last_checked_at: latest&.fetched_at, last_check_status: latest&.parse_status,
            source_url: latest&.url || Asjjf::Url.build("season_calendar", 381),
            total: reviews.count, page: page, per_page: per_page,
            reviews: reviews.offset((page - 1) * per_page).limit(per_page).map { |review| review_json(review) } }
        end

        def decide
          review = AsjjfCalendarReview.find(params[:id])
          review.decide!(params[:decision], actor: current_user)
          render json: { review: review_json(review) }
        end

        private

        def review_json(review)
          review.as_json(only: %i[id kind status title event_id snapshot_id old_values new_values]).merge(
            source_url: review.snapshot.url, event_status: review.event&.status,
            source_checked_at: review.snapshot.fetched_at)
        end
      end
    end
  end
end
