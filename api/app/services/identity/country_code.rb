module Identity
  module CountryCode
    # ISO 3166-1 assigned codes, vendored from wooorm/iso-3166 (MIT), 2026-11-02.
    # https://github.com/wooorm/iso-3166/blob/main/1.js
    ISO = JSON.parse(Rails.root.join("config/iso_country_codes.json").read).freeze
    # ASJJF uses sporting codes for Taiwan and Kosovo. XK is user-assigned.
    ALIASES = { "TAI" => "TW", "TPE" => "TW", "KOS" => "XK", "XKX" => "XK" }.freeze
    ALPHA2 = (ISO.values + [ "XK" ]).freeze

    def self.normalize(value)
      code = value.to_s.strip.upcase
      return code if ALPHA2.include?(code)
      ISO[code] || ALIASES[code]
    end
  end
end
