class AddDemoOnlyToCommerceCatalog < ActiveRecord::Migration[8.1]
  def change
    add_column :products, :demo_only, :boolean, null: false, default: false
    add_column :shipping_packages, :demo_only, :boolean, null: false, default: false
    add_column :orders, :simulated, :boolean, null: false, default: false
  end
end
