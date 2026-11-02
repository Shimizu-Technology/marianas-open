namespace :site_content do
  desc "Create missing public copy defaults without changing staff edits"
  task seed_public_copy: :environment do
    PublicCopySeed.call
  end
end

# Render deploys run db:migrate, not the destructive demo db:seed.
# Keep deployment copy defaults create-only and independent of schema versions.
Rake::Task["db:migrate"].enhance do
  PublicCopySeed.call
end
