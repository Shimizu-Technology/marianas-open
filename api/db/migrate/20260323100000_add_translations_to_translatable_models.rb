class AddTranslationsToTranslatableModels < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :translations, :jsonb, default: {}, null: false
    add_column :events, :translation_status, :string, default: "untranslated", null: false

    add_column :event_schedule_items, :translations, :jsonb, default: {}, null: false
    add_column :event_schedule_items, :translation_status, :string, default: "untranslated", null: false

    add_column :prize_categories, :translations, :jsonb, default: {}, null: false
    add_column :prize_categories, :translation_status, :string, default: "untranslated", null: false

    add_column :event_accommodations, :translations, :jsonb, default: {}, null: false
    add_column :event_accommodations, :translation_status, :string, default: "untranslated", null: false
  end
end
