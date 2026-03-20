class AddDualRegistrationUrlsToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :registration_url_gi, :string
    add_column :events, :registration_url_nogi, :string
  end
end
