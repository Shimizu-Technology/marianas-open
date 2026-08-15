require "test_helper"
require "base64"
require "stringio"

class PublicEventsPerformanceTest < ActionDispatch::IntegrationTest
  PNG_BYTES = Base64.decode64(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
  ).freeze

  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @events = 12.times.map do |index|
      @organization.events.create!(
        name: "Public Event #{index}",
        slug: "public-event-#{index}",
        date: Date.current + index.days,
        status: "upcoming"
      )
    end

    @blob = ActiveStorage::Blob.create_and_upload!(
      io: StringIO.new(PNG_BYTES),
      filename: "event.png",
      content_type: "image/png"
    )
    @events.each { |event| event.hero_image.attach(@blob) }

    10.times do |index|
      gallery_image = @events.first.event_gallery_images.build(
        title: "Gallery image #{index}",
        sort_order: 10 - index,
        status: "ready",
        active: true
      )
      gallery_image.image.attach(@blob)
      gallery_image.save!
    end

    excluded_image = @events.first.event_gallery_images.build(
      title: "Still processing",
      sort_order: 0,
      status: "processing",
      active: true
    )
    excluded_image.image.attach(@blob)
    excluded_image.save!
  end

  test "index preserves the public response while bounding database queries" do
    query_count = count_database_queries { get "/api/v1/events" }

    assert_response :success
    assert_operator query_count, :<=, 16

    event = response.parsed_body.find { |item| item["id"] == @events.first.id }
    assert_equal 10, event["gallery_images_count"]
    assert_equal 8, event["event_gallery_images"].length
    assert_equal (1..8).to_a, event["event_gallery_images"].map { |image| image["sort_order"] }
    assert event.key?("hero_image_url")
    assert event["event_gallery_images"].all? { |image| image.key?("image_url") }
    assert event["event_gallery_images"].none? { |image| image.key?("preview_position") }
    assert event["event_gallery_images"].none? { |image| image.key?("public_gallery_images_count") }
  end

  test "show returns the same bounded gallery summary" do
    query_count = count_database_queries { get "/api/v1/events/#{@events.first.slug}" }

    assert_response :success
    assert_operator query_count, :<=, 16
    assert_equal 10, response.parsed_body["gallery_images_count"]
    assert_equal 8, response.parsed_body["event_gallery_images"].length
  end

  test "public reads do not write event lifecycle state" do
    past_event = @events.last
    past_event.update!(date: Date.yesterday, status: "upcoming")
    write_queries = []

    callback = lambda do |payload|
      write_queries << payload[:sql] if payload[:sql].match?(/\A\s*(?:UPDATE|INSERT|DELETE)/i)
    end
    collect_database_queries(callback) do
      get "/api/v1/events"
      get "/api/v1/events/#{past_event.slug}"
    end

    assert_response :success
    assert_empty write_queries
    assert_equal "upcoming", past_event.reload.status
  end

  test "sponsor and site image responses preload their attachments" do
    12.times do |index|
      sponsor = @organization.sponsors.create!(name: "Sponsor #{index}", sort_order: index)
      sponsor.logo.attach(@blob)

      site_image = SiteImage.create!(placement: "featured", title: "Feature #{index}", sort_order: index)
      site_image.image.attach(@blob)
    end

    sponsor_queries = count_database_queries { get "/api/v1/sponsors" }
    assert_response :success
    assert_operator sponsor_queries, :<=, 3
    assert_equal 12, response.parsed_body.length
    assert response.parsed_body.all? { |sponsor| sponsor.key?("logo_url") }

    site_image_queries = count_database_queries { get "/api/v1/site-images" }
    assert_response :success
    assert_operator site_image_queries, :<=, 3
    assert_equal 12, response.parsed_body.fetch("site_images").length
    assert response.parsed_body.fetch("site_images").all? { |image| image.key?("image_url") }
  end

  private

  def count_database_queries(&block)
    count = 0
    callback = ->(_payload) { count += 1 }
    collect_database_queries(callback, &block)
    count
  end

  def collect_database_queries(callback, &block)
    subscriber = lambda do |_name, _start, _finish, _id, payload|
      next if payload[:name].in?([ "SCHEMA", "CACHE" ])
      next if payload[:sql].match?(/\A\s*(?:BEGIN|COMMIT|ROLLBACK|SAVEPOINT|RELEASE)/i)

      callback.call(payload)
    end

    ActiveSupport::Notifications.subscribed(subscriber, "sql.active_record", &block)
  end
end
