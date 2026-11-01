# Local acceptance fixture only. Never run this against a shared or deployed DB.
connection = ActiveRecord::Base.connection
raise 'Expected owned marianas_open_qa_b5 database' unless connection.select_value('SELECT current_database()') == 'marianas_open_qa_b5'
ActiveJob::Base.queue_adapter = :inline
season = AsjjfRankingSeason.find_or_create_by!(season_year: 2026)
season.update!(gi_ranking_id: 227, nogi_ranking_id: 234, team_ranking_id: 227, current: true)
season.sync_lists!
files = [
  [ 'individual_ranking_227.html', 'individual_ranking', 227 ],
  [ 'individual_ranking_234_nogi.html', 'individual_ranking', 234 ],
  [ 'individual_ranking_division_20401_get.html', 'individual_ranking_division', 20401 ],
  [ 'team_rank_227.html', 'team_ranking', 227 ]
]
# Ensure an observable matched profile and team using the real fixture's names.
parsed = Asjjf::Parsers.parse(page_type: 'individual_ranking', html: File.read(Rails.root.join('test/fixtures/files/asjjf/individual_ranking_227.html')),
  url: Asjjf::Url.build('individual_ranking', 227))
row = parsed.fetch(:rows).first
athlete = CompetitorLinker.candidates_for(row.fetch(:name)).sole rescue nil
unless athlete
  first, last = Identity::NameNormalizer.person_parts(row.fetch(:name))
  athlete = Competitor.create!(first_name: first, last_name: last, country_code: Identity::CountryCode.normalize(row[:country]))
end
gym = Academy.identity_matches('Biba Jiu Jitsu').first || Academy.create!(name: 'Biba Jiu Jitsu')
files.each do |file, page_type, id|
  snapshot = Asjjf::SnapshotIntake.call(url: Asjjf::Url.build(page_type, id), page_type: page_type,
    html: File.read(Rails.root.join('test/fixtures/files/asjjf', file)), source: 'admin_upload')
  raise snapshot.parse_error unless snapshot.parse_status == 'parsed'
  raise snapshot.ranking_apply_error unless snapshot.reload.ranking_apply_status == 'applied'
end
puts({ database: connection.select_value('SELECT current_database()'), profiles: [ athlete.id ], academy_slug: gym.slug,
  lists: season.asjjf_ranking_lists.map { |list| [ list.id, list.kind, list.discipline, list.category, list.asjjf_ranking_entries.count ] } }.to_json)
