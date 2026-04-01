class AddSingletonGuardToImpactConfigurations < ActiveRecord::Migration[7.1]
  def change
    add_column :impact_configurations, :singleton_guard, :integer, default: 0, null: false
    add_index :impact_configurations, :singleton_guard, unique: true
  end
end
