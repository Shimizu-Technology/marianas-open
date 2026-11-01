require "test_helper"

class IdentityNormalizationTest < ActiveSupport::TestCase
  test "HTML, Unicode, punctuation and case share a comparison key" do
    normalizer = Identity::NameNormalizer
    names = [ "  O&#39;NEILL\u3000Jiu-Jitsu", "O’Neill\u00a0 Jiu Jitsu", "Ｏ’Ｎｅｉｌｌ Jiu　Jitsu" ]
    assert_equal 1, names.map { |name| normalizer.key(name) }.uniq.size
    assert_equal "Braydon-Angel De La Cruz", normalizer.person_display("braydon-angel de la cruz")
    assert_equal [ "Braydon-Angel", "Santos" ], normalizer.person_parts("Santos Braydon-angel")
    assert_equal [ "Jumar", "De La Peña" ], normalizer.person_parts("De La Peña Jumar")
    assert_equal [ "Warren", "Delos Reyes" ], normalizer.person_parts("Delos Reyes Warren")
    assert_equal [ "Brent", "San Nicolas" ], normalizer.person_parts("San Nicolas Brent")
    assert_equal [ "Evert", "Van Der Maas" ], normalizer.person_parts("Van Der Maas Evert")
    assert_equal "École <Team>", normalizer.display("&Eacute;cole <Team>")
  end

  test "all assigned ISO codes and ASJJF aliases normalize, unknowns stay unknown" do
    assert_equal 249, Identity::CountryCode::ISO.size
    Identity::CountryCode::ISO.each do |alpha3, alpha2|
      assert_equal alpha2, Identity::CountryCode.normalize(alpha3.downcase)
      assert_equal alpha2, Identity::CountryCode.normalize(alpha2)
    end
    { "GUM" => "GU", "MNP" => "MP", "TAI" => "TW", "TPE" => "TW", "HKG" => "HK", "MAC" => "MO", "KOS" => "XK", "PRI" => "PR", "CHE" => "CH" }.each do |code, expected|
      assert_equal expected, Identity::CountryCode.normalize(code)
    end
    [ nil, "", "ZZ", "ZZZ", "GUAM", "123" ].each { |code| assert_nil Identity::CountryCode.normalize(code) }
  end

  test "academy lookup and creation use one normalizer without inferring nationality" do
    academy = AcademyLinker.find_or_create("Pacific\u3000Jiu-Jitsu", "FRA")
    assert_nil academy.country_code
    assert_equal academy, AcademyLinker.resolve("pacific  jiu jitsu")
    assert_equal 1, Academy.count
    assert_not Academy.new(name: "PACIFIC JIU JITSU").valid?
    academy.update!(aliases: [ "Island&#39;s BJJ" ])
    assert_equal academy, AcademyLinker.resolve("Island’s BJJ")
  end

  test "near duplicates queue once; read only resolution never creates a record" do
    original = Academy.create!(name: "Example Jiu Jitsu")
    assert_no_difference [ "Academy.count", "IdentityReview.count" ] do
      assert_nil AcademyLinker.resolve("Example Jiu Jitsuu", create: false)
      assert_nil AcademyLinker.resolve("Brand New Academy", create: false)
    end
    assert_difference "IdentityReview.count", 1 do
      assert_nil AcademyLinker.resolve("Example Jiu Jitsuu")
      assert_nil AcademyLinker.resolve("Example Jiu Jitsuu")
    end
    assert_equal original, IdentityReview.last.candidate_academy
    assert_equal 1, Academy.count
  end

  test "legacy key collisions do not prevent metadata edits or choose arbitrary gyms" do
    first = Academy.create!(name: "Legacy Team")
    twin = Academy.create!(name: "Legacy Different")
    twin.update_columns(name: "Legacy  Team", normalized_name: nil)
    first.update!(location: "Guam")
    assert_nil AcademyLinker.resolve("Legacy Team")
    assert_not Academy.new(name: "Legacy-Team").valid?
  end

  test "parent academy cycle is rejected" do
    first = Academy.create!(name: "Parent Academy")
    second = Academy.create!(name: "Child Academy", parent: first)
    assert_not first.update(parent: second)
    assert first.errors[:parent].any?
  end
  test "new aliases cannot collide but unchanged legacy collisions can be edited" do
    first = Academy.create!(name: "First Academy")
    second = Academy.create!(name: "Second Academy")
    assert_not second.update(aliases: [ "First-Academy" ])
    assert second.errors[:aliases].any?
    second.update_columns(aliases: [ "First-Academy" ])
    assert second.reload.update(location: "Tokyo")
    assert first.persisted?
  end

  test "near duplicate matching includes historical aliases" do
    academy = Academy.create!(name: "Biba Jiu Jitsu", aliases: [ "Atos Jiu-jitsu Guam" ])
    assert_no_difference "Academy.count" do
      assert_nil AcademyLinker.resolve("Atos Jiu-jitsu Guamm")
    end
    assert_equal academy.id, IdentityReview.last.candidate_academy_id
  end
  test "legacy attribution and lookup honor resolved reviews without requiring an alias" do
    academy = Academy.create!(name: "Canonical Gym")
    IdentityReview.create!(raw_name: "Historic Review Label", normalized_name: Identity::NameNormalizer.key("Historic Review Label"),
      status: "resolved", resolved_academy: academy)
    assert_equal academy, AcademyLinker.resolve("Historic Review Label", create: false)
    assert_equal academy, Identity::AcademyAttribution.name_map[Identity::NameNormalizer.key("Historic Review Label")]
  end
  test "competitor alias creation rejects canonical and alias collisions but accepts a single owner" do
    owner = Competitor.create!(first_name: "Dan", last_name: "Santos")
    canonical = Competitor.create!(first_name: "Daniel", last_name: "Santos")
    [ "Daniel Santos", "Santos Daniel" ].each do |name|
      candidate = CompetitorAlias.new(competitor: owner, raw_name: name, source: "manual")
      assert_not candidate.valid?
      assert candidate.errors[:normalized_key].any?
    end
    approved = CompetitorAlias.create!(competitor: owner, raw_name: "Danny Santos", source: "manual")
    collision = CompetitorAlias.new(competitor: canonical, raw_name: "Danny-Santos", source: "rename")
    assert_not collision.valid?
    skipped = CompetitorAlias.record_names!(competitor: canonical, names: [ "Danny Santos" ], source: "rename")
    assert_equal [ owner.id ], skipped.fetch(0).fetch(:competitor_ids)
    assert_equal owner.id, approved.reload.competitor_id
    assert_no_difference "Competitor.count" do
      assert_equal owner, CompetitorLinker.find_or_create("Danny Santos")
    end
  end

  test "linker combines legacy aliases and canonical matches and honors protected alias owners" do
    owner = Competitor.create!(first_name: "Dan", last_name: "Santos")
    approved = CompetitorAlias.create!(competitor: owner, raw_name: "Daniel Santos", source: "manual")
    other = Competitor.create!(first_name: "Daniel", last_name: "Santos")
    [ false, true ].each do |separate|
      other.update!(identity_separate: separate)
      assert_equal [ owner.id, other.id ].sort, CompetitorLinker.candidates_for("Daniel Santos").map(&:id).sort
      assert_no_difference "Competitor.count" do
        assert_nil CompetitorLinker.find_or_create("Daniel Santos")
      end
    end
    other.destroy!
    assert_equal owner, CompetitorLinker.find_or_create(approved.raw_name)
    owner.update!(identity_separate: true)
    assert_nil CompetitorLinker.find_or_create(approved.raw_name)
  end
end
