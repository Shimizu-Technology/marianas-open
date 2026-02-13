class CreateVideos < ActiveRecord::Migration[8.0]
  def change
    create_table :videos do |t|
      t.references :event, null: true, foreign_key: true
      t.string :title, null: false
      t.string :youtube_url, null: false
      t.string :youtube_video_id
      t.string :competitor_1_name
      t.string :competitor_2_name
      t.string :weight_class
      t.string :belt_rank
      t.string :round
      t.string :result
      t.integer :duration_seconds
      t.string :category
      t.integer :sort_order, default: 0
      t.boolean :featured, default: false
      t.string :status, default: 'published'

      t.timestamps
    end
    add_index :videos, :youtube_video_id
    add_index :videos, :featured
  end
end
