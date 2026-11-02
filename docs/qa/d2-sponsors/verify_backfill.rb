# Run with: cd api && DATABASE_URL=postgres:///marianas_open_qa_d2 bin/rails runner ../docs/qa/d2-sponsors/verify_backfill.rb
abort "Use only the disposable marianas_open_qa_d2 database" unless ActiveRecord::Base.connection_db_config.database == "marianas_open_qa_d2"
require Rails.root.join("db/migrate/20261102200000_create_sponsor_placements")

proof = nil
SponsorPlacement.transaction do
  # Roll back the entire comparison, including removal of any QA-only featured fixture.
  SponsorPlacement.delete_all
  records = Sponsor.order(:sort_order).to_a
  before_attributes = records.map(&:attributes)
  key_for = ->(sponsor) { sponsor.name.to_s.downcase.gsub(/[^a-z0-9]/, "") }
  gvb = ->(sponsor) { key = key_for.call(sponsor); key.include?("gvb") || key.include?("guamvisitorsbureau") }
  before = {
    presenting: records.select { |s| gvb.call(s) }.map { |s| { name: s.name, url: s.website_url.presence || "https://www.visitguam.com" } },
    secondary: records.select { |s| s.tier == "presenting" && !gvb.call(s) }.map { |s| { name: s.name, url: s.website_url } },
    official: records.select { |s| s.tier == "official" && !gvb.call(s) }.map { |s| { name: s.name, url: ["hoteltano", "hoteltanoguam"].include?(key_for.call(s)) ? "https://www.hoteltano.com" : s.website_url } }
  }
  2.times { CreateSponsorPlacements.new.backfill_placements }
  after = before.keys.to_h do |type|
    [type, SponsorPlacement.where(placement_type: type.to_s).ordered.map { |p| { name: p.sponsor.name, url: p.cta_url.presence || p.sponsor.website_url } }]
  end
  raise "Public home output changed" unless before == after
  raise "Sponsor records changed" unless before_attributes == Sponsor.order(:sort_order).map(&:attributes)
  event = Event.find_by!(slug: "marianas-open-2026")
  lineup = SponsorPlacement.joins(:sponsor).where(placement_type: "event", event_id: [nil, event.id], sponsors: { organization_id: event.organization_id }).ordered.map(&:sponsor)
  raise "2026 event membership changed" unless lineup.map(&:id).sort == records.map(&:id).sort
  proof = {
    before: before, after: after, unchanged: true, sponsor_records_unchanged: true,
    repeated_backfill_count: SponsorPlacement.count, event_2026_membership_unchanged: true,
    event_2026: { before: records.map(&:name).sort, after: lineup.map(&:name).sort },
    organization_scope_check: {
      source: "isolated QA copy of local development; not a production data audit",
      sponsors: records.length, distinct_sponsor_organizations: records.map(&:organization_id).uniq.length,
      sponsors_outside_2026_event_organization: records.count { |s| s.organization_id != event.organization_id },
      null_sponsor_names: records.count { |s| s.name.nil? }
    }
  }
  raise ActiveRecord::Rollback
end
puts JSON.pretty_generate(proof)
