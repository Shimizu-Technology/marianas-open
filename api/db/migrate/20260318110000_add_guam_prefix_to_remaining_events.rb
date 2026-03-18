class AddGuamPrefixToRemainingEvents < ActiveRecord::Migration[8.1]
  RENAMES = {
    "Copa de Marianas 2026" => "Guam Copa de Marianas 2026",
    "Marianas Open 2026"    => "Guam Marianas Open 2026",
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
