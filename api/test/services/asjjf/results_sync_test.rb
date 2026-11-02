require "test_helper"
require_relative "../../support/results_snapshot_fixtures"

class AsjjfResultsSyncTest < ActiveSupport::TestCase
  include ResultsSnapshotFixtures

  setup do
    @org = Organization.create!(name: "B3", slug: "b3")
    @event = @org.events.create!(name: "B3 event", slug: "b3", status: "completed", date: 1.day.ago)
    @admin = User.create!(clerk_id: "b3-admin", email: "b3@example.com", role: "admin")
  end

  test "real fixture counts assemble without double counting Male Adult" do
    complete_snapshots(@event, full: true)
    complete_snapshots(@event, id: 2063, discipline: "nogi", full: true)
    assembly = Asjjf::ResultsAssembler.new(@event).call
    assert assembly.complete?, assembly.missing.inspect
    assert_equal 544, assembly.rows.size
    assert_equal 444, assembly.rows.count { |row| row[:discipline] == "gi" }
    assert_equal 100, assembly.rows.count { |row| row[:discipline] == "nogi" }
    assert assembly.rows.any? { |row| row[:alone_in_bracket] }
    assert_empty assembly.guard_failures
  end

  test "incomplete set never applies and identifies exact missing category" do
    complete_snapshots(@event).last.destroy!
    result = sync(@event)
    assert_equal "incomplete", result.status
    assert result.diff_summary["missing"].any? { |message| message.include?("FEMALE KIDS") }
    assert_empty @event.event_results.reload
    assert_nil @event.reload.results_imported_at
  end

  test "snapshot arrivals refresh one incomplete run until the pages can apply" do
    pages = complete_snapshots(@event)
    missing = pages.pop.attributes.except("id", "created_at", "updated_at")
    AsjjfSnapshot.find_by!(url: missing["url"]).destroy!
    arriving = pages.pop
    arriving.update!(parse_status: "failed")
    first = sync(@event, trigger: "scheduled")
    assert_equal 2, first.diff_summary["missing"].size
    checked_at = first.updated_at
    travel 1.minute do
      arriving.update!(parse_status: "parsed", fetched_at: Time.current)
      assert_no_difference "ResultsSyncRun.count" do
        refreshed = sync(@event)
        assert_equal first.id, refreshed.id
        assert_equal 2, refreshed.diff_summary["evaluations"]
        assert_equal 1, refreshed.diff_summary["missing"].size
        assert_includes refreshed.diff_summary["snapshot_ids"], arriving.id
        assert refreshed.updated_at > checked_at
        assert_equal "scheduled", refreshed.trigger
      end
    end
    AsjjfSnapshot.create!(missing)
    assert_difference "ResultsSyncRun.count", 1 do
      applied = sync(@event)
      assert_equal "applied", applied.status
      assert_not_equal first.id, applied.id
      assert_equal "incomplete", first.reload.status
    end
  end

  test "changing expected sources or intervening outcomes starts another incomplete run" do
    @event.event_asjjf_sources.create!(asjjf_event_id: 2062, discipline: "gi", derived_from: "admin")
    first = sync(@event)
    @event.event_asjjf_sources.create!(asjjf_event_id: 2063, discipline: "nogi", derived_from: "admin")
    second = sync(@event)
    assert_not_equal first.id, second.id
    assert_equal 10, second.diff_summary["expected_pages"].size
    @event.results_sync_runs.create!(trigger: "snapshot", status: "failed", error: "fixture")
    assert_not_equal second.id, sync(@event).id
  end

  test "completion creates a held run and preserves its existing deduplication" do
    pages = complete_snapshots(@event)
    last = pages.last
    last.update!(parse_status: "failed")
    incomplete = sync(@event)
    last.update!(parse_status: "parsed")
    held = sync(@event, apply: false)
    assert_equal "held", held.status
    assert_not_equal incomplete.id, held.id
    assert_equal held.id, sync(@event, apply: false).id
    assert_equal 2, @event.results_sync_runs.count
  end

  test "new failed challenged or pending evidence prevents using stale successes" do
    latest = complete_snapshots(@event).last
    %w[error challenged].each do |outcome|
      attempt = save_page(id: 2062, type: "results_list", category: "Female Kids", summary: {}, outcome: outcome, parse_status: "skipped")
      assert_equal "incomplete", sync(@event).status
      attempt.destroy!
    end
    latest.update!(parse_status: "failed")
    assert_equal "incomplete", sync(@event).status
    latest.update!(parse_status: "parsed")
    request = AsjjfFetchRequest.enqueue!(url: latest.url, page_type: latest.page_type, reason: "new cycle")
    assert_equal "incomplete", sync(@event).status
    request.update!(status: "done")
    assert_equal "applied", sync(@event).status
  end

  test "first import applies source facts and idempotent run changes nothing" do
    complete_snapshots(@event)
    result = sync(@event)
    assert_equal "applied", result.status, result.error
    assert @event.reload.results_imported_at
    assert_equal "applied", @event.results_sync_status
    assert_equal 3, @event.event_results.distinct.count(:division)
    assert @event.event_results.all? { |row| row.division.start_with?("[GI]") && row.asjjf_event_id == 2062 && row.academy_id && row.competitor_id }
    ids = @event.event_results.order(:id).pluck(:id)
    result = sync(@event)
    assert_equal "no_changes", result.status, result.guard_failures.inspect
    assert_equal ids, @event.event_results.order(:id).pluck(:id)
    assert_equal ids.size, result.diff_summary["unchanged"]
    assert_equal 0, result.diff_summary["added"]
  end

  test "unknown source resolves from saved evidence without guessing" do
    complete_snapshots(@event)
    source = @event.event_asjjf_sources.first
    source.update!(discipline: "unknown")
    assert_equal "applied", sync(@event).status
    assert_equal "gi", source.reload.discipline
    @event.event_results.delete_all
    source.update!(discipline: "unknown")
    page = AsjjfSnapshot.find_by!(page_type: "event_results")
    page.update!(parsed_summary: page.parsed_summary.merge("discipline" => nil))
    result = sync(@event)
    assert_equal "held", result.status
    assert result.guard_failures.any? { |message| message.include?("unknown") }
    assert_not result.diff_summary["approvable"]
  end

  test "No-Gi relabel holds once and approval preserves row ids" do
    complete_snapshots(@event, id: 2063, discipline: "nogi")
    Asjjf::ResultsAssembler.new(@event).call.rows.each do |attrs|
      @event.event_results.create!(attrs.merge(discipline: "gi", division: attrs[:division].sub("[NOGI]", "[GI]"), asjjf_event_id: nil, division_key: nil))
    end
    ids = @event.event_results.order(:id).pluck(:id)
    result = sync(@event)
    assert_equal "held", result.status
    assert_equal 1, result.diff_summary["relabeled_divisions"]
    assert_includes result.diff_summary["messages"], "Corrects 1 divisions labeled Gi that are actually No-Gi"
    assert result.diff_summary["approvable"]
    assert_equal "[GI]", @event.event_results.order(:id).first.division.split.first
    Asjjf::ResultsSync.new(@event).approve!(result, user: @admin)
    assert_equal "applied", result.reload.status
    assert_equal @admin.id, result.approved_by_id
    assert_equal ids, @event.event_results.order(:id).pluck(:id)
    assert @event.event_results.all? { |row| row.division.start_with?("[NOGI]") && row.discipline == "nogi" }
    assert_equal "no_changes", sync(@event).status
  end

  test "manual rows and edited ASJJF identity keys survive unchanged" do
    complete_snapshots(@event)
    assert_equal "applied", sync(@event).status
    manual = @event.event_results.create!(division: "Manual custom division", competitor_name: "Staff Choice", placement: 1, notes: "Preserve")
    edited = @event.event_results.where(source: "asjjf").first
    edited.update!(manually_edited_at: Time.current, competitor_name: "Curated Name", notes: "Keep me")
    before = edited.attributes
    result = sync(@event)
    assert_equal "held", result.status
    assert_equal before, edited.reload.attributes
    assert_equal "Preserve", manual.reload.notes
    assert result.diff_summary["conflicts"].any? { |conflict| conflict["id"] == edited.id }
    assert_raises(Asjjf::ResultsSync::InvalidReview) { Asjjf::ResultsSync.new(@event).approve!(result, user: @admin) }
  end

  test "matching manual medal holds instead of adding a second gold" do
    complete_snapshots(@event)
    attrs = Asjjf::ResultsAssembler.new(@event).call.rows.first
    manual = @event.event_results.create!(attrs.except(:asjjf_event_id).merge(source: "manual"))
    result = sync(@event)
    assert_equal "held", result.status
    assert_equal [ manual.id ], @event.event_results.pluck(:id)
  end

  test "ambiguous competitor remains unlinked with a report" do
    complete_snapshots(@event)
    name = Asjjf::ResultsAssembler.new(@event).call.rows.first[:competitor_name]
    first, last = Identity::NameNormalizer.person_parts(name)
    2.times { Competitor.create!(first_name: first, last_name: last) }
    result = sync(@event)
    assert_equal "applied", result.status
    assert_nil @event.event_results.find_by!(competitor_name: name).competitor_id
    assert result.diff_summary["unlinked_competitors"].any? { |row| row["competitor_name"] == name }
    repeated = sync(@event)
    assert_equal "no_changes", repeated.status
    assert repeated.diff_summary["unlinked_competitors"].any? { |row| row["competitor_name"] == name }
  end

  test "changed metadata updates in place and absent ASJJF rows are removed" do
    complete_snapshots(@event)
    assert_equal "applied", sync(@event).status
    row = @event.event_results.first
    row.update_columns(academy: "Outdated Gym")
    omitted = @event.event_results.create!(source: "asjjf", asjjf_event_id: 2062, discipline: "gi", division: "[GI] Male Black Adult 18 Ultra Heavy", placement: 3, competitor_name: "Omitted Competitor")
    result = sync(@event)
    Asjjf::ResultsSync.new(@event).approve!(result, user: @admin) if result.status == "held"
    assert_equal "applied", result.reload.status
    assert EventResult.exists?(row.id)
    assert_not EventResult.exists?(omitted.id)
    assert_not_equal "Outdated Gym", row.reload.academy
    assert_equal 1, result.diff_summary["removed"]
  end

  test "duplicate medals missing fields and unparseable divisions block approval" do
    complete_snapshots(@event)
    page = AsjjfSnapshot.find_by!(url: "https://asjjf.org/main/resultsList/2062?gender=FEMALE&age=ADULT")
    original = page.parsed_summary.deep_dup
    %i[double_gold double_silver three_bronze missing_name missing_placement bad_division].each do |variant|
      summary = original.deep_dup
      division = summary["divisions"].first
      placements = division["placements"]
      case variant
      when :double_gold then placements << placements.first.merge("position" => 1, "name" => "Extra Gold")
      when :double_silver then 2.times { |i| placements << placements.first.merge("position" => 2, "name" => "Silver #{i}") }
      when :three_bronze then 3.times { |i| placements << placements.first.merge("position" => 3, "name" => "Bronze #{i}") }
      when :missing_name then placements.first["name"] = ""
      when :missing_placement then placements.first["position"] = nil
      when :bad_division then division["name"] = "Unknown division"
      end
      page.update!(parsed_summary: summary)
      result = sync(@event)
      assert_equal "held", result.status, "#{variant}: #{result.error}"
      assert_not result.diff_summary["approvable"], variant.to_s
      assert_empty @event.event_results
    end
  end

  test "large row count drop and zero source require review" do
    complete_snapshots(@event)
    assert_equal "applied", sync(@event).status
    AsjjfSnapshot.find_each { |page| page.update!(parsed_summary: page.parsed_summary.merge("divisions" => [])) }
    result = sync(@event)
    assert_equal "held", result.status
    assert result.guard_failures.any? { |message| message.include?("10%") }
    assert result.guard_failures.any? { |message| message.include?("zero results") }
    assert @event.event_results.exists?
  end

  test "stale approval rejects manual changes and discard prevents automatic apply" do
    complete_snapshots(@event)
    result = sync(@event, apply: false, trigger: "manual")
    @event.event_results.create!(division: "Manual", competitor_name: "Curator", placement: 1)
    assert_raises(Asjjf::ResultsSync::StaleReview) { Asjjf::ResultsSync.new(@event).approve!(result, user: @admin) }
    refreshed = sync(@event, apply: false, trigger: "manual")
    Asjjf::ResultsSync.new(@event).discard!(refreshed)
    assert refreshed.reload.discarded_at
    assert_equal refreshed.id, sync(@event).id
    assert_equal 1, @event.event_results.count
    assert_raises(Asjjf::ResultsSync::InvalidReview) { Asjjf::ResultsSync.new(@event).approve!(refreshed, user: @admin) }
  end

  test "reparsing the same snapshot invalidates review and repeated held preview" do
    complete_snapshots(@event)
    result = sync(@event, apply: false)
    page = AsjjfSnapshot.find_by!(url: "https://asjjf.org/main/resultsList/2062?gender=FEMALE&age=ADULT")
    summary = page.parsed_summary.deep_dup
    summary["divisions"].first["placements"].first["academy"] = "New source academy"
    page.update!(parsed_summary: summary)
    assert_raises(Asjjf::ResultsSync::StaleReview) { Asjjf::ResultsSync.new(@event).approve!(result, user: @admin) }
    assert_not_equal result.id, sync(@event, apply: false).id
    assert_empty @event.event_results
  end

  test "overlapping same-athlete Gi and No-Gi medals still classify relabels" do
    complete_snapshots(@event, id: 2062, discipline: "gi")
    # Use the same division/placements to reproduce the historical two-gold
    # collision when both disciplines awarded the same athlete a medal.
    @event.event_asjjf_sources.create!(asjjf_event_id: 2063, discipline: "nogi", derived_from: "admin")
    AsjjfSnapshot.where(asjjf_id: 2062).each do |page|
      summary = page.parsed_summary.deep_dup.merge("discipline" => "nogi", "event_id" => 2063)
      save_page(id: 2063, type: page.page_type, category: page.page_type == "results_list" ? summary["category"] : nil, summary: summary)
    end
    Asjjf::ResultsAssembler.new(@event).call.rows.each do |attrs|
      @event.event_results.create!(attrs.merge(discipline: "gi", division: attrs[:division].sub("[NOGI]", "[GI]"), asjjf_event_id: nil, division_key: nil))
    end
    result = sync(@event)
    assert_equal "held", result.status
    assert_equal 3, result.diff_summary["relabeled_divisions"]
    assert result.diff_summary["approvable"], result.guard_failures.inspect
    Asjjf::ResultsSync.new(@event).approve!(result, user: @admin)
    assert @event.event_results.group_by(&:division).values.all? { |rows| rows.count { |row| row.placement == 1 } == 1 }
  end

  test "uncertain historical provenance requires review before destructive adoption" do
    complete_snapshots(@event)
    # Historical imports and staff edits had no per-row provenance marker.
    Asjjf::ResultsAssembler.new(@event).call.rows.each { |attrs| @event.event_results.create!(attrs.merge(asjjf_event_id: nil)) }
    curated = @event.event_results.create!(source: "asjjf", division: "Staff custom", placement: 1, competitor_name: "Curated historic medal", notes: "Staff correction")
    result = sync(@event)
    assert_equal "held", result.status
    assert result.guard_failures.any? { |message| message.include?("provenance is uncertain") }
    assert EventResult.exists?(curated.id)
  end

  test "source configuration removal invalidates an already reviewed proposal" do
    @event.update!(asjjf_event_ids: [ 2062 ])
    complete_snapshots(@event)
    @event.event_asjjf_sources.first.update!(derived_from: "asjjf_event_ids")
    result = sync(@event, apply: false)
    @event.update!(asjjf_event_ids: [])
    assert_raises(Asjjf::ResultsSync::StaleReview) { Asjjf::ResultsSync.new(@event).approve!(result, user: @admin) }
    assert_empty Asjjf::FetchPlanner.new.plan_event_results(@event)
    assert_empty @event.event_asjjf_sources.reload
  end

  test "ambiguous mixed-provenance relabels block instead of delete and add" do
    complete_snapshots(@event, id: 2063, discipline: "nogi")
    rows = Asjjf::ResultsAssembler.new(@event).call.rows
    rows.each do |attrs|
      @event.event_results.create!(attrs.merge(discipline: "gi", division: attrs[:division].sub("[NOGI]", "[GI]"), asjjf_event_id: nil))
    end
    attrs = rows.first
    @event.event_results.create!(attrs.merge(discipline: "gi", division: attrs[:division].sub("[NOGI]", "[GI]")))
    ids = @event.event_results.order(:id).pluck(:id)
    result = sync(@event)
    assert_equal "held", result.status
    assert_not result.diff_summary["approvable"]
    assert result.guard_failures.any? { |message| message.include?("Ambiguous label repair") }
    assert_equal ids, @event.event_results.order(:id).pluck(:id)
  end

  test "discard remains effective through an intervening failed evaluation" do
    complete_snapshots(@event)
    reviewed = sync(@event, apply: false)
    Asjjf::ResultsSync.new(@event).discard!(reviewed)
    original = Asjjf::ResultsAssembler.instance_method(:call)
    Asjjf::ResultsAssembler.define_method(:call) { raise "Transient assembly failure" }
    assert_equal "failed", sync(@event).status
    Asjjf::ResultsAssembler.define_method(:call, original)
    assert_equal reviewed.id, sync(@event).id
    assert_empty @event.event_results
  ensure
    Asjjf::ResultsAssembler.define_method(:call, original) if original
  end

  test "partial apply failure restores removals and updates for automatic and approved runs" do
    complete_snapshots(@event, full: 3)
    assert_equal "applied", sync(@event).status
    @event.event_results.order(:id).limit(2).update_all(academy: "Historical academy")
    obsolete = @event.event_results.create!(source: "asjjf", asjjf_event_id: 2062, discipline: "gi", division: "[GI] Male Black Adult 18 Ultra Heavy", placement: 3, competitor_name: "Obsolete")
    before = @event.event_results.order(:id).map(&:attributes)
    original = CompetitorLinker.method(:find_or_create)
    calls = 0
    fail_after_save = lambda do |*args|
      calls += 1
      raise "Failure after a save" if calls == 2
      original.call(*args)
    end
    CompetitorLinker.define_singleton_method(:find_or_create, fail_after_save)
    assert_equal "failed", sync(@event).status
    assert_equal before, @event.event_results.reload.order(:id).map(&:attributes)
    CompetitorLinker.define_singleton_method(:find_or_create, original)
    reviewed = sync(@event, apply: false)
    calls = 0
    CompetitorLinker.define_singleton_method(:find_or_create, fail_after_save)
    assert_equal "failed", Asjjf::ResultsSync.new(@event).approve!(reviewed, user: @admin).status
    assert_equal before, @event.event_results.reload.order(:id).map(&:attributes)
    assert EventResult.exists?(obsolete.id)
  ensure
    CompetitorLinker.define_singleton_method(:find_or_create, original) if original
  end

  test "apply failure rolls back all writes and records failed run" do
    complete_snapshots(@event)
    original = CompetitorLinker.method(:find_or_create)
    CompetitorLinker.define_singleton_method(:find_or_create) { |*| raise "Simulated link failure" }
    result = sync(@event)
    assert_equal "failed", result.status
    assert_includes result.error, "Simulated link failure"
    assert_empty @event.event_results.reload
    assert_nil @event.reload.results_imported_at
  ensure
    CompetitorLinker.define_singleton_method(:find_or_create, original) if original
  end
end
