# frozen_string_literal: true

require 'net/http'
require 'uri'

namespace :media do
  desc 'Audit public media URLs used by site_images, sponsors, and event hero images'
  task audit_urls: :environment do
    checks = []

    SiteImage.where.not(image_url: [nil, '']).find_each do |img|
      checks << ["SiteImage##{img.id} (#{img.placement})", img.image_url]
    end

    Sponsor.where.not(logo_url: [nil, '']).find_each do |s|
      checks << ["Sponsor##{s.id} (#{s.name})", s.logo_url]
    end

    Event.where.not(hero_image_url: [nil, '']).find_each do |e|
      checks << ["Event##{e.id} (#{e.slug})", e.hero_image_url]
    end

    puts "Auditing #{checks.size} URLs..."

    failures = []

    checks.each do |label, raw_url|
      begin
        uri = URI.parse(raw_url)
        unless uri.is_a?(URI::HTTP) || uri.is_a?(URI::HTTPS)
          failures << [label, raw_url, 'INVALID_SCHEME']
          next
        end

        response = Net::HTTP.start(
          uri.host,
          uri.port,
          use_ssl: uri.scheme == 'https',
          open_timeout: 5,
          read_timeout: 8
        ) do |http|
          request = Net::HTTP::Head.new(uri.request_uri)
          http.request(request)
        end

        code = response.code.to_i
        failures << [label, raw_url, code] if code >= 400
      rescue StandardError => e
        failures << [label, raw_url, e.class.name]
      end
    end

    if failures.empty?
      puts '✅ No broken media URLs found.'
    else
      puts "\n❌ Found #{failures.size} problematic media URLs:"
      failures.each do |label, url, status|
        puts "- [#{status}] #{label} -> #{url}"
      end
      puts "\nTip: fix/remove these URLs so frontend fallbacks are not triggered."
    end
  end
end
