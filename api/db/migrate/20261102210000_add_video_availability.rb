class AddVideoAvailability < ActiveRecord::Migration[8.1]
  def change
    add_column :videos, :availability_status, :string, null: false, default: 'unknown'
    add_column :videos, :availability_checked_at, :datetime
    add_column :videos, :consecutive_failures, :integer, null: false, default: 0
    add_column :videos, :availability_hidden, :boolean, null: false, default: false
  end
end
