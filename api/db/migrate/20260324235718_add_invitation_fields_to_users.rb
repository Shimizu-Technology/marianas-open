class AddInvitationFieldsToUsers < ActiveRecord::Migration[8.1]
  def change
    add_column :users, :invitation_status, :string, default: "accepted", null: false
    add_column :users, :clerk_invitation_id, :string
    add_column :users, :invited_by_id, :bigint
    add_column :users, :invited_at, :datetime

    add_index :users, :invitation_status
    add_index :users, :clerk_invitation_id, unique: true, where: "clerk_invitation_id IS NOT NULL"
    add_foreign_key :users, :users, column: :invited_by_id
  end
end
