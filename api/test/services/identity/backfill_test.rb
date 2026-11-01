require "test_helper"

class IdentityBackfillTest < ActiveSupport::TestCase
  setup do
    @io = StringIO.new
    organization = Organization.create!(name: "Backfill fixtures", slug: "backfill-fixtures")
    @old_event = organization.events.create!(name: "Earlier", slug: "earlier", date: Date.new(2025, 1, 1))
    @new_event = organization.events.create!(name: "Later", slug: "later", date: Date.new(2026, 1, 1))
    @old_gym = Academy.create!(name: "Ocean Grappling", aliases: [ "Ocean Old" ])
    @new_gym = Academy.create!(name: "Mountain Jiu Jitsu")
    @person = Competitor.create!(first_name: "Kai", last_name: "River", academy_id: @old_gym.id, country_code: "FR")
    # IDs/import order deliberately disagree with event dates.
    @recent = result(@new_event, "Mountain Jiu Jitsu")
    @earlier = result(@old_event, "Ocean Old")
    @person.update_columns(academy_id: @old_gym.id)
    @unlinked = result(@old_event, "Unknown Valley Dojo", competitor: nil)
  end

  test "dry run is read only including unknown academy and review queue" do
    before = [ Academy.count, IdentityReview.count, EventResult.pluck(:academy_id), @person.reload.academy_id ]
    report = Identity::Backfill.call(io: @io)
    assert_equal before, [ Academy.count, IdentityReview.count, EventResult.pluck(:academy_id), @person.reload.academy_id ]
    assert_equal 3, report[:results_scanned]
    assert_equal 2, report[:result_links_changed]
    assert_equal 1, report[:current_gyms_changed]
    assert_equal({ "Unknown Valley Dojo" => 1 }, report[:unresolved])
  end

  test "apply resolves each own raw text and latest dated gym without nationality inference" do
    raw = EventResult.pluck(:id, :academy).to_h
    report = Identity::Backfill.call(apply: true, io: @io)
    assert_equal @old_gym.id, @earlier.reload.academy_id
    assert_equal @new_gym.id, @recent.reload.academy_id
    assert_equal @new_gym.id, @person.reload.academy_id
    assert_nil @unlinked.reload.result_academy.country_code
    assert_equal raw, EventResult.pluck(:id, :academy).to_h
    assert_empty report[:unresolved]
    repeated = Identity::Backfill.call(apply: true, io: @io)
    assert_equal 0, repeated[:result_links_changed]
    assert_equal 0, repeated[:current_gyms_changed]
  end

  test "unresolved latest gym clears stale current academy and undated rows do not outrank dated rows" do
    @recent.update_columns(academy: "Mountain Jiu Jitsuu", academy_id: @old_gym.id)
    undated = @old_event.organization.events.create!(name: "Undated", slug: "undated")
    result(undated, "Ocean Old")
    report = Identity::Backfill.call(apply: true, io: @io)
    assert_nil @recent.reload.academy_id
    assert_nil @person.reload.academy_id
    assert_equal 1, report[:undated_results]
    assert_equal 1, IdentityReview.where(status: "pending").count
    assert_equal 1, report[:unresolved]["Mountain Jiu Jitsuu"]
    Identity::Backfill.call(apply: true, io: @io)
    assert_equal 1, IdentityReview.where(status: "pending").count
  end

  test "backfill failure rolls all earlier links back" do
    original = EventResult.pluck(:academy_id)
    original_resolver = AcademyLinker.method(:resolve)
    resolver = ->(name, create:) do
      raise "Fixture failure" if name == "Unknown Valley Dojo"
      original_resolver.call(name, create: create)
    end
    AcademyLinker.define_singleton_method(:resolve, resolver)
    begin
      assert_raises(RuntimeError) { Identity::Backfill.call(apply: true, io: @io) }
    ensure
      AcademyLinker.define_singleton_method(:resolve, original_resolver)
    end
    assert_equal original, EventResult.pluck(:academy_id)
  end

  private

  def result(event, raw, **attributes)
    record = EventResult.new({ event: event, competitor: @person, competitor_name: "River Kai",
                               academy: raw, division: "Fixture", placement: 1 }.merge(attributes))
    id = EventResult.insert!(record.attributes.except("id", "created_at", "updated_at")).rows.first.first
    EventResult.find(id)
  end
end
