module Api
  module V1
    module Admin
      class ProductsController < ApplicationController
        include ClerkAuthenticatable

        before_action -> { require_permission!(:commerce_catalog_manage) }
        before_action :set_product, only: %i[show update destroy]

        def index
          products = organization.products.order(:sort_order, :name).includes(catalog_includes)
          render json: { products: products.map { |product| present(product) } }
        end

        def show
          render json: { product: present(@product) }
        end

        def create
          product = Commerce::SaveProduct.call(organization:, attributes: product_payload)
          render json: { product: present(reload_product(product)) }, status: :created
        rescue ActiveRecord::RecordInvalid, Commerce::SaveProduct::InvalidCatalog => e
          render json: { errors: error_messages(e) }, status: :unprocessable_entity
        end

        def update
          product = Commerce::SaveProduct.call(
            organization:,
            attributes: product_payload.merge(id: @product.id)
          )
          render json: { product: present(reload_product(product)) }
        rescue ActiveRecord::RecordInvalid, Commerce::SaveProduct::InvalidCatalog => e
          render json: { errors: error_messages(e) }, status: :unprocessable_entity
        end

        def destroy
          if @product.destroy
            head :no_content
          else
            render json: { errors: @product.errors.full_messages }, status: :unprocessable_entity
          end
        end

        private

        def organization
          @organization ||= Organization.order(:id).first!
        end

        def set_product
          @product = organization.products.find(params[:id])
        end

        def product_payload
          params.require(:product).permit(
            :name, :slug, :description, :active, :featured, :shippable, :pickup_enabled, :sort_order, :demo_only,
            options: [ :id, :client_key, :name, :position, { values: %i[id client_key value position] } ],
            variants: [
              :id, :name, :sku, :active, :price_cents, :compare_at_price_cents, :currency,
              :allow_shipping, :allow_pickup, :weight_grams, :length_mm, :width_mm, :height_mm,
              :customs_description, :country_of_origin, :hts_code, :position,
              { selected_value_ids: [], selected_value_keys: [] }
            ]
          )
        end

        def catalog_includes
          [
            { product_options: :product_option_values },
            { product_variants: [ :product_option_values, :inventory_levels ] },
            { product_images: { image_attachment: :blob } }
          ]
        end

        def reload_product(product)
          organization.products.includes(catalog_includes).find(product.id)
        end

        def present(product)
          Commerce::AdminCatalogPresenter.new(product).as_json
        end

        def error_messages(error)
          error.respond_to?(:record) ? error.record.errors.full_messages : [ error.message ]
        end
      end
    end
  end
end
