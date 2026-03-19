class AddEventRegistrationContentFields < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :registration_fee_sections, :jsonb, default: [], null: false
    add_column :events, :registration_info_items, :jsonb, default: [], null: false
  end
end
