class AddIndexesOnTranslationStatus < ActiveRecord::Migration[8.1]
  def change
    add_index :events, :translation_status
    add_index :event_schedule_items, :translation_status
    add_index :prize_categories, :translation_status
    add_index :event_accommodations, :translation_status
  end
end
