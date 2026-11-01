require "test_helper"
require_relative "../support/results_snapshot_fixtures"

class IdentityEditBoundariesTest < ActionDispatch::IntegrationTest
  include ResultsSnapshotFixtures
  setup do
    organization = Organization.create!(name: "Identity fixtures", slug: "identity-fixtures")
    @event = organization.events.create!(name: "Early", slug: "early", date: Date.new(2025, 1, 1), status: "completed", asjjf_stars: 3)
    @late = organization.events.create!(name: "Late", slug: "late", date: Date.new(2026, 1, 1), status: "completed", asjjf_stars: 4)
    @staff = User.create!(email: "identity-staff@example.com", clerk_id: "identity_staff", role: "staff")
    @headers = { "Authorization" => "Bearer test_token_#{@staff.id}" }
  end

  def medal(event, person = nil, **attrs)
    event.event_results.create!({ competitor: person, competitor_name: person ? "#{person.last_name} #{person.first_name}" : "Luces Don Franco Al..",
      academy: "Gym #{event.id}", division: "Adult Blue", belt_rank: "blue", gender: "male", age_category: "adult", placement: 1 }.merge(attrs))
  end

  test "admin placement round trip preserves raw source name for linked and unlinked athletes" do
    person = Competitor.create!(first_name: "Braydon-Angel", last_name: "Santos")
    [ medal(@event, person), medal(@event) ].each do |result|
      raw = result.competitor_name
      get "/api/v1/admin/events/#{@event.id}/results", headers: @headers
      record = response.parsed_body["results"].find { |row| row["id"] == result.id }
      assert_equal raw, record["competitor_name"]
      assert_not_equal raw, record["display_competitor_name"]
      patch "/api/v1/admin/events/#{@event.id}/results/#{result.id}", params: { event_result: record.merge("placement" => 2) }, headers: @headers, as: :json
      assert_response :success
      assert_equal raw, result.reload.raw_competitor_name
      assert_equal raw, result.competitor_name
    end
  end

  test "name lookup is exact and ambiguous people require stable IDs" do
    alex = Competitor.create!(first_name: "Alex", last_name: "Santos")
    alexander = Competitor.create!(first_name: "Alexander", last_name: "Santos")
    medal(@event, alex)
    medal(@late, alexander)
    get "/api/v1/rankings/competitor", params: { name: "Alex Santos" }
    assert_response :success
    assert_equal 45, response.parsed_body["total_points"]
    assert_equal "Alex Santos", response.parsed_body["competitor_name"]
    Competitor.create!(first_name: "Alex", last_name: "Santos", identity_separate: true)
    get "/api/v1/rankings/competitor", params: { name: "Santos Alex" }
    assert_response :conflict
    get "/api/v1/competitors/#{alex.id}"
    assert_response :success
    assert_equal 45, response.parsed_body["total_points"]
  end

  test "unlinked rankings retain a per-result profile identity" do
    first = medal(@event)
    second = medal(@late)
    entries = RankingCalculator.individual
    assert_equal [ first.id, second.id ].sort, entries.map { |row| row[:result_id] }.sort
    get "/api/v1/rankings/competitor", params: { result_id: first.id }
    assert_response :success
    assert_equal 45, response.parsed_body["total_points"]
    assert_equal 1, response.parsed_body["results"].size
    get "/api/v1/rankings/competitor", params: { name: first.display_competitor_name }
    assert_response :conflict
    @event.update!(status: "draft")
    get "/api/v1/rankings/competitor", params: { result_id: first.id }
    assert_response :not_found
  end

  test "merge rejects warnings or counts that changed since the operator preview" do
    source = Competitor.create!(first_name: "Kai-Lin", last_name: "River")
    target = Competitor.create!(first_name: "Kai Lin", last_name: "River")
    first = medal(@event, source)
    medal(@late, target)
    get "/api/v1/admin/competitors/#{source.id}/merge_preview", params: { target_id: target.id }, headers: @headers
    assert_response :success
    preview = response.parsed_body
    assert_empty preview["warnings"]
    first.update!(gender: "female")
    post "/api/v1/admin/competitors/#{source.id}/merge", params: { target_id: target.id, confirm: true, confirm_warnings: true, review_token: preview["review_token"] }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_match "preview changed", response.parsed_body["error"]
    assert Competitor.exists?(source.id)
    assert_equal source.id, first.reload.competitor_id
  end

  test "merge reports aliases that collide with a protected canonical athlete and preserves ambiguity" do
    source = Competitor.create!(first_name: "Daniel", last_name: "Santos")
    target = Competitor.create!(first_name: "Dan", last_name: "Santos")
    protected = Competitor.create!(first_name: "Daniel", last_name: "Santos", identity_separate: true)
    result = medal(@event, source)
    assert_nil CompetitorLinker.find_or_create("Santos Daniel")
    get "/api/v1/admin/competitors/#{source.id}/merge_preview", params: { target_id: target.id }, headers: @headers
    assert_response :success
    preview = response.parsed_body
    assert_equal %w[danielsantos santosdaniel], preview.fetch("skipped_aliases").map { |item| item["normalized_key"] }.sort
    assert preview["skipped_aliases"].all? { |item| item["competitor_ids"] == [ protected.id ] }
    post "/api/v1/admin/competitors/#{source.id}/merge", params: { target_id: target.id, confirm: true, confirm_warnings: true, review_token: preview["review_token"] }, headers: @headers, as: :json
    assert_response :success
    assert_equal preview["skipped_aliases"], response.parsed_body["skipped_aliases"]
    assert_empty CompetitorAlias.where(competitor_id: target.id)
    assert_equal target.id, result.reload.competitor_id
    [ "Santos Daniel", "Daniel Santos" ].each do |name|
      assert_no_difference "Competitor.count" do
        assert_nil CompetitorLinker.find_or_create(name)
      end
    end
    assert protected.reload.identity_separate?
  end

  test "rename skips aliases colliding with another canonical name in either order" do
    athlete = Competitor.create!(first_name: "Daniel", last_name: "Santos")
    other = Competitor.create!(first_name: "Santos", last_name: "Daniel")
    # Exercise the legacy canonical-name fallback, as before identity backfill.
    other.update_columns(normalized_name: nil, reverse_normalized_name: nil)
    patch "/api/v1/admin/competitors/#{athlete.id}", params: { first_name: "Dan" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Dan", athlete.reload.first_name
    skipped = response.parsed_body.fetch("skipped_aliases")
    assert_equal %w[danielsantos santosdaniel], skipped.map { |item| item["normalized_key"] }.sort
    assert skipped.all? { |item| item["competitor_ids"] == [ other.id ] }
    assert_empty athlete.competitor_aliases
    assert_equal other, CompetitorLinker.find_or_create("Santos Daniel")
  end

  test "merge preview expires when a new canonical alias collision appears" do
    source = Competitor.create!(first_name: "Daniel", last_name: "Santos")
    target = Competitor.create!(first_name: "Dan", last_name: "Santos")
    get "/api/v1/admin/competitors/#{source.id}/merge_preview", params: { target_id: target.id }, headers: @headers
    preview = response.parsed_body
    Competitor.create!(first_name: "Daniel", last_name: "Santos")
    post "/api/v1/admin/competitors/#{source.id}/merge", params: { target_id: target.id, confirm: true, confirm_warnings: true, review_token: preview["review_token"] }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_match "preview changed", response.parsed_body["error"]
    assert Competitor.exists?(source.id)
  end

  test "bulk result deletion refreshes former athletes current gyms" do
    person = Competitor.create!(first_name: "Kai", last_name: "River")
    early = medal(@event, person)
    medal(@late, person)
    delete "/api/v1/admin/events/#{@late.id}/results/destroy_all", headers: @headers
    assert_response :success
    assert_equal early.academy_id, person.reload.academy_id
    delete "/api/v1/admin/events/#{@event.id}/results/destroy_all", headers: @headers
    assert_response :success
    assert_nil person.reload.academy_id
  end

  test "snapshot sync refreshes athletes omitted from the new results" do
    person = Competitor.create!(first_name: "Kai", last_name: "River")
    early = medal(@event, person)
    medal(@late, person, source: "asjjf")
    complete_snapshots(@late)
    result = sync(@late)
    assert_equal "held", result.status
    @staff.update!(role: "admin")
    result = Asjjf::ResultsSync.new(@late).approve!(result, user: @staff)
    assert_equal "applied", result.status, result.error
    assert_equal early.academy_id, person.reload.academy_id
    assert_not @late.event_results.exists?(competitor_id: person.id)
  end
end
