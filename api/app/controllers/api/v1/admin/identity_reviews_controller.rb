module Api
  module V1
    module Admin
      class IdentityReviewsController < ApplicationController
        include ClerkAuthenticatable
        before_action :require_staff!

        def index
          reviews = IdentityReview.where(status: "pending").includes(:candidate_academy).order(:id)
          results = EventResult.where(academy_id: nil).group(:academy).count
          counts = results.each_with_object(Hash.new(0)) do |(name, count), map|
            map[Identity::NameNormalizer.key(name)] += count
          end
          render json: { reviews: reviews.map { |review|
            { id: review.id, raw_name: review.raw_name, candidate_academy_id: review.candidate_academy_id,
              candidate_name: review.candidate_academy&.name, status: review.status,
              results_count: counts[review.normalized_name] }
          } }
        end

        def resolve
          raise ArgumentError, "Explicit confirmation is required" unless params[:confirm] == true
          review = IdentityReview.find(params[:id])
          academy = nil
          IdentityReview.transaction do
            Academy.connection.execute("SELECT pg_advisory_xact_lock(184527001)")
            review.lock!
            if review.status == "resolved"
              academy = review.resolved_academy
            elsif params[:create_new] == true && params[:confirm] == true
              academy = Academy.create!(name: review.raw_name)
            else
              academy = Academy.find(params[:academy_id])
              academy.update!(aliases: (Array(academy.aliases) + [ review.raw_name ]).uniq)
            end
            raise ArgumentError, "A target academy is required" unless academy
            review.update!(status: "resolved", resolved_academy: academy)
            competitor_ids = []
            EventResult.where(academy_id: nil).find_each do |result|
              next unless Identity::NameNormalizer.key(result.academy) == review.normalized_name
              result.update_columns(academy_id: academy.id)
              competitor_ids << result.competitor_id
            end
            Competitor.where(id: competitor_ids.compact.uniq).find_each(&:refresh_current_academy!)
            Rails.logger.info("[Identity] review_resolved actor=#{current_user.id} review=#{review.id} academy=#{academy.id}")
          end
          render json: { academy: academy.as_json }
        rescue ArgumentError, ActiveRecord::RecordInvalid => e
          render json: { error: e.message }, status: :unprocessable_entity
        rescue ActiveRecord::RecordNotFound
          render json: { error: "Review or academy not found" }, status: :not_found
        end
      end
    end
  end
end
