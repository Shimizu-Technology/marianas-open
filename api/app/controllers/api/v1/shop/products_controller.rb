module Api
  module V1
    module Shop
      class ProductsController < ApplicationController
        before_action :require_commerce

        def index
          products = storefront_products

          render json: { products: products.map { |product| Commerce::CatalogPresenter.new(product).as_json } }
        end

        def show
          product = storefront_products.find_by!(slug: params[:slug])

          render json: { product: Commerce::CatalogPresenter.new(product).as_json }
        end

        private

        def require_commerce
          return if Commerce::Configuration.enabled?

          head :not_found
        end

        def storefront_products
          Organization.order(:id).first!.products.published.includes(
            :product_collections,
            product_options: :product_option_values,
            product_variants: [ :product_option_values, :inventory_levels ],
            product_images: { image_attachment: :blob }
          )
        end
      end
    end
  end
end
