require "test_helper"

class EventLifecycleTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
  end

  test "saving a main event demotes the previous main event in the same organization" do
    current_event = create_event(name: "Marianas Open 2026", slug: "marianas-open-2026", is_main_event: true)
    next_event = create_event(name: "Marianas Open 2027", slug: "marianas-open-2027", date: Date.new(2027, 10, 23))

    next_event.update!(is_main_event: true)

    assert_not current_event.reload.is_main_event?
    assert next_event.reload.is_main_event?
    assert_equal [ next_event.id ], @organization.events.where(is_main_event: true).pluck(:id)
  end

  test "main events remain independent between organizations" do
    current_event = create_event(name: "Marianas Open 2026", slug: "marianas-open-2026", is_main_event: true)
    other_organization = Organization.create!(name: "Partner Series", slug: "partner-series")
    partner_event = other_organization.events.create!(
      name: "Partner Championship",
      slug: "partner-championship",
      date: Date.new(2026, 11, 1),
      status: "upcoming",
      is_main_event: true
    )

    assert current_event.reload.is_main_event?
    assert partner_event.reload.is_main_event?
  end

  private

  def create_event(attributes)
    @organization.events.create!({
      date: Date.new(2026, 10, 24),
      status: "upcoming"
    }.merge(attributes))
  end
end
