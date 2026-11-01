namespace :asjjf do
  desc "Queue saved-snapshot results checks (no outbound HTTP)"
  task import_all: :environment do
    Event.find_each do |event|
      requests = Asjjf::FetchPlanner.new(requested_by: "rake asjjf:import_all").plan_event_results(event)
      puts "#{event.slug}: #{requests.uniq(&:id).size} pages queued for the next nightly fetch" if requests.any?
    end
  end

  desc "Preview latest saved results: rake asjjf:preview[slug]"
  task :preview, [ :slug ] => :environment do |_task, args|
    event = Event.find_by!(slug: args[:slug])
    run = Asjjf::ResultsSync.new(event).call(trigger: "manual", apply: false)
    puts JSON.pretty_generate(run.as_json)
  end

  desc "Queue one event: rake asjjf:import[slug] (approval is in admin)"
  task :import, [ :slug ] => :environment do |_task, args|
    event = Event.find_by!(slug: args[:slug])
    requests = Asjjf::FetchPlanner.new(requested_by: "rake asjjf:import").plan_event_results(event)
    puts "#{requests.uniq(&:id).size} pages queued for the next nightly fetch; review holds in admin"
  end
end
