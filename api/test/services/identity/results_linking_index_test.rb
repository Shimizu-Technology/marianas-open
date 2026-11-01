require "test_helper"

class ResultsLinkingIndexTest < ActiveSupport::TestCase
  test "batch legacy index preserves ambiguity aliases and rename behavior" do
    old = Competitor.create!(first_name: "Kai", last_name: "River")
    old.update_columns(normalized_name: nil, reverse_normalized_name: nil)
    duplicate = Competitor.create!(first_name: "Alex", last_name: "Santos")
    other = Competitor.create!(first_name: "Alex", last_name: "Santos")
    [ duplicate, other ].each { |person| person.update_columns(normalized_name: nil, reverse_normalized_name: nil) }
    CompetitorLinker.with_legacy_name_index do
      assert_equal old.id, CompetitorLinker.find_or_create("River Kai").id
      assert_nil CompetitorLinker.find_or_create("Santos Alex")
      old.update!(first_name: "Koa")
      # A stale cached historical name must not link to the renamed person.
      assert_not_equal old.id, CompetitorLinker.find_or_create("River Kai").id
      alias_record = old.competitor_aliases.create!(raw_name: "River Captain", source: "manual")
      assert_equal old.id, CompetitorLinker.find_or_create(alias_record.raw_name).id
      assert_nil CompetitorLinker.find_or_create("River Ka..")
    end
    assert_nil Thread.current[CompetitorLinker::LEGACY_INDEX_KEY]
  end

  test "batch index is released when an import raises" do
    assert_raises(RuntimeError) do
      CompetitorLinker.with_legacy_name_index { raise "Import failed" }
    end
    assert_nil Thread.current[CompetitorLinker::LEGACY_INDEX_KEY]
  end
end
