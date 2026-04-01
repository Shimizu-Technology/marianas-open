class CreateFundAllocations < ActiveRecord::Migration[7.1]
  def change
    create_table :fund_allocations do |t|
      t.string :category, null: false
      t.decimal :amount, precision: 12, scale: 2, null: false, default: 0
      t.string :description
      t.string :color
      t.integer :sort_order, null: false, default: 0
      t.boolean :active, null: false, default: true
      t.timestamps
    end

    add_index :fund_allocations, [:active, :sort_order]
  end
end
