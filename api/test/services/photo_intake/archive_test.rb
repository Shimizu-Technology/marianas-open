require "test_helper"
require_relative "../../support/photo_intake_fixtures"

class PhotoIntakeArchiveTest < ActiveSupport::TestCase
  include PhotoIntakeFixtures

  test "stored and deflated entries stream with CRC including data descriptors" do
    [ 0, 8 ].each do |method|
      [ 0, 8 ].each do |flags|
        data = image_bytes(value: :noise)
        with_archive(zip_bytes([ { name: "nested/photo.png", data: data, method: method, flags: flags } ])) do |archive|
          Tempfile.create("extracted", binmode: true) do |output|
            assert_equal data.bytesize, archive.extract(archive.entries.first, output)
            assert_equal data, output.read
          end
        end
      end
    end
  end

  test "rejects traversal absolute drive backslash nul and duplicate paths" do
    [ "../escape.png", "/tmp/p.png", "C:/p.png", "safe/../../p.png", "safe\\p.png", "safe/./p.png", "x\x00.png", "a//b.png" ].each do |name|
      assert_raises(PhotoIntake::Archive::Unsafe, name) { with_archive(zip_bytes([ { name: name } ])) { flunk } }
    end
    assert_raises(PhotoIntake::Archive::Unsafe) { with_archive(zip_bytes([ { name: "a" }, { name: "a" } ])) { flunk } }
  end

  test "rejects symlinks special files encryption unsupported compression and header mismatch" do
    [ { attributes: 0o120777 << 16 }, { attributes: 0o020666 << 16 }, { flags: 1 }, { flags: 64 }, { method: 99 }, { local_name: "other.png" } ].each do |attack|
      assert_raises(PhotoIntake::Archive::Unsafe, attack.inspect) do
        with_archive(zip_bytes([ { name: "p.png", data: "test" }.merge(attack) ])) { flunk }
      end
    end
  end

  test "rejects central count metadata size entry size total size and ratio bombs before extraction" do
    entries = Array.new(PhotoIntake::Archive::MAX_ENTRIES + 1) { |i| { name: "p#{i}" } }
    assert_raises(PhotoIntake::Archive::Unsafe) { with_archive(zip_bytes(entries)) { flunk } }
    [ { name: "a" * 1025 }, { name: "p.png", size: PhotoIntake::Archive::MAX_ENTRY_BYTES + 1 },
      { name: "bomb.png", data: "\0" * 100_000 } ].each do |attack|
      assert_raises(PhotoIntake::Archive::Unsafe) { with_archive(zip_bytes([ attack ])) { flunk } }
    end
    # Bypass entry ratio to exercise independent total expanded budget.
    original = PhotoIntake::Archive::MAX_TOTAL_BYTES
    PhotoIntake::Archive.send(:remove_const, :MAX_TOTAL_BYTES)
    PhotoIntake::Archive.const_set(:MAX_TOTAL_BYTES, 5)
    assert_raises(PhotoIntake::Archive::Unsafe) { with_archive(zip_bytes([ { name: "p", data: "123456" } ])) { flunk } }
  ensure
    if original
      PhotoIntake::Archive.send(:remove_const, :MAX_TOTAL_BYTES)
      PhotoIntake::Archive.const_set(:MAX_TOTAL_BYTES, original)
    end
  end

  test "rejects forged expansion sizes and corrupt CRC while streaming" do
    [ { size: 2 }, { crc: 0 } ].each do |attack|
      with_archive(zip_bytes([ { name: "p", data: "test value" }.merge(attack) ])) do |archive|
        Tempfile.create("extracted", binmode: true) do |output|
          assert_raises(PhotoIntake::Archive::Unsafe) { archive.extract(archive.entries.first, output) }
          assert_operator output.size, :<=, PhotoIntake::Archive::MAX_ENTRY_BYTES
        end
      end
    end
  end

  test "ZIP64 directory metadata is supported with the same bounded entry policy" do
    original = zip_bytes([ { name: "one.png", data: image_bytes } ])
    trailer = original.byteslice(-22, 22).unpack("VvvvvVVv")
    count, length, offset = trailer[4], trailer[5], trailer[6]
    body = original.byteslice(0...-22)
    record_offset = body.bytesize
    zip64 = [ 0x06064b50, 44, 45, 45, 0, 0, count, count, length, offset ].pack("VQ<vvVVQ<Q<Q<Q<")
    locator = [ 0x07064b50, 0, record_offset, 1 ].pack("VVQ<V")
    eocd = [ 0x06054b50, 0, 0, 0xffff, 0xffff, 0xffffffff, 0xffffffff, 0 ].pack("VvvvvVVv")
    with_archive(body + zip64 + locator + eocd) do |archive|
      assert_equal 1, archive.entries.length
      Tempfile.create("zip64-entry", binmode: true) do |output|
        archive.extract(archive.entries.first, output)
        assert_equal image_bytes, output.read
      end
    end
  end

  test "archive and directory byte caps reject sparse or forged oversized input" do
    Tempfile.create("oversized-archive", binmode: true) do |file|
      file.truncate(PhotoIntake::Archive::MAX_BYTES + 1)
      assert_raises(PhotoIntake::Archive::Unsafe) { PhotoIntake::Archive.new(file.path) }
    end
    good = zip_bytes([ { name: "p", data: "hi" } ])
    good[-10, 4] = [ PhotoIntake::Archive::MAX_DIRECTORY_BYTES + 1 ].pack("V")
    assert_raises(PhotoIntake::Archive::Unsafe) { with_archive(good) { flunk } }
  end

  test "rejects truncated archive and fabricated directory bounds" do
    good = zip_bytes([ { name: "p", data: "hello" } ])
    assert_raises(PhotoIntake::Archive::Unsafe) { with_archive(good[0...-3]) { flunk } }
    good[-6, 4] = [ 0xffffffee ].pack("V")
    assert_raises(PhotoIntake::Archive::Unsafe) { with_archive(good) { flunk } }
  end
end
