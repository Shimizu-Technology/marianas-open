# ASJJF Phase B1 parser contract

This slice implements pure snapshot parsing. Context: `docs/2027-PLATFORM-PLAN.md` identifies ASJJF as the source of truth and requires fail-closed intake before results imports are rebuilt. `api/app/services/asjjf_scraper.rb` remains unchanged. Its import/replacement behavior and identity normalization are outside this slice. The consumers are the upcoming snapshot intake/admin workflow; public results and rankings are not changed here.

Implementation base: `b6eadb3`, branch `t3/asjjf-pure-parsers-fixtures`, November 2, 2026. The local checkout was clean before this slice.

## Entry points

```ruby
require_relative "api/app/services/asjjf/parsers"

Asjjf::Parsers.parse(page_type: :event_results, html: html, url: url)
Asjjf::Parsers::EventResults.new(html, url: url).parse
Asjjf::Parsers::ChallengeDetector.challenged?(html)
```

Supported page types/classes: `event_results`/`EventResults`, `results_list`/`ResultsList`, `event_info`/`EventInfo`, `season_calendar`/`SeasonCalendar`, `team_ranking`/`TeamRanking`, `individual_ranking`/`IndividualRanking`, and `individual_ranking_division`/`IndividualRankingDivision`.

All hash keys are symbols. Names retain source spelling, punctuation, Unicode, and order; HTML entities are decoded and display whitespace is collapsed. Gender/belt values are lowercase. Division `name`, `age` (`Adult 18`, `Kid 4`, `Master 30`, including source capitalization), and `weight` (`Open Weight`, `Light Feather`) preserve source labels. Both gender/belt/age and gender/age/belt ordering are supported. Discipline is `gi` or `nogi`, read from the page title rather than navigation or narrative mentions of the other tournament.

Results return title, discipline, category, event ID, divisions with placements and `alone_in_bracket`, and counts. A division with one published gold placement is marked alone. Counts describe the captured category only; `eventResults/2062` is the male-adult page, not all categories combined.

Event info returns `dates`, venue, registration URL, stars, all fee tiers, currency, contacts, and spectator facts. Dates are ISO dates or local datetimes **without an assumed timezone**. Narrative facts retain their source text in `information` and categorized `facts`, including additional correction, refund, registration-check, and publication deadlines. Structured `dates` covers the dedicated ASJJF dates section. Do not treat a narrative fact as an independently resolved date. Fee amounts and ranking points are `BigDecimal`; medals and positions are integers. Currency signs are retained; USD/JPY are resolved from a dollar/yen sign only with the published Guam/Japan venue. Missing facts remain nil or empty. Manila has no published fees, star rating, or narrative facts in this snapshot.

Calendar returns all events with title, ASJJF ID, source link, banner, discipline where identifiable, event date/range, registration dates, and published place. Six external Google Forms registrations use the ASJJF banner path as their ID source. Blank registration dates remain nil. Select events without mutation:

```ruby
Asjjf::Parsers::SeasonCalendar.select_marianas(
  parsed[:events], pattern: /\bmarianas\b/i, event_ids: [], exclude_ids: []
)
```

The ranking index returns every division ID/name/gender/age/belt/link, its default division, and default rows. The division endpoint is a fragment and returns division/rows, with no invented ranking title or discipline. Individual rows include member ID/link, exact name, academy, country, points, and gold/silver/bronze. Team rows include name, team ID/link when published, and points; this source does not publish team medals. Ties are retained.

Invalid, unrelated, wrong-kind, empty, incomplete-table, or challenged input raises `Asjjf::Parsers::ParseError`; interactive challenges raise its subclass `ChallengeError`. ASJJF source routes are checked. Passive Cloudflare JavaScript in successful snapshots is accepted. Structural validation cannot prove that an otherwise valid snapshot contains every source row; intake must still enforce snapshot provenance/completeness and B3 must protect imports.

## Fixtures and verification

All 13 supplied `.html` files were copied byte-for-byte from `/tmp/mo-asjjf-fixtures/out`. `api/test/fixtures/files/asjjf/manifest.json` records their byte sizes and SHA-256 digests. No live fetching is needed.

Verified and asserted source counts:

- Results 2062 male adult: 93 divisions / 246 placements / 16 alone.
- Results 2063 no-gi male adult: 39 / 100 / 8.
- Results 2062 female adult: 36 / 77 / 11.
- Results 2062 male kids: 48 / 121 / 9.
- Calendar 381: 85 events, including eight selected Marianas events.
- Team ranking 227: 217 rows; Biba Jiu Jitsu leads with 5351.00 points.
- Individual index 227: 85 divisions / 39 default rows.
- Individual no-gi index 234: 57 divisions / 10 default rows.
- Individual division 20401: 158 rows.
- Copa/Tokyo: 12 fees each; Manila: zero published fees.

Agent-executed acceptance: all supplied positive snapshots, exact-name/division regressions, decimal fidelity, source facts/absence, immutable inputs, configurable calendar selection, challenge detection, and malformed/wrong-page rejection passed. The initial calendar venue expectation was corrected to match the full published venue text. Final automated result: 53 tests, 3025 assertions, zero failures/errors/skips; 17 Ruby files passed RuboCop.

Run from `api`:

```sh
bundle exec ruby -Itest -e 'Dir["test/services/asjjf/parsers/*_test.rb"].sort.each { |file| require_relative file }'
bundle exec rubocop app/services/asjjf/parsers.rb app/services/asjjf/parsers test/services/asjjf/parsers --format simple
```

These tests require Nokogiri and Minitest but do not boot Rails, load Active Record, or connect to a database. No servers, browsers, devices, or containers were started. No use was made of `marianas_open_test_b1`. UI, intake persistence, Rails integration, live fetching, full application gates, independent PR review, and deployment verification belong to the parent integration and were not run here. No PR, push, merge, scraper changes, or data mutations are included.
