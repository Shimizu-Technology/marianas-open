class AddGinIndexToAcademyAliases < ActiveRecord::Migration[7.1]
  def change
    add_index :academies, :aliases, using: :gin
  end
end
