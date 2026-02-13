class CreateEventScheduleItems < ActiveRecord::Migration[8.1]
  def change
    create_table :event_schedule_items do |t|
      t.references :event, null: false, foreign_key: true
      t.string :time
      t.string :description
      t.integer :sort_order

      t.timestamps
    end
  end
end
