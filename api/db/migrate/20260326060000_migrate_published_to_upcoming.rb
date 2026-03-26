class MigratePublishedToUpcoming < ActiveRecord::Migration[7.1]
  def up
    execute "UPDATE events SET status = 'upcoming' WHERE status = 'published'"
  end

  def down
    execute "UPDATE events SET status = 'published' WHERE status = 'upcoming'"
  end
end
