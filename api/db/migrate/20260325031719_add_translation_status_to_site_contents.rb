class AddTranslationStatusToSiteContents < ActiveRecord::Migration[8.1]
  def change
    add_column :site_contents, :translation_status, :string, default: "translated", null: false
  end
end
