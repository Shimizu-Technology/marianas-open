class AddAsjjfEventIdsToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :asjjf_event_ids, :jsonb, default: []
  end
end
