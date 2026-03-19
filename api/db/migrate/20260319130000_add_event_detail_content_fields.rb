class AddEventDetailContentFields < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :tagline, :string
    add_column :events, :schedule_note, :text
    add_column :events, :venue_highlights, :jsonb, default: [], null: false
    add_column :events, :registration_steps, :jsonb, default: [], null: false
    add_column :events, :travel_description, :text
    add_column :events, :travel_items, :jsonb, default: [], null: false
    add_column :events, :visa_description, :text
    add_column :events, :visa_items, :jsonb, default: [], null: false
  end
end
