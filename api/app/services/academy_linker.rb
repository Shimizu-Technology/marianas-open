# Finds or creates Academy records and links Competitors to them.
#
# Usage:
#   AcademyLinker.link_all          # backfill all competitors
#   AcademyLinker.link_event(event) # link competitors from one event's results
#
class AcademyLinker
  class << self
    def link_all
      created = 0
      linked = 0

      Competitor.where(academy_id: nil)
        .where("competitors.academy IS NOT NULL AND competitors.academy != ''")
        .find_each do |competitor|
          academy = find_or_create(competitor.read_attribute(:academy), competitor.country_code)
          competitor.update_column(:academy_id, academy.id)
          linked += 1
          created += 1 if academy.previously_new_record?
        end

      { created: created, linked: linked }
    end

    def link_event(event)
      competitor_ids = event.event_results.where.not(competitor_id: nil).distinct.pluck(:competitor_id)
      competitors = Competitor.where(id: competitor_ids, academy_id: nil)
        .where("competitors.academy IS NOT NULL AND competitors.academy != ''")

      created = 0
      linked = 0

      competitors.find_each do |competitor|
        academy = find_or_create(competitor.read_attribute(:academy), competitor.country_code)
        competitor.update_column(:academy_id, academy.id)
        linked += 1
        created += 1 if academy.previously_new_record?
      end

      { created: created, linked: linked }
    end

    def find_or_create(name, country_code = nil)
      normalized = normalize(name)

      if normalized.blank?
        begin
          return Academy.find_or_create_by!(name: "Independent") { |a| a.slug = "independent" }
        rescue ActiveRecord::RecordNotUnique
          return Academy.find_by!(name: "Independent")
        end
      end

      academy = Academy.where("LOWER(TRIM(name)) = ?", normalized).first
      return academy if academy

      country = CompetitorLinker.normalize_country(country_code) if country_code.present?

      Academy.create!(
        name: name.strip.gsub(/\s+/, " "),
        country_code: country
      )
    rescue ActiveRecord::RecordNotUnique
      Academy.where("LOWER(TRIM(name)) = ?", normalized).first!
    end

    private

    def normalize(name)
      name.to_s.strip.downcase.gsub(/\s+/, " ")
    end
  end
end
