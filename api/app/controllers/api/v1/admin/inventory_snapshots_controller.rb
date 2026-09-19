module Api
  module V1
    module Admin
      class InventorySnapshotsController < ApplicationController
        include ClerkAuthenticatable

        before_action -> { require_permission!(:commerce_inventory_manage) }

        def show
          organization = Organization.order(:id).first!
          locations = organization.inventory_locations.where(active: true).order(:name)
          products = organization.products.published.where(demo_only: Commerce::Configuration.poc_mode?)
            .includes(product_variants: :inventory_levels).order(:name)

          render json: {
            locations: locations.map { |location| location.slice(:id, :name) },
            products: products.map do |product|
              {
                id: product.id,
                name: product.name,
                active: product.active,
                variants: product.product_variants.select(&:active?).map do |variant|
                  {
                    id: variant.id,
                    name: variant.name,
                    sku: variant.sku,
                    active: variant.active,
                    inventory_levels: variant.inventory_levels.map do |level|
                      level.slice(:inventory_location_id, :on_hand, :reserved).merge(available: level.available)
                    end
                  }
                end
              }
            end
          }
        end
      end
    end
  end
end
