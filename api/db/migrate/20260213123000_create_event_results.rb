class CreateEventResults < ActiveRecord::Migration[8.0]
  def change
    create_table :event_results do |t|
      t.references :event, null: false, foreign_key: true
      t.string :division, null: false        # e.g., "Male Black Adult Open Weight"
      t.string :gender                       # male, female
      t.string :belt_rank                    # white, blue, purple, brown, black
      t.string :age_category                 # juvenile, adult, master_1, master_2, master_3
      t.string :weight_class                 # rooster, light_feather, feather, light, middle, medium_heavy, heavy, super_heavy, ultra_heavy, open_weight
      t.integer :placement, null: false      # 1, 2, 3
      t.string :competitor_name, null: false  # "Last First" format from ASJJF
      t.string :academy                      # gym/team name
      t.string :country_code                 # GUM, JPN, KOR, BRA, USA, PHL, etc.
      t.references :competitor, foreign_key: true, null: true  # optional link to Competitor model
      t.string :submission_method            # how they won (if available)
      t.text :notes                          # any additional notes

      t.timestamps
    end

    add_index :event_results, [:event_id, :division]
    add_index :event_results, [:event_id, :belt_rank]
    add_index :event_results, :competitor_name
  end
end
