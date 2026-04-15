class CreateImpactConfiguration < ActiveRecord::Migration[7.1]
  def change
    create_table :impact_configurations do |t|
      t.decimal :economic_impact, precision: 14, scale: 2, null: false, default: 0
      t.string :economic_impact_label, default: "Economic Impact"
      t.string :investment_label, default: "Total Investment"
      t.text :roi_description
      t.string :year_label
      t.timestamps
    end
  end
end
