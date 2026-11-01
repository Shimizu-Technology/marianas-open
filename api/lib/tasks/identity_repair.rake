namespace :identity do
  task local_repair_environment: :environment do
    abort "Identity repair tasks must not run in production" if Rails.env.production?
  end

  desc "Preview reviewed identity CSV repairs; DECISIONS=path ATHLETES=path APPLY=1 to apply"
  task repair: :local_repair_environment do
    abort "Provide DECISIONS=path and/or ATHLETES=path" if ENV["DECISIONS"].blank? && ENV["ATHLETES"].blank?
    Identity::Repair.call(decisions: ENV["DECISIONS"], athletes: ENV["ATHLETES"], apply: ENV["APPLY"] == "1")
  end

  desc "Preview exact normalized hyphen duplicates with consistent complete histories; APPLY=1 to apply"
  task repair_hyphen_duplicates: :local_repair_environment do
    Identity::Repair.hyphen_duplicates(athletes: ENV["ATHLETES"], apply: ENV["APPLY"] == "1")
  end

  desc "Preview per-result academy links and current gyms; APPLY=1 to apply"
  task backfill: :local_repair_environment do
    Identity::Backfill.call(apply: ENV["APPLY"] == "1")
  end
end
