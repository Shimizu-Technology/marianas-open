class CreatePrizeCategories < ActiveRecord::Migration[8.1]
  def change
    create_table :prize_categories do |t|
      t.references :event, null: false, foreign_key: true
      t.string :name
      t.decimal :amount
      t.integer :sort_order

      t.timestamps
    end
  end
end
