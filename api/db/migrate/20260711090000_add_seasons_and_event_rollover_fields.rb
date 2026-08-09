class AddSeasonsAndEventRolloverFields < ActiveRecord::Migration[8.1]
  class MigrationSeason < ActiveRecord::Base
    self.table_name = "seasons"
  end

  class MigrationEvent < ActiveRecord::Base
    self.table_name = "events"
  end

  def up
    create_table :seasons do |t|
      t.integer :year, null: false
      t.string :name, null: false
      t.string :status, null: false, default: "draft"
      t.boolean :current, null: false, default: false
      t.date :starts_on
      t.date :ends_on
      t.text :description
      t.timestamps
    end

    add_index :seasons, :year, unique: true
    add_index :seasons, :current, unique: true, where: "current = TRUE"

    add_reference :events, :season, foreign_key: true
    add_reference :events, :source_event, foreign_key: { to_table: :events }

    deduplicate_and_backfill_event_slugs!
    change_column_null :events, :slug, false
    add_index :events, :slug, unique: true

    change_column_default :events, :status, from: nil, to: "draft"
    MigrationEvent.where(status: nil).update_all(status: "draft")
    change_column_null :events, :status, false

    years = MigrationEvent.where.not(date: nil).distinct.pluck(Arel.sql("EXTRACT(YEAR FROM date)::integer")).sort
    years.each do |year|
      MigrationSeason.create!(
        year: year,
        name: "#{year} Marianas Open Circuit",
        status: year == years.max ? "active" : "archived",
        current: year == years.max,
        starts_on: Date.new(year, 1, 1),
        ends_on: Date.new(year, 12, 31)
      )
    end

    MigrationEvent.where.not(date: nil).find_each do |event|
      season = MigrationSeason.find_by!(year: event.date.year)
      event.update_columns(season_id: season.id)
    end

    ensure_one_main_event_per_season!

    add_index :events, :season_id,
              unique: true,
              where: "is_main_event = TRUE",
              name: "index_events_on_one_main_event_per_season"
  end

  def down
    remove_index :events, name: "index_events_on_one_main_event_per_season"
    change_column_null :events, :status, true
    change_column_default :events, :status, from: "draft", to: nil
    remove_index :events, :slug
    change_column_null :events, :slug, true
    remove_reference :events, :source_event, foreign_key: { to_table: :events }
    remove_reference :events, :season, foreign_key: true
    drop_table :seasons
  end

  private

  def deduplicate_and_backfill_event_slugs!
    used_slugs = {}

    MigrationEvent.order(:id).find_each do |event|
      base = event.slug.presence || event.name.to_s.parameterize.presence || "event"
      candidate = base
      suffix = 2

      while used_slugs[candidate]
        candidate = "#{base.first(240)}-#{suffix}"
        suffix += 1
      end

      event.update_columns(slug: candidate) if event.slug != candidate
      used_slugs[candidate] = true
    end
  end

  def ensure_one_main_event_per_season!
    duplicate_season_ids = MigrationEvent
      .where(is_main_event: true)
      .where.not(season_id: nil)
      .group(:season_id)
      .count
      .select { |_season_id, count| count > 1 }
      .keys
    return if duplicate_season_ids.empty?

    conflicts = duplicate_season_ids.to_h do |season_id|
      event_ids = MigrationEvent.where(season_id: season_id, is_main_event: true).order(:id).pluck(:id)
      [ season_id, event_ids ]
    end
    raise ActiveRecord::MigrationError,
          "Multiple main events must be resolved before migration (season_id => event_ids): #{conflicts.inspect}"
  end
end
