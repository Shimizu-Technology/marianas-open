require "test_helper"

class IdentityEditBoundariesTest < ActionDispatch::IntegrationTest
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
    get "/api/v1/rankings"
    entries = response.parsed_body["rankings"]
    assert_equal [ first.id, second.id ].sort, entries.map { |row| row["result_id"] }.sort
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

  test "replacement import refreshes athletes omitted from the new results" do
    person = Competitor.create!(first_name: "Kai", last_name: "River")
    early = medal(@event, person)
    medal(@late, person)
    original = AsjjfScraper.method(:fetch_and_parse)
    AsjjfScraper.define_singleton_method(:fetch_and_parse) do |*|
      [ { competitor_name: "Example Newcomer", academy: "Replacement Gym", division: "Adult Blue", belt_rank: "blue", gender: "male", age_category: "adult", placement: 1, country_code: "GUM" } ]
    end
    AsjjfScraper.import!(event: @late, asjjf_event_ids: [ 123 ])
    assert_equal early.academy_id, person.reload.academy_id
    assert_equal 1, @late.event_results.count
  ensure
    if original
      AsjjfScraper.define_singleton_method(:fetch_and_parse, original)
      AsjjfScraper.singleton_class.send(:private, :fetch_and_parse)
    end
  end
end
