class CompletePastEventsJob < ApplicationJob
  queue_as :default

  def perform
    Event.complete_past_events!
  end
end
