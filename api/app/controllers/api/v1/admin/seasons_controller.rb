module Api
  module V1
    module Admin
      class SeasonsController < ApplicationController
        include ClerkAuthenticatable
        include AdminAuditable

        before_action :require_admin_access!
        before_action :set_season, only: [ :show, :update, :destroy, :activate, :rollover ]

        def index
          seasons = Season.ordered.includes(events: [ :source_event, { hero_image_attachment: :blob } ])
          render json: { seasons: seasons.as_json }
        end

        def show
          season = @season.as_json
          season["events"] = @season.events.map do |event|
            event.attributes.slice("id", "name", "slug", "status", "date")
          end
          render json: { season: season }
        end

        def create
          season = Season.new(season_params)
          if season.save
            record_admin_action!("create", season, changes: season.previous_changes)
            render json: { season: season.as_json }, status: :created
          else
            render json: { errors: season.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @season.update(season_params)
            record_admin_action!("update", @season, changes: @season.previous_changes)
            render json: { season: @season.as_json }
          else
            render json: { errors: @season.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def activate
          @season.update!(current: true, status: "active")
          record_admin_action!("activate", @season, changes: @season.previous_changes)
          render json: { season: @season.as_json }
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        def rollover
          result = SeasonRolloverService.call(
            source_season: @season,
            target_year: params.require(:target_year),
            actor: current_user,
            copy_sponsors: params.fetch(:copy_sponsors, true)
          )
          render json: { season: result[:season].as_json, events: result[:events].as_json }, status: :created
        rescue ArgumentError, ActiveRecord::RecordInvalid => e
          render json: { errors: [ e.message ] }, status: :unprocessable_entity
        rescue ActiveRecord::RecordNotUnique
          render json: { errors: [ "That season or one of its event URLs already exists." ] }, status: :conflict
        end

        def destroy
          if @season.destroy
            record_admin_action!("destroy", @season)
            head :no_content
          else
            render json: { errors: @season.errors.full_messages }, status: :unprocessable_entity
          end
        rescue ActiveRecord::InvalidForeignKey
          render json: { errors: [ "A season with events cannot be deleted." ] }, status: :unprocessable_entity
        end

        private

        def set_season
          @season = Season.find(params[:id])
        end

        def season_params
          params.permit(:year, :name, :description, :status, :current, :starts_on, :ends_on)
        end
      end
    end
  end
end
