import { useCallback, useState, useRef } from 'react'
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ImageUploadProps {
  currentUrl: string | null
  onUpload: (file: File) => Promise<void>
  label?: string
  accept?: string
}

export default function ImageUpload({ currentUrl, onUpload, label = 'Upload Image', accept = 'image/*' }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(async (file: File) => {
    setPreview(URL.createObjectURL(file))
    setIsUploading(true)
    try {
      await onUpload(file)
    } catch {
      setPreview(null)
    } finally {
      setIsUploading(false)
    }
  }, [onUpload])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const displayUrl = preview || currentUrl

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
        {label}
      </label>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={`relative border border-dashed cursor-pointer transition-colors min-h-[120px] flex items-center justify-center ${
          isDragging ? 'border-gold bg-gold/5' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleChange}
          className="hidden"
        />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-4"
            >
              <Loader2 className="w-6 h-6 text-gold animate-spin" />
              <span className="text-xs text-text-muted">Uploading...</span>
            </motion.div>
          ) : displayUrl ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="relative w-full"
            >
              <img
                src={displayUrl}
                alt="Preview"
                className="w-full h-32 object-cover"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setPreview(null)
                }}
                className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 transition-colors"
              >
                <X className="w-3 h-3 text-white" />
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-2 py-4"
            >
              <div className="p-2 bg-white/5">
                {isDragging ? (
                  <Upload className="w-5 h-5 text-gold" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-text-muted" />
                )}
              </div>
              <div className="text-center">
                <span className="text-xs text-text-secondary">
                  Drop file here or click to browse
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
