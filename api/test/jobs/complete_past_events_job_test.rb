require "test_helper"

class CompletePastEventsJobTest < ActiveJob::TestCase
  test "completes past public events outside the request cycle" do
    organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
    past_event = organization.events.create!(
      name: "Past Event",
      slug: "past-event",
      date: Date.yesterday,
      status: "upcoming"
    )
    future_event = organization.events.create!(
      name: "Future Event",
      slug: "future-event",
      date: Date.tomorrow,
      status: "upcoming"
    )

    CompletePastEventsJob.perform_now

    assert_equal "completed", past_event.reload.status
    assert_equal "upcoming", future_event.reload.status
  end
end
