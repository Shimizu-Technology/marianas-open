require "test_helper"
require_relative "../support/photo_intake_fixtures"

class PhotoIntakeAdminTest < ActionDispatch::IntegrationTest
  include PhotoIntakeFixtures

  setup do
    @event = Organization.create!(name: "Gallery", slug: "gallery").events.create!(name: "Gallery", slug: "gallery", status: "completed",
      date: Date.new(2027, 1, 30), end_date: Date.new(2027, 1, 31))
    @user = User.create!(email: "gallery@example.com", clerk_id: "gallery", role: "staff")
    @headers = { "Authorization" => "Bearer test_token_#{@user.id}" }
    @base = "/api/v1/admin/events/#{@event.id}"
  end

  test "authentication and role guard all new endpoints" do
    [ nil, "viewer" ].each do |role|
      @user.update!(role: role) if role
      headers = role ? @headers : {}
      %w[gallery-albums gallery-imports gallery-day-proposals].each do |path|
        get "#{@base}/#{path}", params: { album_type: "Podium" }, headers: headers
        assert_response(role ? :success : :unauthorized)
        post "#{@base}/#{path}", params: { name: "Test" }, headers: headers, as: :json
        assert_response(role ? :forbidden : :unauthorized)
      end
      patch "#{@base}/gallery-albums/settings", params: { hold_flagged: true }, headers: headers, as: :json
      assert_response(role ? :forbidden : :unauthorized)
      post "#{@base}/gallery-imports/prepare_direct_upload", headers: headers
      assert_response(role ? :forbidden : :unauthorized)
    end
  end

  test "album creation positional reorder rename collision and event scope are atomic" do
    image = attach_image(@event, category: "Original")
    %w[Second Third].each do |name|
      post "#{@base}/gallery-albums", params: { name: name }, headers: @headers, as: :json
      assert_response :created
      assert_equal 0, response.parsed_body["album"]["count"]
    end
    album = @event.event_gallery_albums.find_by!(name: "Third")
    patch "#{@base}/gallery-albums/#{album.id}", params: { sort_order: 0 }, headers: @headers, as: :json
    assert_response :success
    assert_equal %w[Third Original Second], @event.event_gallery_albums.sorted.pluck(:name)
    assert_equal [ 0, 1, 2 ], @event.event_gallery_albums.sorted.pluck(:sort_order)
    original = @event.event_gallery_albums.find_by!(name: "Original")
    patch "#{@base}/gallery-albums/#{original.id}", params: { name: "Renamed" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Renamed", image.reload.category
    patch "#{@base}/gallery-albums/#{original.id}", params: { name: "Second", sort_order: 0 }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "Renamed", image.reload.category
    patch "#{@base}/gallery-albums/#{original.id}", params: { name: "Nope", sort_order: -1 }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_equal "Renamed", original.reload.name
    other = @event.organization.events.create!(name: "Other", slug: "other")
    patch "/api/v1/admin/events/#{other.id}/gallery-albums/#{original.id}", params: { name: "Stolen" }, headers: @headers, as: :json
    assert_response :not_found
    get "#{@base}/gallery-albums", headers: @headers
    assert_equal({ "timezone" => "Pacific/Guam", "hold_flagged" => false }, response.parsed_body["settings"])
    assert_equal 1, response.parsed_body["albums"].find { |row| row["name"] == "Renamed" }["count"]
  end

  test "settings validate IANA zone and boolean without partial mutation" do
    patch "#{@base}/gallery-albums/settings", params: { timezone: "Asia/Tokyo", hold_flagged: true }, headers: @headers, as: :json
    assert_response :success
    assert_equal({ "timezone" => "Asia/Tokyo", "hold_flagged" => true }, response.parsed_body["settings"])
    patch "#{@base}/gallery-albums/settings", params: { timezone: "bad", hold_flagged: false }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert @event.reload.gallery_hold_flagged
    patch "#{@base}/gallery-albums/settings", params: { hold_flagged: "yes" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "signed archive binding input limits idempotent creation and terminal retry" do
    bytes = zip_bytes([ { name: "one.png", data: image_bytes } ])
    options = { filename: "photos.zip", byte_size: bytes.bytesize, checksum: Base64.strict_encode64(Digest::MD5.digest(bytes)) }
    post "#{@base}/gallery-imports/prepare_direct_upload", params: options, headers: @headers, as: :json
    assert_response :success
    token = response.parsed_body.fetch("signed_id")
    assert response.parsed_body.dig("direct_upload", "url")
    blob = ActiveStorage::Blob.find_signed!(token)
    blob.upload(StringIO.new(bytes))
    other = @event.organization.events.create!(name: "Other", slug: "other")
    post "/api/v1/admin/events/#{other.id}/gallery-imports", params: { signed_id: token, album_type: "Podium" }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    post "#{@base}/gallery-imports", params: { signed_id: token, album_type: "Opening Ceremony", timezone: "Pacific/Guam", hold_flagged: true }, headers: @headers, as: :json
    assert_response :accepted
    id = response.parsed_body["import"]["id"]
    post "#{@base}/gallery-imports", params: { signed_id: token, album_type: "Changed" }, headers: @headers, as: :json
    assert_response :success
    assert_equal id, response.parsed_body["import"]["id"]
    assert_equal "Opening Ceremony", response.parsed_body["import"]["album_type"]
    ImportEventGalleryArchiveJob.perform_now(id)
    post "#{@base}/gallery-imports", params: { signed_id: token, album_type: "Changed" }, headers: @headers, as: :json
    assert_response :success
    assert_equal "completed", response.parsed_body["import"]["status"]
    get "#{@base}/gallery-imports", headers: @headers
    assert_equal [ id ], response.parsed_body["imports"].pluck("id")
    [ { byte_size: 4.gigabytes + 1 }, { byte_size: 0 }, { checksum: "garbage" }, { filename: "fake.jpg" } ].each do |invalid|
      post "#{@base}/gallery-imports/prepare_direct_upload", params: options.merge(invalid), headers: @headers, as: :json
      assert_response :unprocessable_entity
    end
  end

  test "explicit blank ZIP destination stays Uncategorized while retaining the chosen type" do
    bytes = zip_bytes([ { name: "podium.png", data: image_bytes } ])
    blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new(bytes), filename: "photos.zip", content_type: "application/zip",
      metadata: { photo_intake: true, event_id: @event.id, prepared_by: @user.id })
    post "#{@base}/gallery-imports", params: { signed_id: blob.signed_id, album_type: "Podium", category: "" }, headers: @headers, as: :json
    assert_response :accepted
    import = EventGalleryImport.find(response.parsed_body["import"]["id"])
    assert_nil import.category
    ImportEventGalleryArchiveJob.perform_now(import.id)
    image = @event.event_gallery_images.sole
    assert_nil image.category
    assert_nil image.proposal_base_category
    assert_equal "Podium", image.album_type
    assert_equal "Podium Day 1", image.proposed_category
  end

  test "proposals use actual event day not distinct date ordering and reject stale forged and foreign IDs" do
    day2 = attach_image(@event, captured_at: Time.utc(2027, 1, 30, 14, 30), capture_timezone: "Pacific/Guam")
    outside = attach_image(@event, captured_at: Time.utc(2027, 1, 31, 14, 30), capture_timezone: "Pacific/Guam")
    missing = attach_image(@event)
    get "#{@base}/gallery-day-proposals", params: { album_type: "Opening Ceremony" }, headers: @headers
    assert_response :success
    proposal = response.parsed_body["proposals"].sole
    assert_equal "Opening Ceremony Day 2", proposal["category"]
    assert_equal [ day2.id ], proposal["image_ids"]
    assert_equal "2027-01-31", proposal["date"]
    assert_equal 2, response.parsed_body["unassigned_count"]
    [ { category: "Opening Ceremony Day 1", image_ids: [ day2.id ] }, { category: proposal["category"], image_ids: [ outside.id ] },
      { category: proposal["category"], image_ids: [ day2.id, day2.id ] } ].each do |invalid|
      post "#{@base}/gallery-day-proposals", params: { album_type: "Opening Ceremony", proposals: [ invalid ] }, headers: @headers, as: :json
      assert_response :unprocessable_entity
      assert_nil day2.reload.category
    end
    post "#{@base}/gallery-day-proposals", params: { album_type: "Opening Ceremony", proposals: [ proposal.except("date") ] }, headers: @headers, as: :json
    assert_response :success
    assert_equal 1, response.parsed_body["updated"]
    assert_equal "Opening Ceremony Day 2", day2.reload.category
    assert_nil outside.reload.category
    assert_nil missing.reload.category
    post "#{@base}/gallery-day-proposals", params: { album_type: "Opening Ceremony", proposals: [ proposal.except("date") ] }, headers: @headers, as: :json
    assert_response :unprocessable_entity
  end

  test "preview can choose a different type for direct photos in the current source album" do
    image = attach_image(@event, category: "Stage", captured_at: Time.utc(2027, 1, 30, 2), capture_timezone: "Pacific/Guam")
    get "#{@base}/gallery-day-proposals", params: { album_type: "Opening Ceremony", category: "Stage" }, headers: @headers
    assert_response :success
    proposal = response.parsed_body["proposals"].sole
    assert_equal "Opening Ceremony Day 1", proposal["category"]
    assert_equal [ image.id ], proposal["image_ids"]
    post "#{@base}/gallery-day-proposals", params: { album_type: "Opening Ceremony", category: "Stage", proposals: [ proposal.except("date") ] }, headers: @headers, as: :json
    assert_response :success
    assert_equal "Opening Ceremony Day 1", image.reload.category
  end

  test "filename literal search hidden review filters and approval preserve manual hides" do
    held = attach_image(@event, original_filename: "Camera_100%.png", active: false, review_held: true, review_flags: [ "dark" ])
    hidden = attach_image(@event, active: false, review_flags: [ "dark" ])
    get "#{@base}/gallery-images", params: { q: "100%", hidden: "1", needs_review: "1" }, headers: @headers
    assert_response :success
    assert_equal [ held.id ], response.parsed_body["gallery_images"].pluck("id")
    assert_equal "Camera_100%.png", response.parsed_body["gallery_images"].sole["original_filename"]
    assert response.parsed_body["gallery_images"].sole.key?("proposed_category")
    patch "#{@base}/gallery-images/bulk_update", params: { ids: [ held.id, hidden.id ], approve_review: true, category: "Reviewed" }, headers: @headers, as: :json
    assert_response :success
    assert_equal 2, response.parsed_body["updated"]
    assert held.reload.active?
    refute hidden.reload.active?
    assert held.reviewed_at
    assert hidden.reviewed_at
    assert_equal "Reviewed", hidden.category
    assert_includes hidden.review_flags, "dark"
    get "/api/v1/events/#{@event.slug}/gallery"
    assert_response :success
    refute held.as_json.key?("original_filename")
    refute held.as_json.key?("review_flags")
    delete "#{@base}/gallery-images/bulk_destroy", params: { ids: [ held.id, hidden.id ] }, headers: @headers, as: :json
    assert_response :success
    assert_equal 2, response.parsed_body["deleted"]
  end

  test "historical filename labels are sanitized only in public serialization" do
    image = attach_image(@event, original_filename: "arbitrary-camera-name.jpeg", title: "ArBiTrArY CaMeRa NaMe", caption: "arbitrary-camera-name", alt_text: "arbitrary-camera-name.jpeg", status: "ready")
    get "/api/v1/events/#{@event.slug}/gallery"
    assert_response :success
    public_image = response.parsed_body["gallery_images"].sole
    %w[title caption alt_text].each { |field| assert_nil public_image[field] }
    refute public_image.key?("original_filename")
    get "#{@base}/gallery-images", headers: @headers
    assert_equal "ArBiTrArY CaMeRa NaMe", response.parsed_body["gallery_images"].sole["title"]
    assert_equal "ArBiTrArY CaMeRa NaMe", image.reload.title
    image.update!(title: "Gold medal celebration", caption: "Winners on stage", alt_text: "Three athletes")
    get "/api/v1/events/#{@event.slug}/gallery"
    public_image = response.parsed_body["gallery_images"].sole
    assert_equal "Gold medal celebration", public_image["title"]
    assert_equal "Winners on stage", public_image["caption"]
    assert_equal "Three athletes", public_image["alt_text"]
    image.update_columns(original_filename: nil, title: "arbitrary camera name", caption: "arbitrary-camera-name", alt_text: "arbitrary-camera-name.jpeg")
    get "/api/v1/events/#{@event.slug}/gallery"
    %w[title caption alt_text].each { |field| assert_nil response.parsed_body["gallery_images"].sole[field] }
    assert_equal "arbitrary camera name", image.reload.title
  end

  test "direct image completion keeps explicit text and never invents filename labels" do
    [ {}, { title: "Final match", alt_text: "Two athletes" } ].each do |text|
      blob = ActiveStorage::Blob.create_and_upload!(io: StringIO.new(image_bytes), filename: "arbitrary-camera-121.jpg", content_type: "image/png")
      post "#{@base}/gallery-images/complete_direct_upload", params: { signed_id: blob.signed_id }.merge(text), headers: @headers, as: :json
      assert_response :created
      image = response.parsed_body["gallery_image"]
      if text.empty?
        assert_nil image["title"]
        assert_nil image["alt_text"]
      else
        assert_equal text[:title], image["title"]
        assert_equal text[:alt_text], image["alt_text"]
      end
      assert_nil image["caption"]
    end
  end
end
