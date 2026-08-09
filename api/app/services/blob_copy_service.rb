class BlobCopyService
  def self.call(source_blob)
    source_blob.open do |io|
      ActiveStorage::Blob.create_and_upload!(
        io:,
        filename: source_blob.filename,
        content_type: source_blob.content_type,
        metadata: source_blob.metadata,
        service_name: source_blob.service_name,
        identify: false
      )
    end
  end
end
