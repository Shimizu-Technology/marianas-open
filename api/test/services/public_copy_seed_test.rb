require "test_helper"

class PublicCopySeedTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper
  test "creates missing copy in all seven locales without translation jobs" do
    assert_no_enqueued_jobs do
      PublicCopySeed.call
    end
    entry = SiteContent.find_by!(key: "watch_subtitle")
    %w[en ja ko pt tl zh zh_hant].each { |locale| assert entry.public_send("value_#{locale}").present? }
  end

  test "reruns preserve staff text, translations and metadata" do
    entry = SiteContent.create!(key: "about_hero_title", value_en: "Staff wording", value_ja: "スタッフの文章", section: "about", label: "Staff label", translation_status: "failed")
    before = entry.attributes
    PublicCopySeed.call
    count = SiteContent.count
    PublicCopySeed.call
    assert_equal count, SiteContent.count
    assert_equal before, entry.reload.attributes
  end
end
