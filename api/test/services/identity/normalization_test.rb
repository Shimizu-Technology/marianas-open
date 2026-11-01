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
end
