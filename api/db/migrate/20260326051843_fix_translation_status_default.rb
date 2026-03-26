class FixTranslationStatusDefault < ActiveRecord::Migration[8.1]
  def up
    change_column_default :site_contents, :translation_status, "pending"

    execute <<~SQL
      UPDATE site_contents
      SET translation_status = 'pending'
      WHERE translation_status = 'translated'
        AND value_ja IS NULL
        AND value_ko IS NULL
        AND value_zh IS NULL
        AND value_tl IS NULL
        AND value_pt IS NULL
    SQL
  end

  def down
    change_column_default :site_contents, :translation_status, "translated"
  end
end
