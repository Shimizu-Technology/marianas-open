class CreateImpactMetrics < ActiveRecord::Migration[7.1]
  def change
    create_table :impact_metrics do |t|
      t.string :label, null: false
      t.string :value, null: false
      t.string :description
      t.string :category, null: false, default: "tourism"
      t.string :icon
      t.integer :sort_order, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.boolean :highlight, null: false, default: false
      t.timestamps
    end

    add_index :impact_metrics, :category
    add_index :impact_metrics, [:active, :sort_order]
  end
end
