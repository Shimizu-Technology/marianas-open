# Run with Rails runner inside the staging API container. Dry-run by default;
# pass --apply only after the S3 service and a fresh admin upload are verified.
require "base64"
require "digest"
require "stringio"

expected_bucket = "mo-staging-media-248189943429"
demo_product_names = [
  "DEMO — Fökai Bucket Hat",
  "DEMO — Fökai 33-inch Golf Towel",
  "DEMO — Fökai Ever Ready Backpack",
  "DEMO — PGF Official Gear Bag",
  "DEMO — ADCC 2026 Black Tee",
  "DEMO — ADCC Blacked Short-Sleeve Rash Guard"
].freeze

abort "Staging only" unless ENV["COMMERCE_DEPLOYMENT_ENV"] == "staging"
abort "S3 must be active" unless ENV["ACTIVE_STORAGE_SERVICE"] == "amazon"
abort "Unexpected bucket" unless ENV["AWS_S3_BUCKET"] == expected_bucket
abort "Use no arguments for dry run or --apply to copy" unless ARGV.empty? || ARGV == [ "--apply" ]

products = Product.includes(product_images: { image_attachment: :blob }).where(name: demo_product_names).to_a
abort "Expected all six named demo products" unless products.length == demo_product_names.length

images = products.flat_map(&:product_images)
abort "Expected one image per demo product" unless images.length == demo_product_names.length && images.all? { |image| image.image.attached? }
abort "Unexpected current image service" unless images.all? { |image| %w[local amazon].include?(image.image.blob.service_name) }

local_count = images.count { |image| image.image.blob.service_name == "local" }
puts "Demo product images: #{images.length}; local to copy: #{local_count}; already S3: #{images.length - local_count}"
exit unless ARGV == [ "--apply" ]

s3 = ActiveStorage::Blob.services.fetch("amazon")
images.each do |image|
  blob = image.image.blob
  blob.with_lock do
    if blob.service_name == "amazon"
      abort "S3 image missing: #{blob.id}" unless s3.exist?(blob.key)
      remote_checksum = Base64.strict_encode64(Digest::MD5.digest(s3.download(blob.key)))
      abort "S3 image checksum mismatch: #{blob.id}" unless remote_checksum == blob.checksum

      next
    end
    abort "Image service changed during migration" unless blob.service_name == "local"

    bytes = blob.download
    checksum = Base64.strict_encode64(Digest::MD5.digest(bytes))
    abort "Local image checksum mismatch: #{blob.id}" unless checksum == blob.checksum

    s3.upload(blob.key, StringIO.new(bytes), checksum: blob.checksum, content_type: blob.content_type)
    abort "S3 image missing after upload: #{blob.id}" unless s3.exist?(blob.key)
    abort "S3 image checksum mismatch: #{blob.id}" unless Digest::SHA256.digest(s3.download(blob.key)) == Digest::SHA256.digest(bytes)

    blob.update!(service_name: "amazon")
    puts "Copied image #{blob.id} for #{image.product.name}"
  end
end

puts "Verified and migrated all six demo product images; local originals were retained."
