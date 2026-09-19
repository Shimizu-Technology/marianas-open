module Api
  module V1
    module Admin
      class ProductImagesController < ApplicationController
        include ClerkAuthenticatable

        before_action -> { require_permission!(:commerce_catalog_manage) }
        before_action :set_product
        before_action :set_image, only: %i[update destroy]

        def create
          unless params[:image].present?
            return render json: { errors: [ "Choose an image to upload" ] }, status: :unprocessable_entity
          end

          image = @product.product_images.new(image_attributes)
          image.image.attach(params[:image])
          image.save!
          render json: { product: present_product }, status: :created
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        def update
          @image.update!(image_attributes)
          render json: { product: present_product }
        rescue ActiveRecord::RecordInvalid => e
          render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
        end

        def destroy
          if @product.active? && @product.product_images.joins(:image_attachment).count <= 1
            return render json: { errors: [ "Archive the product or upload a replacement before removing its last image" ] }, status: :unprocessable_entity
          end

          @image.destroy!
          render json: { product: present_product }
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def set_product
          @product = organization.products.find(params[:product_id])
        end

        def set_image
          @image = @product.product_images.find(params[:id])
        end

        def image_attributes
          permitted = params.permit(:alt_text, :sort_order, :product_variant_id)
          if permitted[:product_variant_id].present?
            permitted[:product_variant_id] = @product.product_variants.find(permitted[:product_variant_id]).id
          end
          permitted
        end

        def present_product
          product = organization.products.includes(
            product_options: :product_option_values,
            product_variants: [ :product_option_values, :inventory_levels ],
            product_images: { image_attachment: :blob }
          ).find(@product.id)
          Commerce::AdminCatalogPresenter.new(product).as_json
        end
      end
    end
  end
end
