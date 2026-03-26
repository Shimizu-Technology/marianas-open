class AddAliasesToAcademies < ActiveRecord::Migration[8.1]
  def change
    add_column :academies, :aliases, :jsonb, default: []
  end
end
