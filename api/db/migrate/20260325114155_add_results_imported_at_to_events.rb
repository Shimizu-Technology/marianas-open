class AddResultsImportedAtToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :results_imported_at, :datetime
  end
end
