require "test_helper"
require Rails.root.join("db/migrate/20261102120000_add_2027_season_events")

class Add2027SeasonEventsTest < ActiveSupport::TestCase
  SLUGS = %w[
    copa-de-marianas-2027
    marianas-pro-tokyo-2027
    marianas-pro-manila-2027
    marianas-pro-taiwan-2027
  ].freeze

  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @migration = Add2027SeasonEvents.new
  end

  test "up publishes the four 2027 events ASJJF lists, with ASJJF registration pages" do
    @migration.up

    events = @organization.events.where(slug: SLUGS).index_by(&:slug)
    assert_equal SLUGS.sort, events.keys.sort
    assert events.values.all? { |event| event.status == "upcoming" }
    assert events.values.none?(&:is_main_event)

    copa = events.fetch("copa-de-marianas-2027")
    assert_equal Date.new(2027, 1, 30), copa.date
    assert_equal [ 2258, 2259 ], copa.asjjf_event_ids
    assert_equal "https://asjjf.org/main/eventInfo/2258", copa.registration_url_gi
    assert_equal "https://asjjf.org/main/eventInfo/2259", copa.registration_url_nogi
    assert_equal 3, copa.asjjf_stars
    assert_equal %w[Kids Adults], copa.registration_fee_sections.map { |section| section["title"] }

    tokyo = events.fetch("marianas-pro-tokyo-2027")
    assert_equal Date.new(2027, 2, 20), tokyo.date
    assert_equal 4, tokyo.asjjf_stars
    assert_includes tokyo.registration_info_items, { "label" => "Spectator admission", "value" => "Free" }
  end

  test "up leaves facts ASJJF has not published blank instead of inventing them" do
    @migration.up

    manila = @organization.events.find_by!(slug: "marianas-pro-manila-2027")
    taiwan = @organization.events.find_by!(slug: "marianas-pro-taiwan-2027")

    [ manila, taiwan ].each do |event|
      assert_nil event.asjjf_stars
      assert_nil event.tagline
      assert_nil event.description
      assert_nil event.prize_pool
      assert_empty event.registration_fee_sections
      assert_empty event.registration_info_items
      assert_equal "unavailable", event.ticket_sales_status
    end
    assert_equal Date.new(2027, 4, 25), manila.end_date
    assert_equal Date.new(2027, 5, 23), taiwan.end_date
  end

  test "up never overwrites an event an administrator already created" do
    existing = @organization.events.create!(
      name: "Copa 2027 (admin edited)",
      slug: "copa-de-marianas-2027",
      date: Date.new(2027, 1, 30),
      status: "draft",
      tagline: "Admin tagline"
    )

    @migration.up
    @migration.up

    assert_equal 1, @organization.events.where(slug: "copa-de-marianas-2027").count
    existing.reload
    assert_equal "Copa 2027 (admin edited)", existing.name
    assert_equal "draft", existing.status
    assert_equal "Admin tagline", existing.tagline
    assert_equal 4, @organization.events.where(slug: SLUGS).count
  end

  test "up does nothing when the organization is missing" do
    @organization.destroy!

    assert_nothing_raised { @migration.up }
    assert_equal 0, Event.where(slug: SLUGS).count
  end

  test "down is irreversible so published events are never deleted" do
    @migration.up

    assert_raises(ActiveRecord::IrreversibleMigration) { @migration.down }
    assert_equal 4, Event.where(slug: SLUGS).count
  end
end
