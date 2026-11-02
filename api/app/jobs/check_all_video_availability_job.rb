class CheckAllVideoAvailabilityJob < ApplicationJob
  queue_as :default

  def perform
    Video.find_each { |video| CheckVideoAvailabilityJob.perform_now(video.id) }
  end
end
