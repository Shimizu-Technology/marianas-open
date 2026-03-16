class AddValuePtToSiteContents < ActiveRecord::Migration[8.1]
  def change
    add_column :site_contents, :value_pt, :text
  end
end
