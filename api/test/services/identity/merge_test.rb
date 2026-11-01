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

  test "competitor merge transfers blank fields stats and photo without purging the blob" do
    source = person(nickname: "Wave", bio: "Source bio", instagram_url: "https://example.com/kai", youtube_url: "https://example.com/video", wins: 8, losses: 2, draws: 1, gold_medals: 3)
    target = person
    source.photo.attach(io: StringIO.new("photo"), filename: "source.jpg", content_type: "image/jpeg")
    blob = source.photo.blob
    Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
    target.reload
    %w[nickname bio instagram_url youtube_url wins losses draws gold_medals].each do |field|
      assert_equal source[field], target[field], field
    end
    assert_equal blob.id, target.photo.blob.id
    assert ActiveStorage::Blob.exists?(blob.id)
    assert_empty ActiveStorage::Attachment.where(record_type: "Competitor", record_id: source.id)
    assert_equal target.id, CompetitorAlias.find_by!(normalized_key: "riverkailinwave").competitor_id
    assert_not CompetitorAlias.exists?(normalized_key: "waveriverkailin")
  end

  test "academy merge transfers descriptive fields and logo" do
    source = Academy.create!(name: "Source", location: "Guam", country_code: "GU", description: "Source description", website_url: "https://example.com", instagram_url: "https://example.com/ig", facebook_url: "https://example.com/fb")
    target = Academy.create!(name: "Target")
    source.logo.attach(io: StringIO.new("logo"), filename: "logo.png", content_type: "image/png")
    blob_id = source.logo.blob.id
    Identity::AcademyMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
    target.reload
    Identity::ProfileMerge::ACADEMY_FIELDS.reject { |field| field == "unaffiliated" }.each { |field| assert_equal source[field], target[field], field }
    assert_equal blob_id, target.logo.blob.id
  end

  test "conflict preview and explicit source choices preserve both attachment blobs and audit discarded values" do
    source = person(bio: "Source bio", wins: 9)
    target = person(bio: "Target bio", wins: 5)
    source.photo.attach(io: StringIO.new("source"), filename: "source.jpg", content_type: "image/jpeg")
    target.photo.attach(io: StringIO.new("target"), filename: "target.jpg", content_type: "image/jpeg")
    source_blob = source.photo.blob.id
    target_blob = target.photo.blob.id
    conflicts = Identity::CompetitorMerge.preview(source, target)[:conflicts].index_by { |item| item[:field] }
    assert_equal "Source bio", conflicts.fetch("bio")[:source]
    assert_equal target_blob, conflicts.fetch("photo")[:target][:blob_id]
    discarded = nil
    Competitor.transaction do
      discarded = Identity::ProfileMerge.apply(source, target, keep: { bio: "source", photo: "source" })
      target.save!
    end
    assert_equal "Source bio", target.reload.bio
    assert_equal 5, target.wins
    assert_equal source_blob, target.photo.blob.id
    assert_equal({ kept: "source", value: "Target bio" }, discarded["bio"])
    assert_equal({ kept: "target", value: 9 }, discarded["wins"])
    assert_equal target_blob, discarded["photo"][:value][:blob_id]
    assert ActiveStorage::Blob.exists?(source_blob)
    assert ActiveStorage::Blob.exists?(target_blob)
  end

  test "default choices keep target and invalid choices cause no writes" do
    source = person(bio: "Source bio")
    target = person(bio: "Target bio")
    assert_raises(ArgumentError) { Identity::CompetitorMerge.call(source: source, target: target, confirm: true, keep: { bio: "neither" }) }
    assert Competitor.exists?(source.id)
    assert_empty CompetitorAlias.all
    Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
    assert_equal "Target bio", target.reload.bio
  end

  test "attachment and alias moves roll back with a failed merge" do
    source = person(bio: "Source bio")
    target = person
    source.photo.attach(io: StringIO.new("photo"), filename: "photo.jpg", content_type: "image/jpeg")
    blob_id = source.photo.blob.id
    callback = -> { throw :abort if id == source.id }
    Competitor.set_callback(:destroy, :before, callback)
    begin
      assert_raises(ActiveRecord::RecordNotDestroyed) { Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true) }
    ensure
      Competitor.skip_callback(:destroy, :before, callback)
    end
    assert_equal blob_id, source.reload.photo.blob.id
    assert_not target.reload.photo.attached?
    assert_nil target.bio
    assert_empty CompetitorAlias.all
  end

  test "approved merge aliases survive ASJJF reimport in both name orders" do
    source = person(first_name: "Daniel", last_name: "Santos")
    target = person(first_name: "Dan", last_name: "Santos")
    medal(source, competitor_name: "Santos Daniel", raw_competitor_name: "SANTOS DANIEL")
    actor = User.create!(email: "alias@example.com", clerk_id: "alias-staff", role: "staff")
    Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true, actor: actor)
    %w[danielsantos santosdaniel].each do |key|
      record = CompetitorAlias.find_by!(normalized_key: key)
      assert_equal target.id, record.competitor_id
      assert_equal actor.id, record.created_by_id
      assert_equal "merge", record.source
    end
    [ "Santos Daniel", "Daniel Santos" ].each do |name|
      assert_no_difference "Competitor.count" do
        assert_equal target, CompetitorLinker.find_or_create(name)
      end
    end
  end

  test "existing approved aliases move to the survivor and conflicting approved identities are reported and skipped" do
    source = person(first_name: "Daniel", last_name: "Santos")
    target = person(first_name: "Dan", last_name: "Santos")
    prior = CompetitorAlias.create!(competitor: source, raw_name: "Santos Danny", source: "manual")
    Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
    assert_equal target.id, prior.reload.competitor_id
    duplicate = person(first_name: "Daniel", last_name: "Santos")
    other = person(first_name: "Different")
    preview = Identity::CompetitorMerge.preview(duplicate, other)
    merged = Identity::CompetitorMerge.call(source: duplicate, target: other, confirm: true, confirm_warnings: true)
    assert_not Competitor.exists?(duplicate.id)
    assert_equal preview[:skipped_aliases], merged.skipped_aliases
    assert_equal %w[danielsantos santosdaniel], merged.skipped_aliases.map { |item| item[:normalized_key] }.sort
    assert merged.skipped_aliases.all? { |item| item[:competitor_ids] == [ target.id ] }
    assert_empty other.competitor_aliases
    assert_equal target.id, CompetitorAlias.find_by!(normalized_key: "danielsantos").competitor_id
  end

  test "transferred aliases that collide with a third canonical athlete are skipped" do
    source = person(first_name: "Daniel", last_name: "Santos")
    target = person(first_name: "Dan", last_name: "Santos")
    prior = CompetitorAlias.create!(competitor: source, raw_name: "Santos Danny", source: "manual")
    third = person(first_name: "Danny", last_name: "Santos", identity_separate: true)
    merged = Identity::CompetitorMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
    assert_not CompetitorAlias.exists?(prior.id)
    skip = merged.skipped_aliases.find { |item| item[:normalized_key] == "santosdanny" }
    assert_equal [ third.id ], skip[:competitor_ids]
    assert_nil CompetitorLinker.find_or_create("Santos Danny")
    assert_equal target, CompetitorLinker.find_or_create("Santos Daniel")
  end

  test "legacy encoded academy twins merge in either direction with attachments" do
    [ true, false ].each_with_index do |keep_encoded, index|
      encoded = Academy.create!(name: "Temporary #{index}")
      encoded.update_columns(name: "A &amp; B #{index}", normalized_name: nil)
      decoded = Academy.create!(name: "Another #{index}")
      decoded.update_columns(name: "A & B #{index}", normalized_name: nil)
      source, target = keep_encoded ? [ decoded, encoded ] : [ encoded, decoded ]
      blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new("logo"), filename: "logo.png", content_type: "image/png")
      ActiveStorage::Attachment.create!(name: "logo", record: source, blob: blob)
      blob_id = blob.id
      result = medal(person, academy_id: source.id)
      Identity::AcademyMerge.call(source: source, target: target, confirm: true, confirm_warnings: true)
      assert_equal "A & B #{index}", target.reload.name
      assert_equal blob_id, target.logo.blob.id
      assert_equal target.id, result.reload.academy_id
      assert_not Academy.exists?(source.id)
    end
  end

  test "current gym follows latest history rather than a profile conflict choice" do
    old_gym = Academy.create!(name: "Earlier Gym")
    new_gym = Academy.create!(name: "Latest Gym")
    source = person(academy_id: old_gym.id, academy: old_gym.name)
    target = person(academy_id: new_gym.id, academy: new_gym.name)
    fields = Identity::CompetitorMerge.preview(source, target)[:conflicts].map { |item| item[:field] }
    assert_not_includes fields, "academy"
    assert_not_includes fields, "academy_id"
    earlier = @organization.events.create!(name: "Earlier", slug: "earlier", date: Date.new(2025, 1, 1))
    medal(source, event: earlier, academy_id: old_gym.id)
    medal(target, academy_id: new_gym.id)
    Identity::CompetitorMerge.call(source: source, target: target, confirm: true)
    assert_equal new_gym.id, target.reload.academy_id
    blank = person
    no_history = person(first_name: "Different", academy_id: old_gym.id, academy: old_gym.name)
    Identity::CompetitorMerge.call(source: no_history, target: blank, confirm: true, confirm_warnings: true)
    assert_equal old_gym.id, blank.reload.academy_id
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
