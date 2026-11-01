require "test_helper"

class IdentityMergeTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Identity fixtures", slug: "identity-fixtures")
    @event = @organization.events.create!(name: "Fixture Cup", slug: "fixture-cup", date: Date.new(2026, 1, 10))
  end

  test "academy merge moves links aliases children and reviews while keeping raw academy text" do
    source = Academy.create!(name: "Harbor Old", aliases: [ "Harbor Historic" ])
    target = Academy.create!(name: "Harbor New", aliases: [ "Harbor New Alias" ])
    child = Academy.create!(name: "Harbor Branch", parent_id: source.id)
    athlete = person(academy_id: source.id)
    result = medal(athlete, academy_id: source.id, academy: "Harbor Original Raw")
    review = IdentityReview.create!(raw_name: "Harbor Typo", normalized_name: "harbortypo", candidate_academy_id: source.id, status: "resolved", resolved_academy_id: source.id)
    preview = Identity::AcademyMerge.preview(source, target)
    assert_equal 1, preview[:results_count]
    assert_equal 1, preview[:athletes_count]
    assert_equal({ id: source.id, name: source.name }, preview[:source])
    assert_equal false, preview[:blocked]
    merged = Identity::AcademyMerge.call(source: source, target: target, confirm: true)
    assert_equal target.id, merged.id
    assert_not Academy.exists?(source.id)
    assert_equal target.id, athlete.reload.academy_id
    assert_equal target.id, result.reload.academy_id
    assert_equal "Harbor Original Raw", result.academy
    assert_equal target.id, child.reload.parent_id
    assert_equal target.id, review.reload.candidate_academy_id
    assert_equal target.id, review.resolved_academy_id
    assert_equal [ "Harbor New Alias", "Harbor Historic", "Harbor Old" ], merged.aliases
  end

  test "merging a parent into its child does not leave a self parent" do
    ancestor = Academy.create!(name: "Ancestor")
    source = Academy.create!(name: "Parent", parent_id: ancestor.id)
    target = Academy.create!(name: "Child", parent_id: source.id)
    Identity::AcademyMerge.call(source: source, target: target, confirm: true)
    assert_equal ancestor.id, target.reload.parent_id
  end

  test "invalid confirmation and self merges are rejected before writes" do
    source = Academy.create!(name: "Source")
    target = Academy.create!(name: "Target")
    [ false, nil, "true", 1 ].each do |confirm|
      assert_raises(ArgumentError) { Identity::AcademyMerge.call(source: source, target: target, confirm: confirm) }
    end
    assert_raises(ArgumentError) { Identity::AcademyMerge.preview(source, source) }
    assert_raises(ArgumentError) { Identity::CompetitorMerge.preview(person, Competitor.new) }
    assert Academy.exists?(source.id)
  end

  test "failed source deletion rolls back every academy reassignment" do
    source = Academy.create!(name: "Old Gym")
    target = Academy.create!(name: "New Gym")
    athlete = person(academy_id: source.id)
    result = medal(athlete, academy_id: source.id)
    callback = -> { throw :abort if name == "Old Gym" }
    Academy.set_callback(:destroy, :before, callback)
    begin
      assert_raises(ActiveRecord::RecordNotDestroyed) { Identity::AcademyMerge.call(source: source, target: target, confirm: true) }
    ensure
      Academy.skip_callback(:destroy, :before, callback)
    end
    assert_equal source.id, result.reload.academy_id
    assert_equal source.id, athlete.reload.academy_id
    assert_empty target.reload.aliases
  end

  test "competitor merge keeps all result details and target profile" do
    source = person(first_name: "Kai-Lin")
    target = person(first_name: "Kai Lin")
    moved = medal(source, academy: "Historical gym")
    medal(target)
    original = moved.attributes.except("competitor_id")
    assert_empty Identity::HistoryCheck.call(source, target)
    assert_equal target, Identity::CompetitorMerge.call(source: source, target: target, confirm: true)
    assert_equal original, moved.reload.attributes.except("competitor_id")
    assert_equal target.id, moved.competitor_id
    assert_not Competitor.exists?(source.id)
    assert_equal "Kai Lin", target.reload.first_name
  end

  test "history warnings require acknowledgement but separate identities can never be overridden" do
    source = person
    target = person
    medal(source, gender: "male")
    medal(target, gender: "female")
    assert_raises(ArgumentError) { Identity::CompetitorMerge.call(source: source, target: target, confirm: true) }
    assert Identity::CompetitorMerge.preview(source, target)[:warnings].any? { |warning| warning.include?("genders") }
    source.update!(identity_separate: true)
    assert Identity::CompetitorMerge.preview(source, target)[:blocked]
    assert_raises(ArgumentError) do
      Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
    end
    source.update!(identity_separate: false)
    assert_equal target, Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
  end

  test "history checks regressions kid adult same event and truncated names" do
    source = person
    target = person
    earlier = @organization.events.create!(name: "Earlier", slug: "earlier", date: Date.new(2025, 1, 1))
    medal(source, event: earlier, belt_rank: "purple", age_category: "adult")
    medal(target, belt_rank: "blue", age_category: "adult", competitor_name: "River Kai..")
    medal(source, age_category: "kid_5")
    warnings = Identity::HistoryCheck.call(source, target)
    assert warnings.any? { |warning| warning.include?("regression") }
    assert warnings.any? { |warning| warning.include?("Kid and adult") }
    assert warnings.any? { |warning| warning.include?("truncated") }
  end

  test "youth to adult white is allowed and same date belts do not imply regression" do
    source = person
    target = person
    earlier = @organization.events.create!(name: "Earlier", slug: "earlier", date: Date.new(2025, 1, 1))
    medal(source, event: earlier, belt_rank: "green", age_category: "kid_5")
    medal(target, belt_rank: "white", age_category: "adult")
    medal(target, belt_rank: "blue", age_category: "adult")
    assert_empty Identity::HistoryCheck.call(source, target)
  end

  test "equal profile names do not override missing or divergent raw histories" do
    source = person
    target = person
    medal(source, competitor_name: "River Different")
    warnings = Identity::HistoryCheck.call(source, target)
    assert warnings.any? { |warning| warning.include?("Missing result history") }
    assert warnings.any? { |warning| warning.include?("Result names differ") }
    assert_raises(ArgumentError) { Identity::CompetitorMerge.call(source: source, target: target, confirm: true) }
  end

  test "competitor source deletion failure rolls back result moves" do
    source = person
    target = person
    moved = medal(source)
    medal(target)
    callback = -> { throw :abort if id == source.id }
    Competitor.set_callback(:destroy, :before, callback)
    begin
      assert_raises(ActiveRecord::RecordNotDestroyed) { Identity::CompetitorMerge.call(source: source, target: target, confirm: true) }
    ensure
      Competitor.skip_callback(:destroy, :before, callback)
    end
    assert_equal source.id, moved.reload.competitor_id
    assert Competitor.exists?(source.id)
  end


  test "merging an ancestor into a deep descendant keeps the parent tree acyclic" do
    source = Academy.create!(name: "Ancestor gym")
    child = Academy.create!(name: "Intermediate gym", parent: source)
    target = Academy.create!(name: "Descendant gym", parent: child)
    Identity::AcademyMerge.call(source: source, target: target, confirm: true)
    assert_nil target.reload.parent_id
    assert_equal target.id, child.reload.parent_id
    assert target.valid?
    assert child.valid?
  end

  private

  def person(attributes = {})
    Competitor.create!({ first_name: "Kai-Lin", last_name: "River" }.merge(attributes))
  end

  def medal(athlete, attributes = {})
    record = EventResult.new({ event: @event, competitor: athlete, competitor_name: "River Kai-Lin",
                               academy: "Raw Harbor", division: "Fixture", placement: 1,
                               belt_rank: "white", age_category: "adult", gender: "male" }.merge(attributes))
    # Legacy fixtures bypass import callbacks; this suite tests repair services.
    id = EventResult.insert!(record.attributes.except("id", "created_at", "updated_at")).rows.first.first
    EventResult.find(id)
  end
end
