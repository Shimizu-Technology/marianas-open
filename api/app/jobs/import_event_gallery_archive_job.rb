class ImportEventGalleryArchiveJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 3 do |job, error|
    import = EventGalleryImport.find_by(id: job.arguments.first)
    if import && !import.terminal?
      import.update!(status: "failed", completed_at: Time.current,
        entry_errors: (import.entry_errors + [ { entry: nil, message: "Storage/worker failure: #{error.class.name}" } ]).last(100))
      import.archive.purge if import.archive.attached?
    end
  end

  def perform(id)
    import = EventGalleryImport.find_by(id: id)
    PhotoIntake::Importer.new(import).call if import
  end
end
