class AddPrizeTitleAndDescriptionToEvents < ActiveRecord::Migration[8.1]
  def change
    add_column :events, :prize_title, :string
    add_column :events, :prize_description, :text
  end
end
