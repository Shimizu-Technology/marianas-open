class FixInvitedByForeignKeyNullify < ActiveRecord::Migration[8.1]
  def change
    remove_foreign_key :users, :users, column: :invited_by_id
    add_foreign_key :users, :users, column: :invited_by_id, on_delete: :nullify
  end
end
