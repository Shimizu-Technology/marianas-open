class CreateEventAccommodations < ActiveRecord::Migration[8.1]
  def change
    create_table :event_accommodations do |t|
      t.references :event, null: false, foreign_key: true
      t.string :hotel_name, null: false
      t.text :description
      t.string :room_types
      t.string :rate_info
      t.string :inclusions
      t.date :check_in_date
      t.date :check_out_date
      t.string :booking_url
      t.string :booking_code
      t.string :contact_email
      t.string :contact_phone
      t.integer :sort_order, default: 0, null: false
      t.boolean :active, default: true, null: false
      t.timestamps
    end

    add_index :event_accommodations, [:event_id, :active]
  end
end
