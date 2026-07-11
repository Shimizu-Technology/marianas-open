require "test_helper"
require "stringio"

class SeasonRolloverServiceTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @source_season = Season.create!(year: 2026, name: "2026 Marianas Open Circuit")
    @source_event = @organization.events.create!(name: "Marianas Pro 2026", slug: "marianas-pro-2026", season: @source_season)
    sponsor = @organization.sponsors.create!(name: "Island Sponsor")
    SponsorPlacement.create!(sponsor: sponsor, season: @source_season, event: @source_event, placement_type: "event_hero")
  end

  test "rolls events and event-scoped sponsor inventory into inactive drafts" do
    @source_event.hero_image.attach(io: StringIO.new("hero image"), filename: "hero.jpg", content_type: "image/jpeg")
    baseline_transactions = ActiveRecord::Base.connection.open_transactions
    upload_transaction_depths = []
    subscriber = ActiveSupport::Notifications.subscribe("service_upload.active_storage") do
      upload_transaction_depths << ActiveRecord::Base.connection.open_transactions
    end

    result = SeasonRolloverService.call(source_season: @source_season, target_year: 2027)
    placement = result[:season].sponsor_placements.first

    assert_equal [ baseline_transactions ], upload_transaction_depths,
      "attachment storage I/O must happen before the season transaction opens"
    assert_equal 2027, result[:season].year
    assert_equal [ "draft" ], result[:events].map(&:status).uniq
    assert_equal result[:events].first, placement.event
    assert_not placement.active
    assert_nil placement.starts_at
  ensure
    ActiveSupport::Notifications.unsubscribe(subscriber) if subscriber
  end

  test "refuses to merge rollover into an existing season" do
    Season.create!(year: 2027, name: "Existing 2027")

    error = assert_raises(ArgumentError) do
      SeasonRolloverService.call(source_season: @source_season, target_year: 2027)
    end
    assert_equal "The 2027 season already exists", error.message
  end

  test "purges prepared blobs when the database rollover fails" do
    @source_event.hero_image.attach(io: StringIO.new("hero image"), filename: "hero.jpg", content_type: "image/jpeg")
    @source_season.sponsor_placements.first.update_column(:cta_url, "javascript:alert(1)")
    original_blob_count = ActiveStorage::Blob.count

    assert_raises(ActiveRecord::RecordInvalid) do
      SeasonRolloverService.call(source_season: @source_season, target_year: 2027)
    end

    assert_equal original_blob_count, ActiveStorage::Blob.count
    assert_not Season.exists?(year: 2027)
  end
end
