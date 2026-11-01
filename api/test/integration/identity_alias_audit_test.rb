require "test_helper"

class IdentityAliasAuditTest < ActionDispatch::IntegrationTest
  self.use_transactional_tests = false

  setup do
    @original_logger = Rails.logger
    @log = StringIO.new
    Rails.logger = ActiveSupport::Logger.new(@log)
    @source = Competitor.create!(first_name: "Daniel", last_name: "Santos")
    @target = Competitor.create!(first_name: "Dan", last_name: "Santos")
    @third = Competitor.create!(first_name: "Daniel", last_name: "Santos", identity_separate: true)
    @ids = [ @source.id, @target.id, @third.id ]
  end

  teardown do
    Rails.logger = @original_logger
    Competitor.where(id: @ids).destroy_all
    @staff&.destroy!
  end

  test "merge audit records skipped aliases only after commit" do
    Competitor.transaction do
      Identity::CompetitorMerge.call(source: @source, target: @target, confirm: true, confirm_warnings: true)
      raise ActiveRecord::Rollback
    end
    assert_not_includes @log.string, '"action":"identity.competitor_merge"'
    assert Competitor.exists?(@source.id)
    merged = Identity::CompetitorMerge.call(source: @source.reload, target: @target.reload, confirm: true, confirm_warnings: true)
    audit = @log.string.lines.filter_map { |line| JSON.parse(line) rescue nil }.find { |item| item["action"] == "identity.competitor_merge" }
    assert audit
    assert_equal merged.skipped_aliases.as_json, audit["skipped_aliases"]
    assert_equal %w[danielsantos santosdaniel], audit["skipped_aliases"].map { |item| item["normalized_key"] }.sort
  end

  test "rename response and committed audit report skipped aliases" do
    @staff = User.create!(email: "alias-audit@example.com", clerk_id: "alias_audit", role: "staff")
    patch "/api/v1/admin/competitors/#{@source.id}", params: { first_name: "Danny" }, headers: { "Authorization" => "Bearer test_token_#{@staff.id}" }, as: :json
    assert_response :success
    skipped = response.parsed_body.fetch("skipped_aliases")
    audit = @log.string.lines.filter_map { |line| JSON.parse(line) rescue nil }.find { |item| item["action"] == "identity.competitor_update" }
    assert audit
    assert_equal skipped, audit["skipped_aliases"]
    assert_equal @staff.id, audit["actor_id"]
    assert_equal "Danny Santos", @source.reload.full_name
    assert_empty @source.competitor_aliases
  end
end
