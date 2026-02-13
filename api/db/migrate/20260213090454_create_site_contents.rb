class CreateSiteContents < ActiveRecord::Migration[8.0]
  def change
    create_table :site_contents do |t|
      t.string :key, null: false
      t.string :content_type, default: 'text'
      t.text :value_en
      t.text :value_ja
      t.text :value_ko
      t.text :value_tl
      t.text :value_zh
      t.string :section
      t.string :label
      t.integer :sort_order, default: 0
      t.timestamps
    end

    add_index :site_contents, :key, unique: true
    add_index :site_contents, :section
  end
end
