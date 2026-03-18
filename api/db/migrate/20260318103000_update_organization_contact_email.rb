class UpdateOrganizationContactEmail < ActiveRecord::Migration[8.1]
  def up
    Organization.where(contact_email: "steveshimizu@outlook.com")
                .update_all(contact_email: "moguam@marianasopen.com")
  end

  def down
    Organization.where(contact_email: "moguam@marianasopen.com")
                .update_all(contact_email: "steveshimizu@outlook.com")
  end
end
