require "test_helper"

class AuditLogTest < ActiveSupport::TestCase
  test "records a stable change set without colliding with Active Record dirty tracking" do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    event = organization.events.create!(name: "Test Event", slug: "test-event")

    log = AuditLog.record!(
      actor: nil,
      action: "publish",
      auditable: event,
      changes: { status: [ "draft", "upcoming" ] }
    )

    assert_equal [ "draft", "upcoming" ], log.change_set["status"]
    assert_equal({ "status" => [ "draft", "upcoming" ] }, log.as_json["changes"])
  end

  test "uses a human-readable label supplied by the auditable record" do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    sponsor = organization.sponsors.create!(name: "Community Partner")
    placement = sponsor.sponsor_placements.create!(placement_type: "featured_bar")

    log = AuditLog.record!(actor: nil, action: "create", auditable: placement)

    assert_equal "Community Partner Featured bar", log.auditable_label
  end
end
