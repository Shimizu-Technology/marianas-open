require "test_helper"

class IdentityAttributionTest < ActionDispatch::IntegrationTest
  setup do
    organization = Organization.create!(name: "Marianas", slug: "marianas")
    @early = organization.events.create!(name: "Early", slug: "early", date: Date.new(2025, 1, 1), status: "completed", asjjf_stars: 3)
    @late = organization.events.create!(name: "Late", slug: "late", date: Date.new(2026, 1, 1), status: "completed", asjjf_stars: 4)
    @old_gym = Academy.create!(name: "Old Gym", country_code: "GU")
    @new_gym = Academy.create!(name: "New Gym", country_code: "JP")
    @competitor = Competitor.create!(first_name: "Braydon-Angel", last_name: "Santos")
    @early_result = @early.event_results.create!(competitor: @competitor, competitor_name: "Santos Braydon-angel", academy: @old_gym.name, placement: 1, division: "Adult Blue", country_code: "GUM")
    @late.event_results.create!(competitor: @competitor, competitor_name: "Santos Braydon-angel", academy: @new_gym.name, placement: 1, division: "Adult Blue", country_code: "GUM")
    @staff = User.create!(email: "staff@example.com", clerk_id: "staff_clerk", role: "staff")
    @headers = { "Authorization" => "Bearer test_token_#{@staff.id}" }
  end

  test "gym list and profile attribute only that gym's results for a transferred athlete" do
    get "/api/v1/academies"
    assert_response :success
    gyms = response.parsed_body["academies"].index_by { |gym| gym["id"] }
    assert_equal 45, gyms[@old_gym.id]["total_points"]
    assert_equal 60, gyms[@new_gym.id]["total_points"]
    get "/api/v1/academies/#{@old_gym.slug}"
    assert_response :success
    assert_equal 45, response.parsed_body["total_points"]
    assert_equal 45, response.parsed_body.dig("athletes", 0, "total_points")
    assert_equal @competitor.id, response.parsed_body.dig("athletes", 0, "id")
    get "/api/v1/admin/academies", headers: @headers
    assert_response :success
    assert_equal 45, response.parsed_body["academies"].find { |gym| gym["id"] == @old_gym.id }["total_points"]
  end

  test "pre-backfill legacy attribution remains readable without mutating existing results" do
    @early_result.update_columns(academy_id: nil)
    get "/api/v1/academies/#{@old_gym.slug}"
    assert_response :success
    assert_equal 45, response.parsed_body["total_points"]
    assert_equal 45, response.parsed_body.dig("athletes", 0, "total_points")
    get "/api/v1/academies"
    assert_response :success
    assert_equal 2, response.parsed_body["total"]
    assert_nil @early_result.reload.academy_id
  end

  test "public results, profiles, rankings, and search use First Last with hyphens" do
    get "/api/v1/events/#{@early.slug}/results"
    assert_response :success
    assert_equal "Braydon-Angel Santos", response.parsed_body.dig(0, "results", 0, "competitor_name")
    [ "Braydon-Angel Santos", "Santos Braydon-Angel", "Santos Braydon Angel" ].each do |name|
      get "/api/v1/competitors", params: { search: name }
      assert_response :success
      assert_equal 1, response.parsed_body["total"]
    end
    get "/api/v1/events/#{@early.slug}/results", params: { q: "Braydon-Angel Santos" }
    assert_response :success
    assert_equal 1, response.parsed_body.size
    get "/api/v1/rankings"
    assert_response :success
    assert_equal "Braydon-Angel Santos", response.parsed_body.dig("rankings", 0, "competitor_name")
  end

  test "gym rename keeps old name as alias and can set location parent and unaffiliated" do
    patch "/api/v1/admin/academies/#{@old_gym.id}", params: { name: "Renamed Gym", country_code: "GUM", location: "Guam", parent_id: @new_gym.id, unaffiliated: true }, headers: @headers, as: :json
    assert_response :success
    assert_equal "GU", @old_gym.reload.country_code
    assert_includes @old_gym.aliases, "Old Gym"
    assert_equal @old_gym, AcademyLinker.resolve("Old Gym")
    assert_equal @new_gym.id, @old_gym.parent_id
    assert @old_gym.unaffiliated
    get "/api/v1/rankings", params: { type: "team" }
    assert_equal "Renamed Gym", response.parsed_body["rankings"].find { |ranking| ranking["academy_id"] == @old_gym.id }["academy"]
  end

  test "review resolution links queued result and latest gym without creating a twin" do
    result = @late.event_results.create!(competitor: @competitor, competitor_name: "Santos Braydon-Angel", academy: "New Gymm", division: "Adult Blue", placement: 2)
    review = IdentityReview.find_by!(raw_name: "New Gymm")
    assert_nil result.academy_id
    get "/api/v1/admin/identity_reviews", headers: @headers
    assert_response :success
    assert_equal 1, response.parsed_body.dig("reviews", 0, "results_count")
    assert_no_difference "Academy.count" do
      post "/api/v1/admin/identity_reviews/#{review.id}/resolve", params: { academy_id: @new_gym.id, confirm: true }, headers: @headers, as: :json
    end
    assert_response :success
    assert_equal @new_gym.id, result.reload.academy_id
    assert_equal @new_gym.id, @competitor.reload.academy_id
    assert_equal "resolved", review.reload.status
  end

  test "viewers and unauthenticated callers cannot edit gyms or resolve identities" do
    patch "/api/v1/admin/academies/#{@old_gym.id}", params: { name: "Blocked" }, as: :json
    assert_response :unauthorized
    viewer = User.create!(email: "viewer@example.com", clerk_id: "viewer_clerk", role: "viewer")
    get "/api/v1/admin/identity_reviews", headers: { "Authorization" => "Bearer test_token_#{viewer.id}" }
    assert_response :forbidden
  end
  test "existing academy review resolution requires explicit confirmation" do
    AcademyLinker.resolve("New Gymm")
    review = IdentityReview.last
    post "/api/v1/admin/identity_reviews/#{review.id}/resolve", params: { academy_id: @new_gym.id }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "pending", review.reload.status
    assert_empty @new_gym.reload.aliases
  end

  test "staff gym preview includes legacy results and confirmed merge updates canonical links" do
    @early_result.update_columns(academy_id: nil)
    get "/api/v1/admin/academies/#{@old_gym.id}/merge_preview", params: { target_id: @new_gym.id }, headers: @headers
    assert_response :success
    assert_equal 1, response.parsed_body["results_count"]
    post "/api/v1/admin/academies/#{@old_gym.id}/merge", params: { target_id: @new_gym.id }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "/api/v1/admin/academies/#{@old_gym.id}/merge", params: { target_id: @new_gym.id, confirm: true }, headers: @headers, as: :json
    assert_response :success
    assert_not Academy.exists?(@old_gym.id)
    assert_equal @new_gym.id, @early_result.reload.academy_id
    assert_includes @new_gym.reload.aliases, "Old Gym"
  end

  test "staff athlete preview and merge enforce warnings and protected identities" do
    duplicate = Competitor.create!(first_name: "Braydon-Angel", last_name: "Santos")
    @early_result.update!(competitor: duplicate, gender: "female")
    @late.event_results.first.update!(gender: "male")
    get "/api/v1/admin/competitors/#{duplicate.id}/merge_preview", params: { target_id: @competitor.id }, headers: @headers
    assert_response :success
    assert response.parsed_body["warnings"].any? { |warning| warning.include?("genders") }
    payload = { target_id: @competitor.id, confirm: true, review_token: response.parsed_body["review_token"] }
    post "/api/v1/admin/competitors/#{duplicate.id}/merge", params: payload, headers: @headers, as: :json
    assert_response :unprocessable_entity
    duplicate.update!(identity_separate: true)
    post "/api/v1/admin/competitors/#{duplicate.id}/merge", params: payload.merge(confirm_warnings: true), headers: @headers, as: :json
    assert_response :unprocessable_entity
    duplicate.update!(identity_separate: false)
    post "/api/v1/admin/competitors/#{duplicate.id}/merge", params: payload.merge(confirm_warnings: true), headers: @headers, as: :json
    assert_response :success
    assert_not Competitor.exists?(duplicate.id)
    assert_equal @competitor.id, @early_result.reload.competitor_id
    assert_equal @new_gym.id, @competitor.reload.academy_id
  end
  test "renamed athlete resolves old ASJJF names through staff aliases" do
    patch "/api/v1/admin/competitors/#{@competitor.id}", params: { first_name: "Braydon" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Braydon", @competitor.reload.first_name
    [ "Santos Braydon-Angel", "Braydon-Angel Santos" ].each do |name|
      assert_equal @competitor, CompetitorLinker.find_or_create(name)
    end
    assert_equal @staff.id, CompetitorAlias.find_by!(normalized_key: "santosbraydonangel").created_by_id
  end

  test "rename and merge serialize canonical gym names across public profiles lists search rankings and results" do
    patch "/api/v1/admin/academies/#{@new_gym.id}", params: { name: "Canonical Gym" }, headers: @headers, as: :json
    assert_response :success
    assert_public_gym "Canonical Gym"
    assert_equal "New Gym", @competitor.reload[:academy]
    Identity::AcademyMerge.call(source: @new_gym, target: @old_gym, confirm: true)
    assert_public_gym "Old Gym"
  end

  test "results search finds canonical and raw academy names after a rename" do
    @old_gym.update!(name: "Historic Grappling")
    @early_result.update!(academy: "Historic Grappling")
    patch "/api/v1/admin/academies/#{@old_gym.id}", params: { name: "Canonical Combat" }, headers: @headers, as: :json
    assert_response :success
    [ "Canonical Combat", "Historic Grappling" ].each do |query|
      get "/api/v1/events/#{@early.slug}/results", params: { q: query }
      assert_response :success
      rows = response.parsed_body.flat_map { |division| division["results"] }
      assert_equal [ @early_result.id ], rows.map { |row| row["id"] }
      assert_equal "Canonical Combat", rows.first["academy"]
      get "/api/v1/academies", params: { search: query }
      assert_response :success
      assert_equal [ @old_gym.id ], response.parsed_body["academies"].map { |row| row["id"] }
    end
    get "/api/v1/events/#{@early.slug}/results", params: { q: "No Such Gym" }
    assert_response :success
    assert_empty response.parsed_body
    @early_result.update_columns(academy_id: nil)
    get "/api/v1/events/#{@early.slug}/results", params: { q: "Historic Grappling" }
    assert_response :success
    assert_equal @early_result.id, response.parsed_body.dig(0, "results", 0, "id")
    get "/api/v1/competitors", params: { search: @competitor.full_name }
    assert_response :success
    assert_equal [ @competitor.id ], response.parsed_body["competitors"].map { |row| row["id"] }
  end

  test "merge APIs accept profile choices and previews expose conflicts" do
    @new_gym.update!(description: "New description")
    @old_gym.update!(description: "Old description")
    get "/api/v1/admin/academies/#{@new_gym.id}/merge_preview", params: { target_id: @old_gym.id }, headers: @headers
    assert_response :success
    assert response.parsed_body["conflicts"].any? { |item| item["field"] == "description" }
    post "/api/v1/admin/academies/#{@new_gym.id}/merge", params: { target_id: @old_gym.id, confirm: true, keep: { description: "source" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "New description", @old_gym.reload.description
    duplicate = Competitor.create!(first_name: "Braydon", last_name: "Santos", bio: "Source bio")
    @competitor.update!(bio: "Target bio")
    get "/api/v1/admin/competitors/#{duplicate.id}/merge_preview", params: { target_id: @competitor.id }, headers: @headers
    token = response.parsed_body["review_token"]
    post "/api/v1/admin/competitors/#{duplicate.id}/merge", params: { target_id: @competitor.id, confirm: true, confirm_warnings: true, review_token: token, keep: { bio: "source" } }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Source bio", @competitor.reload.bio
  end

  test "country athlete headcounts deduplicate linked IDs across raw country codes and name orders" do
    @early_result.update_columns(country_code: "GUM", competitor_name: "Santos Braydon-Angel")
    @late.event_results.first.update_columns(country_code: "GU", competitor_name: "Braydon-Angel Santos")
    country = RankingCalculator.countries.find { |row| row[:country_code] == "GU" }
    assert_equal 1, country[:athletes]
    assert_equal 105, country[:total_points]
    assert_equal 2, country[:gold]
    @early_result.update_columns(competitor_id: nil)
    @late.event_results.first.update_columns(competitor_id: nil, competitor_name: "Santos Braydon Angel")
    assert_equal 1, RankingCalculator.countries.first[:athletes]
  end

  private

  def assert_public_gym(name)
    get "/api/v1/competitors/#{@competitor.id}"
    assert_response :success
    assert_equal name, response.parsed_body["academy"]
    [ {}, { search: "Santos Braydon-Angel" } ].each do |query|
      get "/api/v1/competitors", params: query
      assert_equal name, response.parsed_body["competitors"].find { |row| row["id"] == @competitor.id }["academy"]
    end
    get "/api/v1/rankings"
    assert_equal name, response.parsed_body["rankings"].find { |row| row["competitor_id"] == @competitor.id }["academy"]
    get "/api/v1/rankings/competitor", params: { name: "Santos Braydon-Angel" }
    assert_equal name, response.parsed_body["academy"]
    get "/api/v1/events/#{@late.slug}/results"
    result = response.parsed_body.dig(0, "results", 0)
    assert_equal name, result["academy"]
    assert_equal "New Gym", result["raw_academy"]
  end
end
