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
