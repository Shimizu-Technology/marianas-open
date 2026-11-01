module Asjjf
  module ResultsIdentity
    def self.parts(label)
      Parsers::Division.parse(label.to_s.sub(/\A\[(?:GI|NOGI)\]\s*/i, ""), weight: true)
    end

    def self.division_key(label)
      parsed = parts(label)
      [ parsed[:gender], parsed[:belt].sub("grey", "gray"), parsed[:age], parsed[:weight] ]
        .map { |part| Identity::NameNormalizer.key(part) }.join("|")
    rescue Parsers::ParseError
      Identity::NameNormalizer.key(label.to_s.sub(/\A\[(?:GI|NOGI)\]\s*/i, ""))
    end

    def self.key(row, source: true, discipline: true)
      values = []
      values << row.asjjf_event_id if source
      values << row.discipline if discipline
      values + [ division_key(row.division), row.placement, Identity::NameNormalizer.key(row.competitor_name) ]
    end

    def self.attributes(division, placement, source)
      parts = self.parts(division.fetch("name"))
      age = parts[:age].downcase
      age = age.start_with?("adult") ? "adult" : age.start_with?("juvenile") ? "juvenile" : age.tr(" ", "_")
      {
        source: "asjjf", asjjf_event_id: source.asjjf_event_id, discipline: source.discipline,
        division: "[#{source.discipline == 'nogi' ? 'NOGI' : 'GI'}] #{division.fetch('name')}",
        division_key: division_key(division.fetch("name")), gender: parts[:gender],
        belt_rank: parts[:belt].sub("grey", "gray"), age_category: age,
        weight_class: parts[:weight].downcase.tr(" ", "_"), placement: placement["position"],
        competitor_name: placement["name"], academy: placement["academy"],
        country_code: Identity::CountryCode.normalize(placement["country"]),
        alone_in_bracket: division["alone_in_bracket"]
      }
    end
  end
end
