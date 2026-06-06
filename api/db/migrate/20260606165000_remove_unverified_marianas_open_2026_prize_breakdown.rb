class RemoveUnverifiedMarianasOpen2026PrizeBreakdown < ActiveRecord::Migration[8.1]
  EVENT_SLUG = "marianas-open-2026"
  UNVERIFIED_PRIZE_BREAKDOWN = [
    { name: "Black Belt Open Class (M)", amount: 10_000, sort_order: 1 },
    { name: "Black Belt Open Class (F)", amount: 10_000, sort_order: 2 },
    { name: "Black Belt Weight Divisions", amount: 15_000, sort_order: 3 },
    { name: "Brown Belt Weight Divisions", amount: 5_000, sort_order: 4 },
    { name: "Team Trophy", amount: 5_000, sort_order: 5 },
    { name: "Kids Grand Champion (per division)", amount: 500, sort_order: 6 }
  ].freeze

  def up
    execute <<~SQL.squish
      DELETE FROM prize_categories
      USING events
      WHERE prize_categories.event_id = events.id
        AND events.slug = #{quoted(EVENT_SLUG)}
        AND prize_categories.name IN (#{quoted_prize_names});
    SQL
  end

  def down
    UNVERIFIED_PRIZE_BREAKDOWN.each do |category|
      execute <<~SQL.squish
        INSERT INTO prize_categories
          (event_id, name, amount, sort_order, translation_status, translations, created_at, updated_at)
        SELECT events.id,
          #{quoted(category[:name])},
          #{category[:amount]},
          #{category[:sort_order]},
          'untranslated',
          '{}'::jsonb,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        FROM events
        WHERE events.slug = #{quoted(EVENT_SLUG)}
          AND NOT EXISTS (
            SELECT 1
            FROM prize_categories
            WHERE prize_categories.event_id = events.id
              AND prize_categories.name = #{quoted(category[:name])}
          );
      SQL
    end
  end

  private

  def quoted(value)
    connection.quote(value)
  end

  def quoted_prize_names
    UNVERIFIED_PRIZE_BREAKDOWN.map { |category| quoted(category[:name]) }.join(", ")
  end
end
