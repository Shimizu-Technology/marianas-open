class AddLiveStreamFieldsToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :live_stream_url, :string
    add_column :events, :live_stream_active, :boolean, default: false, null: false
  end
end
