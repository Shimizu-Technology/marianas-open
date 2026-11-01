require "test_helper"
require "tempfile"
require "csv"

class IdentityRepairTest < ActiveSupport::TestCase
  setup do
    @io = StringIO.new
    organization = Organization.create!(name: "Repair fixtures", slug: "repair-fixtures")
    @event = organization.events.create!(name: "Fixture Cup", slug: "fixture-cup", date: Date.new(2026, 1, 10), asjjf_stars: 3)
    names = [ "Harbor Grappling", "Harbor Grappling Club", "Island&#39;s Gym", "North Branch", "South Branch", "Mountain Academy", "Mountain Association" ]
    names.each_with_index { |name, i| Academy.create!(id: 71001 + i, name: name) }
    Academy.find(71003).update_columns(name: "Island&#39;s Gym")
    10.times do |i|
      person = Competitor.create!(id: 72001 + i, first_name: "Kai-Lin", last_name: "River", academy_id: i.zero? ? 71002 : 71001)
      EventResult.insert!({ event_id: @event.id, competitor_id: person.id, competitor_name: "River Kai-Lin", academy: "Original text", academy_id: person.academy_id,
                          division: "Fixture", placement: 1, belt_rank: "white", gender: i == 7 ? "female" : "male", age_category: "adult" })
    end
  end

  test "CSV dry run preserves every row and reports projected and per academy counts" do
    before = [ Academy.count, Competitor.count, EventResult.count, Academy.pluck(:name), EventResult.pluck(:academy_id) ]
    report = repair
    assert_equal before, [ Academy.count, Competitor.count, EventResult.count, Academy.pluck(:name), EventResult.pluck(:academy_id) ]
    assert_equal report[:before], report[:after]
    assert_equal 1, report[:before][:athletes] - report[:projected][:athletes]
    assert_equal 1, report[:before][:academies] - report[:projected][:academies]
    assert_equal 450, report[:before][:points]
    assert_equal 45, report[:before][:per_academy][71002][:points]
    assert_equal 450, report[:projected][:per_academy][71001][:points]
    assert report[:skipped].any? { |row| row[:reason].include?("requires review") }
    assert JSON.parse(@io.string).key?("projected")
  end

  test "CSV apply moves only admitted groups and repeat apply is idempotent" do
    report = repair(apply: true)
    assert_not Academy.exists?(71002)
    assert_not Competitor.exists?(72002)
    assert_equal "Island's Gym", Academy.find(71003).name
    assert_includes Academy.find(71003).aliases, "Island&#39;s Gym"
    assert_equal [ 71001 ], EventResult.distinct.pluck(:academy_id)
    assert_equal [ 71001 ], Competitor.distinct.pluck(:academy_id)
    assert_equal 10, EventResult.count
    assert_equal report[:projected], report[:after]
    [ 71004, 71005, 71006, 71007 ].each { |id| assert Academy.exists?(id) }
    [ 72003, 72004, 72005, 72006, 72007, 72008, 72009, 72010 ].each { |id| assert Competitor.exists?(id) }
    raw = EventResult.pluck(:academy, :competitor_name, :placement)
    repeated = repair(apply: true)
    assert_empty repeated[:operations]
    assert_equal repeated[:before], repeated[:after]
    assert_equal raw, EventResult.pluck(:academy, :competitor_name, :placement)
  end

  test "failure in athlete repair rolls back earlier academy merges and renames" do
    original = Identity::CompetitorMerge.method(:call)
    Identity::CompetitorMerge.define_singleton_method(:call) { |**| raise ArgumentError, "Simulated concurrent identity change" }
    begin
      assert_raises(ArgumentError) { repair(apply: true) }
    ensure
      Identity::CompetitorMerge.define_singleton_method(:call, original)
    end
    assert Academy.exists?(71002)
    assert Competitor.exists?(72002)
    assert_equal "Island&#39;s Gym", Academy.find(71003).name
    assert_equal 71002, Competitor.find(72001).academy_id
    assert_equal 71002, EventResult.find_by!(competitor_id: 72001).academy_id
  end

  test "explicit separate or uncertain CSV verdict overrides an overlapping same-person row" do
    with_athlete_rows([
      [ "DUPLICATE_RECORDS", "72001 72002", "River Kai-Lin", "SAME_PERSON", "high", "", "2", "" ],
      [ "DUPLICATE_RECORDS", "72002 72003", "River Kai-Lin", "KEEP_SEPARATE", "high", "", "2", "" ]
    ]) do |path|
      report = Identity::Repair.call(athletes: path, apply: true, io: @io)
      assert_empty report[:operations]
      assert Competitor.exists?(72002)
    end
  end

  test "hyphen cleanup requires exact names consistent histories and no separate or truncated flags" do
    # Restrict this case to a complete two-record cluster.
    Competitor.where.not(id: [ 72001, 72002 ]).update_all(identity_separate: true)
    report = Identity::Repair.hyphen_duplicates(io: @io)
    assert_empty report[:operations] # whole same-key group contains protected identities
    Competitor.where.not(id: [ 72001, 72002 ]).update_all(first_name: "Other")
    report = Identity::Repair.hyphen_duplicates(io: @io)
    assert_equal 1, report[:operations].size
    EventResult.find_by!(competitor_id: 72002).update!(competitor_name: "River Kai..")
    assert_empty Identity::Repair.hyphen_duplicates(apply: true, io: @io)[:operations]
    EventResult.find_by!(competitor_id: 72002).update!(competitor_name: "River Kai-Lin")
    Identity::Repair.hyphen_duplicates(apply: true, io: @io)
    assert_not Competitor.exists?(72002)
    assert_empty Identity::Repair.hyphen_duplicates(apply: true, io: @io)[:operations]
  end

  test "hyphen cleanup honors optional separate CSV exclusions" do
    Competitor.where.not(id: [ 72001, 72002 ]).update_all(first_name: "Other", identity_separate: true)
    with_athlete_rows([ [ "DUPLICATE_RECORDS", "72001 72002", "River Kai-Lin", "DIFFERENT_PEOPLE_LIKELY", "high", "", "2", "" ] ]) do |path|
      report = Identity::Repair.hyphen_duplicates(athletes: path, apply: true, io: @io)
      assert_empty report[:operations]
      assert Competitor.exists?(72002)
    end
  end

  test "bad CSV headers and malformed IDs fail before mutation" do
    Tempfile.create([ "identity-bad", ".csv" ]) do |file|
      file.write("verdict\nSAME_PERSON\n")
      file.flush
      assert_raises(ArgumentError) { Identity::Repair.call(athletes: file.path, apply: true, io: @io) }
    end
    with_athlete_rows([ [ "DUPLICATE_RECORDS", "72001,72002", "River Kai-Lin", "SAME_PERSON", "high", "", "2", "" ] ]) do |path|
      assert_raises(ArgumentError) { Identity::Repair.call(athletes: path, apply: true, io: @io) }
    end
    assert_equal 10, Competitor.count
  end

  test "rake repair defaults to preview and APPLY one applies the reviewed CSVs" do
    Rails.application.load_tasks unless Rake::Task.task_defined?("identity:repair")
    previous = ENV.to_h.slice("DECISIONS", "ATHLETES", "APPLY")
    ENV["DECISIONS"] = Rails.root.join("test/fixtures/files/identity/decisions.csv").to_s
    ENV["ATHLETES"] = Rails.root.join("test/fixtures/files/identity/athlete_duplicates.csv").to_s
    ENV.delete("APPLY")
    output, = capture_io { Rake::Task["identity:repair"].reenable; Rake::Task["identity:repair"].invoke }
    assert_equal false, JSON.parse(output)["apply"]
    assert Competitor.exists?(72002)
    ENV["APPLY"] = "1"
    output, = capture_io { Rake::Task["identity:repair"].reenable; Rake::Task["identity:repair"].invoke }
    assert_equal true, JSON.parse(output)["apply"]
    assert_not Competitor.exists?(72002)
  ensure
    %w[DECISIONS ATHLETES APPLY].each { |key| ENV.delete(key) }
    previous&.each { |key, value| ENV[key] = value }
  end


  test "stale CSV IDs whose names no longer match are skipped without writes" do
    Competitor.find(72002).update!(last_name: "Unrelated")
    Academy.find(71002).update!(name: "Unrelated Gym")
    report = repair(apply: true)
    assert Competitor.exists?(72002)
    assert Academy.exists?(71002)
    assert report[:skipped].any? { |row| row[:reason].include?("CSV names do not match current academies") }
    assert report[:skipped].any? { |row| row[:reason].include?("CSV names do not match current athletes") }
  end


  test "projection includes the surviving athletes gym change from the newest moved result" do
    with_athlete_rows([ [ "DUPLICATE_RECORDS", "72001 72002", "River Kai-Lin", "SAME_PERSON", "high", "", "2", "" ] ]) do |path|
      report = Identity::Repair.call(athletes: path, apply: true, io: @io)
      assert_equal report[:projected], report[:after]
      assert_equal 0, report[:after][:per_academy][71002][:athletes]
      assert_equal 9, report[:after][:per_academy][71001][:athletes]
      assert_equal 71001, Competitor.find(72001).academy_id
    end
  end


  test "projection and apply honor resolved review mappings even after a gym merge" do
    result = EventResult.find_by!(competitor_id: 72002)
    result.update_columns(academy_id: nil, academy: "Resolved Historic Label")
    IdentityReview.create!(raw_name: result.academy, normalized_name: Identity::NameNormalizer.key(result.academy),
      status: "resolved", resolved_academy_id: 71002)
    with_athlete_rows([ [ "DUPLICATE_RECORDS", "72001 72002", "River Kai-Lin", "SAME_PERSON", "high", "", "2", "" ] ]) do |path|
      report = Identity::Repair.call(athletes: path, apply: true, io: @io)
      assert_equal report[:projected], report[:after]
      assert_equal 71002, Competitor.find(72001).academy_id
    end
    report = Identity::Repair.call(decisions: Rails.root.join("test/fixtures/files/identity/decisions.csv"), apply: true, io: @io)
    assert_equal report[:projected], report[:after]
    assert_equal 71001, IdentityReview.last.reload.resolved_academy_id
    assert_equal 71001, result.reload.academy_id
  end

  test "CSV repair consolidates encoded twins transactionally keeping the encoded target" do
    Academy.find(71001).update_columns(name: "A &amp; B")
    Academy.find(71002).update_columns(name: "A & B")
    Tempfile.create([ "identity-twins", ".csv" ]) do |file|
      file.write(CSV.generate do |csv|
        csv << Identity::Repair::ACADEMY_HEADERS
        csv << [ "Twins", "71001 71002", "A &amp; B | A & B", "MERGE_SAME_GYM", "A & B", "GU", "Verified", "high", "2", "90" ]
      end)
      file.flush
      before = Academy.pluck(:id, :name)
      preview = Identity::Repair.call(decisions: file.path, io: @io)
      assert_equal before, Academy.pluck(:id, :name)
      applied = Identity::Repair.call(decisions: file.path, apply: true, io: @io)
      assert_equal preview[:projected], applied[:after]
      assert_equal "A & B", Academy.find(71001).name
      assert_not Academy.exists?(71002)
    end
  end

  private

  def repair(apply: false)
    Identity::Repair.call(decisions: Rails.root.join("test/fixtures/files/identity/decisions.csv"),
                          athletes: Rails.root.join("test/fixtures/files/identity/athlete_duplicates.csv"), apply: apply, io: @io)
  end

  def with_athlete_rows(rows)
    Tempfile.create([ "identity-athletes", ".csv" ]) do |file|
      file.write(CSV.generate { |csv| csv << Identity::Repair::ATHLETE_HEADERS; rows.each { |row| csv << row } })
      file.flush
      yield file.path
    end
  end
end
