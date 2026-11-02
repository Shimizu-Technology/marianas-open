require "test_helper"

class PublicCopySeedTest < ActiveSupport::TestCase
  include ActiveJob::TestHelper
  test "creates missing copy in all seven locales without translation jobs" do
    assert_no_enqueued_jobs do
      PublicCopySeed.call
    end
    entry = SiteContent.find_by!(key: "watch_subtitle")
    %w[en ja ko pt tl zh zh_hant].each { |locale| assert entry.public_send("value_#{locale}").present? }
    assert_equal "translated", entry.translation_status
  end

  test "editing seeded English copy enqueues translation when configured" do
    PublicCopySeed.call
    entry = SiteContent.find_by!(key: "watch_subtitle")
    previous_key = ENV["GT_API_KEY"]
    previous_project = ENV["GT_PROJECT_ID"]
    ENV["GT_API_KEY"] = "test-key"
    ENV["GT_PROJECT_ID"] = "test-project"
    assert_enqueued_with(job: TranslateSiteContentJob, args: [ entry.id ]) do
      entry.update!(value_en: "Updated by staff")
    end
    assert_equal "pending", entry.reload.translation_status
  ensure
    ENV["GT_API_KEY"] = previous_key
    ENV["GT_PROJECT_ID"] = previous_project
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
