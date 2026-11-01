require "test_helper"

class OfficialRankingsApiTest < ActionDispatch::IntegrationTest
  setup do
    AsjjfRankingSeason.destroy_all
    @season = AsjjfRankingSeason.create!(season_year: 2026, gi_ranking_id: 227, team_ranking_id: 227, current: true)
    @season.sync_lists!
    @list = @season.asjjf_ranking_lists.find_by!(kind: "individual")
    @division = @list.asjjf_ranking_divisions.create!(asjjf_division_id: 20401, gender: "Male", age_group: "Adult 18", belt: "White", label: "Male White Adult 18", position: 0, status: "available")
    @competitor = Competitor.create!(first_name: "Alpet", last_name: "Jasper")
    @gym = Academy.create!(name: "Biba Jiu Jitsu")
    3.times do |index|
      @list.asjjf_ranking_entries.create!(asjjf_ranking_division: @division, position: index + 1, name: "Jasper Alpet",
        points: "176.25", raw_country_code: "FSM", country_code: "FM", competitor: @competitor, academy: @gym, academy_name: "Biba Jiu Jitsu")
    end
  end

  test "official list inventory replaces computed rankings and supports conditional public caching" do
    get "/api/v1/rankings/lists"
    assert_response :success
    assert_equal 2026, response.parsed_body["current_season"]
    assert_equal [ 2026 ], response.parsed_body["seasons"]
    assert_equal 3, response.parsed_body["lists"].size
    assert_includes response.headers["Cache-Control"], "public"
    assert_includes response.headers["Cache-Control"], "max-age=300"
    etag = response.headers["ETag"]
    get "/api/v1/rankings/lists", headers: { "If-None-Match" => etag }
    assert_response :not_modified
    get "/api/v1/rankings"
    assert_response :success
    assert_nil response.parsed_body["formula"]
    assert_nil response.parsed_body["rankings"]
  end

  test "division inventory groups gender age and belts and entries retain official facts with canonical display" do
    get "/api/v1/rankings/lists/#{@list.id}/divisions"
    assert_response :success
    assert_equal @division.id, response.parsed_body.dig("divisions", 0, "id")
    assert_equal "Male", response.parsed_body.dig("groups", 0, "gender")
    get "/api/v1/rankings/lists/#{@list.id}/entries", params: { division_id: @division.id, page: 2, per_page: 2 }
    assert_response :success
    assert_equal 3, response.parsed_body["total"]
    assert_equal 1, response.parsed_body["entries"].size
    entry = response.parsed_body["entries"].first
    assert_equal "Alpet Jasper", entry["display_name"]
    assert_equal "Jasper Alpet", entry["name"]
    assert_equal "176.25", entry["points"]
    assert_equal "biba-jiu-jitsu", entry["academy_slug"]
    get "/api/v1/rankings/lists/#{@list.id}/entries", params: { division_id: @division.id, per_page: 999999 }
    assert_operator response.parsed_body["per_page"], :<=, 100
    get "/api/v1/rankings/lists/#{@list.id}/entries"
    assert_response :not_found
    other = @season.asjjf_ranking_lists.find_by!(kind: "team", category: "adult")
    get "/api/v1/rankings/lists/#{other.id}/entries", params: { division_id: @division.id }
    assert_response :success
    assert_empty response.parsed_body["entries"]
  end

  test "team endpoint and official competitor standings are scoped to current confirmed season" do
    team = @season.asjjf_ranking_lists.find_by!(kind: "team", category: "adult")
    team.asjjf_ranking_entries.create!(position: 1, name: "Biba Jiu Jitsu", points: 5351, academy: @gym)
    get "/api/v1/rankings/lists/#{team.id}/entries"
    assert_response :success
    assert_equal "5351.0", response.parsed_body.dig("entries", 0, "points")
    get "/api/v1/rankings/standings", params: { competitor_id: @competitor.id }
    assert_response :success
    assert_equal 3, response.parsed_body["standings"].length
    assert_equal 2026, response.parsed_body["season_year"]
    @season.update!(current: false)
    get "/api/v1/rankings/standings", params: { competitor_id: @competitor.id }
    assert_empty response.parsed_body["standings"]
    get "/api/v1/rankings/standings", params: { competitor_id: 0 }
    assert_response :not_found
  end
end
