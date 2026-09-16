class AddHotelTanoSponsor < ActiveRecord::Migration[8.1]
  ORGANIZATION_SLUG = "marianas-open".freeze
  SPONSOR_NAME = "Hotel Tano Guam".freeze
  SPONSOR_ATTRIBUTES = {
    name: SPONSOR_NAME,
    tier: "official",
    sort_order: 18,
    website_url: nil
  }.freeze

  def up
    org = Organization.find_by(slug: ORGANIZATION_SLUG)
    return unless org

    return if org.sponsors.exists?(name: SPONSOR_NAME)

    org.sponsors.create!(SPONSOR_ATTRIBUTES)
  end

  def down
    org = Organization.find_by(slug: ORGANIZATION_SLUG)
    return unless org

    # Preserve pre-existing or administrator-edited records. Only remove the
    # unchanged record with the exact attributes this migration creates.
    org.sponsors.find_by(SPONSOR_ATTRIBUTES)&.destroy!
  end
end
