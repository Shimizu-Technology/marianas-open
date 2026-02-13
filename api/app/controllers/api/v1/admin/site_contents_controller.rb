module Api
  module V1
    module Admin
      class SiteContentsController < ApplicationController
        include ClerkAuthenticatable

        before_action :require_staff!
        before_action :set_site_content, only: [:update, :destroy]

        def index
          contents = SiteContent.all.order(:section, :sort_order)
          grouped = contents.group_by(&:section).transform_values do |items|
            items.map { |c| serialize(c) }
          end
          render json: { site_contents: grouped }
        end

        def create
          content = SiteContent.new(site_content_params)
          if content.save
            render json: { site_content: serialize(content) }, status: :created
          else
            render json: { errors: content.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def update
          if @site_content.update(site_content_params)
            render json: { site_content: serialize(@site_content) }
          else
            render json: { errors: @site_content.errors.full_messages }, status: :unprocessable_entity
          end
        end

        def destroy
          @site_content.destroy
          head :no_content
        end

        private

        def set_site_content
          @site_content = SiteContent.find(params[:id])
        end

        def site_content_params
          params.permit(:key, :content_type, :value_en, :value_ja, :value_ko, :value_tl, :value_zh, :section, :label, :sort_order)
        end

        def serialize(c)
          {
            id: c.id,
            key: c.key,
            content_type: c.content_type,
            value_en: c.value_en,
            value_ja: c.value_ja,
            value_ko: c.value_ko,
            value_tl: c.value_tl,
            value_zh: c.value_zh,
            section: c.section,
            label: c.label,
            sort_order: c.sort_order
          }
        end
      end
    end
  end
end
