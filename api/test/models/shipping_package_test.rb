require "test_helper"

class ShippingPackageTest < ActiveSupport::TestCase
  setup do
    @organization = Organization.create!(name: "Marianas Open", slug: "marianas-open")
  end

  test "package dimensions and capacity must be physically usable" do
    package = @organization.shipping_packages.new(
      name: "Broken box", length_mm: 0, width_mm: 100, height_mm: 100,
      empty_weight_grams: -1, max_weight_grams: 0
    )

    assert_not package.valid?
    assert package.errors[:length_mm].any?
    assert package.errors[:empty_weight_grams].any?
    assert package.errors[:max_weight_grams].any?
  end

  test "capacity includes the weight of the package itself" do
    package = @organization.shipping_packages.create!(
      name: "Mailer", length_mm: 300, width_mm: 220, height_mm: 50,
      empty_weight_grams: 100, max_weight_grams: 1_000
    )

    assert package.fits_weight?(900)
    assert_not package.fits_weight?(901)
  end
end
