class AddValueZhHantToSiteContents < ActiveRecord::Migration[8.0]
  def change
    add_column :site_contents, :value_zh_hant, :text
  end
end
