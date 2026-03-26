class CreateAnnouncements < ActiveRecord::Migration[8.1]
  def change
    create_table :announcements do |t|
      t.string :title, null: false
      t.text :body
      t.string :link_url
      t.string :link_text
      t.string :announcement_type, default: 'info'
      t.boolean :active, default: true
      t.datetime :starts_at
      t.datetime :ends_at
      t.integer :sort_order, default: 0
      t.timestamps
    end
  end
end
