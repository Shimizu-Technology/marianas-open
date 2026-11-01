require "test_helper"

class SponsorManagementTest < ActionDispatch::IntegrationTest
  setup do
    @org = Organization.create!(name: "Marianas Open", slug: "mo")
    @staff = User.create!(email: "staff@example.com", clerk_id: "staff", role: "staff")
    @viewer = User.create!(email: "viewer@example.com", clerk_id: "viewer", role: "viewer")
    @sponsor = @org.sponsors.create!(name: "Test sponsor", tier: "official")
    @event = @org.events.create!(name: "Open", slug: "open", date: Date.current, status: "upcoming")
    @headers = { "Authorization" => "Bearer test_token_#{@staff.id}" }
  end

  test "staff saves sponsor and placements atomically with named audit history" do
    assert_difference "SponsorAuditLog.count", 1 do
      patch "/api/v1/admin/sponsors/#{@sponsor.id}", headers: @headers, as: :json,
        params: { name: "Updated", sponsor_placements_attributes: [ { placement_type: "featured_bar", headline: "Welcome", sort_order: 1 } ] }
      assert_response :success
    end
    assert_equal "Updated", @sponsor.reload.name
    assert_equal "Welcome", @sponsor.sponsor_placements.first.headline
    audit = SponsorAuditLog.last
    assert_equal @staff.id, audit.actor_id
    assert_equal @staff.full_name, audit.actor_name
    assert audit.change_set["after"]["placements"].present?
    assert response.parsed_body["sponsor"]["audit_history"].present?
    assert_no_difference "SponsorAuditLog.count" do
      patch "/api/v1/admin/sponsors/#{@sponsor.id}", headers: @headers, as: :json,
        params: { name: "Must roll back", sponsor_placements_attributes: [ { placement_type: "official", cta_url: "javascript:alert(1)" } ] }
      assert_response :unprocessable_entity
    end
    assert_equal "Updated", @sponsor.reload.name
  end

  test "anonymous and viewer cannot change sponsors or upload logos" do
    [ nil, { "Authorization" => "Bearer test_token_#{@viewer.id}" } ].each do |headers|
      assert_no_difference [ "Sponsor.count", "SponsorAuditLog.count" ] do
        post "/api/v1/admin/sponsors", headers: headers, params: { name: "Denied" }, as: :json
        assert_response headers ? :forbidden : :unauthorized
        patch "/api/v1/admin/sponsors/#{@sponsor.id}", headers: headers, params: { name: "Denied" }, as: :json
        assert_response headers ? :forbidden : :unauthorized
        delete "/api/v1/admin/sponsors/#{@sponsor.id}", headers: headers
        assert_response headers ? :forbidden : :unauthorized
        post "/api/v1/admin/sponsors/#{@sponsor.id}/upload_logo", headers: headers
        assert_response headers ? :forbidden : :unauthorized
      end
    end
  end

  test "public lists honor date windows event scopes and order" do
    global = @sponsor.sponsor_placements.create!(placement_type: "event", sort_order: 2)
    scoped = @sponsor.sponsor_placements.create!(placement_type: "event", event: @event, sort_order: 1)
    @sponsor.sponsor_placements.create!(placement_type: "event", ends_on: Date.yesterday)
    other = @org.events.create!(name: "Other", slug: "other", date: Date.current)
    @sponsor.sponsor_placements.create!(placement_type: "event", event: other)
    home = @sponsor.sponsor_placements.create!(placement_type: "official")
    get "/api/v1/sponsor_placements", params: { event_id: @event.id }
    assert_response :success
    assert_equal [ scoped.id, global.id ], response.parsed_body["sponsor_placements"].map { |p| p["id"] }
    get "/api/v1/sponsor_placements"
    assert_equal [ home.id ], response.parsed_body["sponsor_placements"].map { |p| p["id"] }
  end

  test "deletion retains who when and what in audit history" do
    @sponsor.sponsor_placements.create!(placement_type: "official")
    assert_difference "SponsorAuditLog.count", 1 do
      delete "/api/v1/admin/sponsors/#{@sponsor.id}", headers: @headers
      assert_response :no_content
    end
    assert_nil Sponsor.find_by(id: @sponsor.id)
    assert_equal "Test sponsor", SponsorAuditLog.last.sponsor_name
    assert_nil SponsorAuditLog.last.sponsor_id
    assert_equal @staff.id, SponsorAuditLog.last.actor_id
  end
  test "dark logo uploads are validated and audited independently of the regular logo" do
    upload = Rack::Test::UploadedFile.new(Rails.root.join("test/fixtures/files/sponsor.png"), "image/png")
    assert_difference "SponsorAuditLog.count", 1 do
      post "/api/v1/admin/sponsors/#{@sponsor.id}/upload_logo", headers: @headers, params: { logo: upload, variant: "dark" }
      assert_response :success
    end
    assert @sponsor.reload.logo_dark.attached?
    assert_not @sponsor.logo.attached?
    assert_equal "uploaded_logo_dark", SponsorAuditLog.last.action
    unsafe = Rack::Test::UploadedFile.new(Rails.root.join("test/fixtures/files/sponsor.png"), "text/html")
    blob_id = @sponsor.logo_dark.blob.id
    assert_no_difference "SponsorAuditLog.count" do
      post "/api/v1/admin/sponsors/#{@sponsor.id}/upload_logo", headers: @headers, params: { logo: unsafe, variant: "dark" }
      assert_response :unprocessable_entity
    end
    assert_equal blob_id, @sponsor.reload.logo_dark.blob.id
  end

  test "deleting an event cleans scoped placements but preserves the sponsor and home placement" do
    @sponsor.sponsor_placements.create!(placement_type: "event", event: @event)
    home = @sponsor.sponsor_placements.create!(placement_type: "official")
    delete "/api/v1/admin/events/#{@event.id}", headers: @headers
    assert_response :no_content
    assert_nil Event.find_by(id: @event.id)
    assert @sponsor.reload
    assert_equal [ home.id ], @sponsor.sponsor_placements.ids
  end
end
