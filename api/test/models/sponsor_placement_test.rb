require "test_helper"

class SponsorPlacementTest < ActiveSupport::TestCase
  setup do
    @org = Organization.create!(name: "Marianas", slug: "mo")
    @sponsor = @org.sponsors.create!(name: "Sponsor", tier: "official")
    @event = @org.events.create!(name: "Open", slug: "open", date: Date.current, status: "upcoming")
  end

  test "schedule includes both boundary days and excludes future and expired placements" do
    travel_to Time.zone.local(2027, 1, 30, 23, 59) do
      visible = @sponsor.sponsor_placements.create!(placement_type: "featured_bar", starts_on: Date.current, ends_on: Date.current)
      always = @sponsor.sponsor_placements.create!(placement_type: "official")
      @sponsor.sponsor_placements.create!(placement_type: "official", starts_on: Date.tomorrow)
      @sponsor.sponsor_placements.create!(placement_type: "official", ends_on: Date.yesterday)
      assert_equal [ visible.id, always.id ].sort, SponsorPlacement.active_on.ids.sort
    end
  end

  test "invalid date window and event scope fail validation" do
    p = @sponsor.sponsor_placements.build(placement_type: "official", starts_on: Date.tomorrow, ends_on: Date.current, event: @event)
    assert_not p.valid?
    assert p.errors[:ends_on].present?
    assert p.errors[:event].present?
    other = Organization.create!(name: "Other", slug: "other")
    p.assign_attributes(placement_type: "event", ends_on: nil, event: other.events.create!(name: "Other", slug: "other", date: Date.current))
    assert_not p.valid?
  end

  test "CTA and video URLs are allowlisted" do
    p = @sponsor.sponsor_placements.build(placement_type: "featured_bar")
    [ "javascript:alert(1)", "data:text/html,test", "//example.com", "https://user:pass@example.com" ].each do |url|
      p.cta_url = url
      assert_not p.valid?, url
    end
    p.cta_url = "https://example.com/offer"
    [ "https://youtu.be/dQw4w9WgXcQ", "https://vimeo.com/12345" ].each do |url|
      p.video_url = url
      assert p.valid?, p.errors.full_messages.join(", ")
    end
    [ "https://youtube.com.evil.test/watch?v=1", "http://youtube.com/watch?v=1", "https://example.com/video" ].each do |url|
      p.video_url = url
      assert_not p.valid?, url
    end
  end

  test "placement copy uses existing translation concern" do
    assert SponsorPlacement.include?(Translatable)
    assert_equal %w[headline blurb], SponsorPlacement.translatable_field_names
  end
end
