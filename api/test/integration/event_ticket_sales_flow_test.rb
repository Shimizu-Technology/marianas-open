require "test_helper"

class EventTicketSalesFlowTest < ActionDispatch::IntegrationTest
  setup do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    @event = organization.events.create!(
      name: "Guam Marianas Open 2026",
      slug: "marianas-open-2026",
      date: Date.new(2026, 10, 24),
      status: "upcoming"
    )
    User.create!(
      clerk_id: "clerk_admin",
      email: "admin@example.com",
      role: "admin",
      invitation_status: "accepted"
    )
    @headers = { "Authorization" => "Bearer test-token" }
  end

  test "staff can configure tickets and the public event exposes them" do
    payload = {
      ticket_sales_status: "on_sale",
      ticket_sales_url: "https://events.guamtime.net/event/guam-marianas-open-international-championship-2026",
      ticket_options: [
        {
          label: "2-Day Adult",
          description: "",
          early_bird_price: "35.00",
          regular_price: "45.00"
        }
      ],
      ticket_in_person_name: "Deal Depot",
      ticket_in_person_phone: "671-647-3325",
      ticket_in_person_address: "114 East Taitano Road, Tamuning, Guam"
    }

    with_verified_clerk do
      patch "/api/v1/admin/events/#{@event.id}", params: payload, headers: @headers, as: :json
    end

    assert_response :success
    assert_equal "on_sale", response.parsed_body.dig("event", "ticket_sales_status")

    get "/api/v1/events/#{@event.slug}"

    assert_response :success
    assert_equal payload[:ticket_sales_url], response.parsed_body["ticket_sales_url"]
    assert_equal "2-Day Adult", response.parsed_body.dig("ticket_options", 0, "label")
    assert_equal "Deal Depot", response.parsed_body["ticket_in_person_name"]
  end

  test "admin update rejects an unsafe ticket URL" do
    with_verified_clerk do
      patch "/api/v1/admin/events/#{@event.id}",
        params: { ticket_sales_status: "on_sale", ticket_sales_url: "javascript:alert(1)" },
        headers: @headers,
        as: :json
    end

    assert_response :unprocessable_entity
    assert response.parsed_body["errors"].any? { |message| message.include?("Ticket sales url must use http or https") }
  end

  test "cloning preserves reusable admission setup but keeps the new event safely unpublished" do
    @event.update!(
      is_main_event: true,
      registration_url_gi: "https://asjjf.org/main/eventInfo/2062",
      registration_url_nogi: "https://asjjf.org/main/eventInfo/2063",
      live_stream_active: true,
      live_stream_url: "https://youtube.com/@themarianasopen/live",
      ticket_sales_status: "on_sale",
      ticket_sales_url: "https://tickets.example.com/events/2026",
      ticket_early_bird_ends_on: Date.new(2026, 9, 1),
      ticket_options: [
        {
          label: "2-Day Adult",
          description: "General admission",
          early_bird_price: "35.00",
          regular_price: "45.00"
        }
      ],
      ticket_in_person_name: "Deal Depot",
      ticket_in_person_phone: "671-647-3325",
      ticket_in_person_address: "114 East Taitano Road, Tamuning, Guam"
    )
    @event.event_schedule_items.create!(time: "9:00 AM", description: "Opening matches", sort_order: 1)
    @event.prize_categories.create!(name: "Black Belt Absolute", amount: 5_000, sort_order: 1)
    @event.event_accommodations.create!(
      hotel_name: "Partner Hotel",
      description: "Tournament rate",
      contact_phone: "671-555-0100",
      check_in_date: Date.new(2026, 10, 23),
      check_out_date: Date.new(2026, 10, 26),
      booking_code: "OPEN2026",
      booking_url: "https://hotel.example.com/open-2026"
    )

    with_verified_clerk do
      post "/api/v1/admin/events/#{@event.id}/clone", headers: @headers, as: :json
    end

    assert_response :created
    clone = Event.find(response.parsed_body.dig("event", "id"))
    assert_equal "draft", clone.status
    assert_nil clone.date
    assert_nil clone.end_date
    assert_not clone.is_main_event?
    assert_nil clone.registration_url
    assert_nil clone.registration_url_gi
    assert_nil clone.registration_url_nogi
    assert_not clone.live_stream_active?
    assert_equal "https://youtube.com/@themarianasopen/live", clone.live_stream_url
    assert_equal "unavailable", clone.ticket_sales_status
    assert_nil clone.ticket_sales_url
    assert_nil clone.ticket_early_bird_ends_on
    assert_equal @event.ticket_options, clone.ticket_options
    assert_equal "Deal Depot", clone.ticket_in_person_name
    assert_equal "671-647-3325", clone.ticket_in_person_phone
    assert_equal "114 East Taitano Road, Tamuning, Guam", clone.ticket_in_person_address
    assert_not clone.ticket_banner_image.attached?
    assert_equal [ [ "9:00 AM", "Opening matches" ] ], clone.event_schedule_items.pluck(:time, :description)
    assert_equal [ [ "Black Belt Absolute", 5_000.to_d ] ], clone.prize_categories.pluck(:name, :amount)

    cloned_accommodation = clone.event_accommodations.find_by!(hotel_name: "Partner Hotel")
    assert_equal "Tournament rate", cloned_accommodation.description
    assert_equal "671-555-0100", cloned_accommodation.contact_phone
    assert_nil cloned_accommodation.check_in_date
    assert_nil cloned_accommodation.check_out_date
    assert_nil cloned_accommodation.booking_code
    assert_nil cloned_accommodation.booking_url
  end

  test "choosing a future main event switches the public championship without changing other events" do
    @event.update!(is_main_event: true)
    qualifier = @event.organization.events.create!(
      name: "Marianas Pro Manila 2027",
      slug: "marianas-pro-manila-2027",
      date: Date.new(2027, 4, 24),
      status: "upcoming"
    )
    next_championship = @event.organization.events.create!(
      name: "Guam Marianas Open 2027",
      slug: "marianas-open-2027",
      date: Date.new(2027, 10, 23),
      status: "upcoming"
    )

    with_verified_clerk do
      patch "/api/v1/admin/events/#{next_championship.id}",
        params: { is_main_event: true },
        headers: @headers,
        as: :json
    end

    assert_response :success
    assert_not @event.reload.is_main_event?
    assert next_championship.reload.is_main_event?
    assert_equal "upcoming", qualifier.reload.status
    assert_equal "unavailable", qualifier.ticket_sales_status

    get "/api/v1/events"

    assert_response :success
    public_main_events = response.parsed_body.select { |event| event["is_main_event"] }
    assert_equal [ "marianas-open-2027" ], public_main_events.map { |event| event["slug"] }
  end

  private

  def with_verified_clerk
    original_verify = ClerkAuth.method(:verify)
    ClerkAuth.define_singleton_method(:verify) do |_token|
      { "sub" => "clerk_admin", "email" => "admin@example.com" }
    end
    yield
  ensure
    ClerkAuth.define_singleton_method(:verify, original_verify)
  end
end
