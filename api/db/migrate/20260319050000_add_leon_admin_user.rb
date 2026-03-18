class AddLeonAdminUser < ActiveRecord::Migration[8.1]
  def up
    User.find_or_create_by!(email: "shimizutechnology@gmail.com") do |u|
      u.clerk_id = "pending_admin_#{SecureRandom.uuid}"
      u.first_name = "Leon"
      u.last_name = "Shimizu"
      u.role = "admin"
    end
  end

  def down
    User.find_by(email: "shimizutechnology@gmail.com")&.destroy
  end
end
