class RenameProSeriesToGuamMarianasPro < ActiveRecord::Migration[8.1]
  RENAMES = {
    "Marianas Pro Nagoya 2026"    => "Guam Marianas Pro Nagoya 2026",
    "Marianas Pro Manila 2026"    => "Guam Marianas Pro Manila 2026",
    "Marianas Pro Taiwan 2026"    => "Guam Marianas Pro Taiwan 2026",
    "Marianas Pro Korea 2026"     => "Guam Marianas Pro Korea 2026",
    "Marianas Pro Hong Kong 2026" => "Guam Marianas Pro Hong Kong 2026",
  }.freeze

  def up
    RENAMES.each do |old_name, new_name|
      Event.where(name: old_name).update_all(name: new_name)
    end
  end

  def down
    RENAMES.each do |old_name, new_name|
      Event.where(name: new_name).update_all(name: old_name)
    end
  end
end
