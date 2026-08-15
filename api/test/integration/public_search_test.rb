require "test_helper"

class PublicSearchTest < ActionDispatch::IntegrationTest
  setup do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    event = organization.events.create!(
      name: "Marianas Open 2026",
      slug: "marianas-open-2026",
      date: Date.current,
      status: "upcoming",
      asjjf_stars: 5
    )
    academy = Academy.create!(name: "Guam Academy", slug: "guam-academy", aliases: [ "GA" ])
    competitor = academy.competitors.create!(
      first_name: "Jordan",
      last_name: "Santos",
      belt_rank: "blue",
      country_code: "GU"
    )
    event.event_results.create!(
      competitor: competitor,
      competitor_name: "Jordan Santos",
      academy: academy.name,
      division: "Adult Blue",
      placement: 1
    )
  end

  test "global competitor search returns ranked results" do
    get "/api/v1/competitors", params: { search: "Jordan", per_page: 5 }

    assert_response :success
    assert_equal 1, response.parsed_body["total"]
    assert_equal "Jordan Santos", response.parsed_body.dig("competitors", 0, "full_name")
    assert_equal 75, response.parsed_body.dig("competitors", 0, "total_points")
  end

  test "global academy search works through joined public results" do
    get "/api/v1/academies", params: { search: "Guam", per_page: 5 }

    assert_response :success
    assert_equal 1, response.parsed_body["total"]
    assert_equal "Guam Academy", response.parsed_body.dig("academies", 0, "name")
    assert_equal 75, response.parsed_body.dig("academies", 0, "total_points")
  end
end
