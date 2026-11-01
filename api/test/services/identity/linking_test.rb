require "test_helper"

class IdentityLinkingTest < ActiveSupport::TestCase
  setup do
    organization = Organization.create!(name: "Marianas", slug: "marianas")
    @early = organization.events.create!(name: "Early", slug: "early", date: Date.new(2025, 1, 1), status: "completed", asjjf_stars: 3)
    @late = organization.events.create!(name: "Late", slug: "late", date: Date.new(2026, 1, 1), status: "completed", asjjf_stars: 4)
  end

  def result(event, **attrs)
    event.event_results.create!({ competitor_name: "Santos Braydon-angel", academy: "First Gym", division: "Adult Blue", belt_rank: "blue", age_category: "adult", gender: "male", placement: 1, country_code: "GUM" }.merge(attrs))
  end

  test "hyphen imports reuse athlete, preserve source, and display First Last" do
    first = result(@early)
    CompetitorLinker.link_event(@early)
    second = result(@late, competitor_name: "Santos\u3000Braydon-Angel")
    assert_no_difference "Competitor.count" do
      CompetitorLinker.link_event(@late)
    end
    assert_equal first.reload.competitor_id, second.reload.competitor_id
    assert_equal "Braydon-Angel Santos", second.as_json["competitor_name"]
    assert_equal "Santos　Braydon-Angel", second.raw_competitor_name
    assert_equal "GU", second.country_code
    assert_equal first.competitor, CompetitorLinker.find_or_create("Braydon Angel Santos")
    assert_equal "Braydon-Angel Santos", RankingCalculator.individual.first[:competitor_name]
  end

  test "result gym owns points and current gym follows event date rather than import order" do
    late = result(@late, academy: "Second Gym")
    CompetitorLinker.link_event(@late)
    AcademyLinker.link_event(@late)
    early = result(@early)
    CompetitorLinker.link_event(@early)
    AcademyLinker.link_event(@early)
    competitor = late.reload.competitor
    assert_equal "Second Gym", competitor.reload.team.name
    teams = RankingCalculator.teams.index_by { |ranking| ranking[:academy] }
    assert_equal 45, teams["First Gym"][:total_points]
    assert_equal 60, teams["Second Gym"][:total_points]
    assert_equal early.reload.academy_id, teams["First Gym"][:academy_id]
    assert_nil teams["First Gym"][:country_code]
    assert_equal 105, competitor.computed_stats[:total_points]
  end

  test "unresolved latest gym clears current gym and hidden events stay excluded from public rankings" do
    first = result(@early)
    CompetitorLinker.link_event(@early)
    AcademyLinker.link_event(@early)
    second = result(@late, academy: "First Gymm", competitor: first.reload.competitor)
    assert_nil second.academy_id
    assert_nil first.competitor.reload.academy_id
    @late.update!(status: "draft")
    assert_equal 45, RankingCalculator.teams.sum { |ranking| ranking[:total_points] }
  end

  test "legacy unresolved rows derive attribution read only from their own text" do
    first = result(@early)
    CompetitorLinker.link_event(@early)
    second = result(@late, academy: "Other Team")
    CompetitorLinker.link_event(@late)
    first.update_columns(academy_id: nil)
    first_id = Academy.find_by!(name: "First Gym").id
    assert_no_difference [ "Academy.count", "IdentityReview.count" ] do
      teams = RankingCalculator.teams.index_by { |ranking| ranking[:academy_id] }
      assert_equal 45, teams[first_id][:total_points]
    end
    assert_nil first.reload.academy_id
  end

  test "ambiguous, truncated and protected athletes are never automatically combined" do
    one = Competitor.create!(first_name: "Alex", last_name: "Example", identity_separate: true)
    assert_nil CompetitorLinker.find_or_create("Example Alex")
    one.update!(identity_separate: false)
    Competitor.create!(first_name: "Alex", last_name: "Example")
    assert_nil CompetitorLinker.find_or_create("Example Alex")
    assert_no_difference "Competitor.count" do
      assert_nil CompetitorLinker.find_or_create("Luces Don Franco Al..")
    end
  end

  test "same name with conflicting genders or age histories is left unlinked" do
    first = result(@early)
    CompetitorLinker.link_event(@early)
    second = result(@late, gender: "female")
    CompetitorLinker.link_event(@late)
    assert_nil second.reload.competitor_id
    third = result(@early, age_category: "kid_5")
    CompetitorLinker.link_event(@early)
    assert_nil third.reload.competitor_id
    assert first.reload.competitor_id
  end
  test "each row is checked for truncation even when a complete sample shares its key" do
    complete = result(@early, competitor_name: "Luces Don Franco Al")
    truncated = result(@early, competitor_name: "Luces Don Franco Al..")
    CompetitorLinker.link_event(@early)
    assert complete.reload.competitor_id
    assert_nil truncated.reload.competitor_id
    rankings = RankingCalculator.individual
    assert_equal 2, rankings.size
    another = result(@late, competitor_name: "Luces Don Franco Al..")
    assert_equal 3, RankingCalculator.individual.size
    assert_nil another.reload.competitor_id
  end

  test "refreshing older results resolves a latest legacy gym without writing its foreign key" do
    older = result(@early)
    CompetitorLinker.link_event(@early)
    latest = result(@late, academy: "Latest Legacy Gym", competitor: older.reload.competitor)
    latest.update_columns(academy_id: nil)
    older.update!(notes: "Updated")
    assert_equal Academy.find_by!(name: "Latest Legacy Gym").id, older.competitor.reload.academy_id
    assert_nil latest.reload.academy_id
  end

  test "reassigning and unlinking a result refreshes both athletes current gyms" do
    first = result(@early)
    CompetitorLinker.link_event(@early)
    source = first.reload.competitor
    latest = result(@late, academy: "Newest Gym", competitor: source)
    target = Competitor.create!(first_name: "Other", last_name: "Athlete")
    latest.update!(competitor: target)
    assert_equal first.academy_id, source.reload.academy_id
    assert_equal latest.academy_id, target.reload.academy_id
    latest.update!(competitor: nil)
    assert_nil target.reload.academy_id
  end
end
