import { useEffect, useState, useCallback, useMemo, useRef, useId } from 'react'
import type { DragEvent } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Loader2,
  Save,
  Image as ImageIcon,
  Eye,
  Upload,
  UploadCloud,
  CheckSquare,
  Square,
  EyeOff,
  Tags,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { discardMessage } from './useDirtyNavigation'
import { api } from '../../../services/api'
import type { EventGalleryImage, EventGalleryImageFormData } from '../../../services/api'
import ImageWithShimmer from '../../ImageWithShimmer'
import { resolveMediaUrl } from '../../../utils/images'
import {
  GALLERY_IMAGE_ACCEPT,
  GALLERY_IMAGE_MAX_BYTES,
  GALLERY_IMAGE_TYPE_LABEL,
  isSupportedGalleryImage,
  useGalleryUploads,
} from '../../../contexts/GalleryUploadContext'

const GALLERY_ADMIN_PER_PAGE = 48
const GALLERY_ADMIN_EAGER_IMAGE_COUNT = 8
type GalleryDeleteConfirm = { type: 'single'; id: number; title: string } | { type: 'bulk'; ids: number[] }

export default function EventGallerySection({
  eventId,
  eventName,
  onDirtyChange,
}: {
  eventId: number
  eventName: string
  onDirtyChange?: (dirty: boolean) => void
}) {
  const [galleryImages, setGalleryImages] = useState<EventGalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [uploadCaption, setUploadCaption] = useState('')
  const [uploadCategory, setUploadCategory] = useState('')
  const [uploadActive, setUploadActive] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState(GALLERY_CATEGORY_ALL)
  const [bulkCategory, setBulkCategory] = useState('')
  const [categoryOptions, setCategoryOptions] = useState<{ name: string; count: number }[]>([])
  const [uncategorizedCount, setUncategorizedCount] = useState(0)
  const [galleryDeleteConfirm, setGalleryDeleteConfirm] = useState<GalleryDeleteConfirm | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [form, setForm] = useState<EventGalleryImageFormData>({
    title: '',
    alt_text: '',
    caption: '',
    category: '',
    sort_order: 0,
    active: true,
  })
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [formBaseline, setFormBaseline] = useState('')
  const openedEditor = useRef<number | 'new' | null>(null)
  useEffect(() => {
    if (openedEditor.current !== editing) {
      openedEditor.current = editing
      setFormBaseline(JSON.stringify(form))
    }
  }, [editing, form])
  useEffect(
    () => () => {
      onDirtyChange?.(false)
    },
    [onDirtyChange]
  )
  useEffect(() => {
    onDirtyChange?.(editing !== null && (JSON.stringify(form) !== formBaseline || !!pendingFile))
  }, [editing, form, formBaseline, pendingFile, onDirtyChange])
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadCategoryTouchedRef = useRef(false)
  const { tasks, startUpload } = useGalleryUploads()
  const completedForEvent = tasks.filter((task) => task.eventId === eventId && task.status === 'complete').length
  const visibleImageIds = useMemo(() => galleryImages.map((image) => image.id), [galleryImages])
  const allVisibleSelected = visibleImageIds.length > 0 && visibleImageIds.every((id) => selectedIds.includes(id))
  const editingImage = typeof editing === 'number' ? galleryImages.find((image) => image.id === editing) || null : null
  const totalPages = Math.max(1, Math.ceil(total / GALLERY_ADMIN_PER_PAGE))
  const pageStart = total === 0 ? 0 : (page - 1) * GALLERY_ADMIN_PER_PAGE + 1
  const pageEnd = Math.min(total, page * GALLERY_ADMIN_PER_PAGE)
  const activeCategoryLabel = categoryFilter === GALLERY_CATEGORY_UNCATEGORIZED ? 'Uncategorized' : categoryFilter

  const load = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, per_page: GALLERY_ADMIN_PER_PAGE }
      if (categoryFilter !== GALLERY_CATEGORY_ALL) params.category = categoryFilter
      const res = await api.admin.getEventGalleryImages(eventId, params)
      const lastPage = Math.max(1, Math.ceil(res.total / GALLERY_ADMIN_PER_PAGE))
      if (page > lastPage) {
        setGalleryImages([])
        setCategoryOptions(res.categories || [])
        setUncategorizedCount(res.uncategorized_count || 0)
        setTotal(res.total)
        setPage(lastPage)
        return
      }
      setGalleryImages(res.gallery_images)
      setCategoryOptions(res.categories || [])
      setUncategorizedCount(res.uncategorized_count || 0)
      setTotal(res.total)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gallery')
    } finally {
      setLoading(false)
    }
  }, [eventId, page, categoryFilter])

  useEffect(() => {
    load()
  }, [load])
  useEffect(() => {
    setSelectedIds([])
  }, [eventId, page, categoryFilter])
  useEffect(() => {
    uploadCategoryTouchedRef.current = false
    setUploadCategory('')
  }, [eventId])
  useEffect(() => {
    if (categoryFilter === GALLERY_CATEGORY_ALL || uploadCategoryTouchedRef.current) return
    setUploadCategory(categoryFilter === GALLERY_CATEGORY_UNCATEGORIZED ? '' : categoryFilter)
  }, [categoryFilter])
  useEffect(() => {
    if (completedForEvent === 0) return undefined
    const refreshTimer = window.setTimeout(() => {
      void load()
    }, 750)
    return () => window.clearTimeout(refreshTimer)
  }, [completedForEvent, load])

  const resetForm = () => {
    setForm({
      title: '',
      alt_text: '',
      caption: '',
      category: uploadCategory,
      sort_order: galleryImages.length,
      active: true,
    })
    setPendingFile(null)
  }

  const editGalleryImage = (image: EventGalleryImage) => {
    if (editing !== null && JSON.stringify(form) !== formBaseline && !window.confirm(discardMessage)) return
    setForm({
      title: image.title || '',
      alt_text: image.alt_text || '',
      caption: image.caption || '',
      category: image.category || '',
      sort_order: image.sort_order,
      active: image.active,
    })
    setPendingFile(null)
    setEditing(image.id)
  }

  const closeEditor = () => {
    if (saving) return
    if ((JSON.stringify(form) !== formBaseline || pendingFile) && !window.confirm(discardMessage)) return
    setEditing(null)
    setPendingFile(null)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing === 'new') {
        if (!pendingFile) return
        const formData = new FormData()
        formData.append('title', form.title)
        formData.append('alt_text', form.alt_text)
        formData.append('caption', form.caption)
        formData.append('category', form.category)
        formData.append('sort_order', String(form.sort_order))
        formData.append('active', String(form.active))
        formData.append('image', pendingFile)
        await api.admin.createEventGalleryImage(eventId, formData)
      } else if (typeof editing === 'number') {
        await api.admin.updateEventGalleryImage(eventId, editing, form)
        if (pendingFile) {
          await api.admin.uploadEventGalleryImage(eventId, editing, pendingFile)
        }
      }
      setEditing(null)
      setPendingFile(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save gallery image')
    } finally {
      setSaving(false)
    }
  }

  const handleFiles = async (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList)
    const files = selectedFiles.filter(isSupportedGalleryImage)
    if (files.length === 0) {
      setError(
        `Choose ${GALLERY_IMAGE_TYPE_LABEL} images under ${Math.round(GALLERY_IMAGE_MAX_BYTES / 1024 / 1024)} MB`
      )
      return
    }
    if (files.length < selectedFiles.length) {
      setError(
        `Skipped ${selectedFiles.length - files.length} unsupported or oversized file${selectedFiles.length - files.length === 1 ? '' : 's'}`
      )
    } else {
      setError('')
    }

    setSuccess('')
    try {
      await startUpload({
        eventId,
        eventName,
        files,
        active: uploadActive,
        caption: uploadCaption,
        category: uploadCategory,
        startSortOrder: total,
      })
      setSuccess(`Queued ${files.length} image${files.length === 1 ? '' : 's'} for upload`)
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue gallery uploads')
    }
  }

  const toggleSelected = (id: number) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]))
  }

  const toggleVisibleSelection = () => {
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleImageIds.includes(id))
      }
      return Array.from(new Set([...current, ...visibleImageIds]))
    })
  }

  const dragHasFiles = (event: DragEvent<HTMLDivElement>) => Array.from(event.dataTransfer.types).includes('Files')

  const handleGalleryDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(event)) return
    event.preventDefault()
    setDragActive(true)
  }

  const handleGalleryDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(event)) return
    event.preventDefault()
    setDragActive(true)
  }

  const handleGalleryDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
    setDragActive(false)
  }

  const handleGalleryDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!dragHasFiles(event)) return
    event.preventDefault()
    setDragActive(false)
    void handleFiles(event.dataTransfer.files)
  }

  const handleBulkActive = async (active: boolean) => {
    if (selectedIds.length === 0) return
    setError('')
    try {
      await api.admin.bulkUpdateEventGalleryImages(eventId, selectedIds, { active })
      setSelectedIds([])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk update failed')
    }
  }

  const handleBulkCategory = async (category = bulkCategory) => {
    if (selectedIds.length === 0) return
    setError('')
    try {
      await api.admin.bulkUpdateEventGalleryImages(eventId, selectedIds, { category })
      setSelectedIds([])
      setBulkCategory('')
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bulk category update failed')
    }
  }

  const requestBulkDelete = () => {
    if (selectedIds.length === 0) return
    setGalleryDeleteConfirm({ type: 'bulk', ids: [...selectedIds] })
  }

  const requestDelete = (image: EventGalleryImage) => {
    setGalleryDeleteConfirm({
      type: 'single',
      id: image.id,
      title: image.title || image.original_filename || 'Untitled image',
    })
  }

  const handleConfirmGalleryDelete = () => {
    const pendingDelete = galleryDeleteConfirm
    if (!pendingDelete) return

    setGalleryDeleteConfirm(null)
    if (pendingDelete.type === 'bulk') {
      void handleBulkDelete(pendingDelete.ids)
      return
    }

    void handleDelete(pendingDelete.id)
  }

  const handleBulkDelete = async (idsToDelete: number[]) => {
    if (idsToDelete.length === 0) return
    setError('')
    const previousImages = galleryImages
    const previousTotal = total

    setGalleryImages((current) => current.filter((image) => !idsToDelete.includes(image.id)))
    setTotal((current) => Math.max(0, current - idsToDelete.length))
    setSelectedIds([])
    try {
      await api.admin.bulkDeleteEventGalleryImages(eventId, idsToDelete)
    } catch (err) {
      setGalleryImages(previousImages)
      setTotal(previousTotal)
      setSelectedIds(idsToDelete)
      setError(err instanceof Error ? err.message : 'Bulk delete failed')
      return
    }

    try {
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? `Deleted, but failed to refresh gallery: ${err.message}`
          : 'Deleted, but failed to refresh gallery'
      )
    }
  }

  const handleDelete = async (id: number) => {
    setError('')
    const previousImages = galleryImages
    const previousTotal = total
    const previousSelectedIds = selectedIds
    const previousEditing = editing
    const previousPendingFile = pendingFile

    setGalleryImages((current) => current.filter((image) => image.id !== id))
    setTotal((current) => Math.max(0, current - 1))
    setSelectedIds((current) => current.filter((selectedId) => selectedId !== id))
    if (editing === id) {
      setEditing(null)
      setPendingFile(null)
    }

    try {
      await api.admin.deleteEventGalleryImage(eventId, id)
    } catch (err) {
      setGalleryImages(previousImages)
      setTotal(previousTotal)
      setSelectedIds(previousSelectedIds)
      setEditing(previousEditing)
      setPendingFile(previousPendingFile)
      setError(err instanceof Error ? err.message : 'Failed to delete gallery image')
      return
    }

    try {
      await load()
    } catch (err) {
      setError(
        err instanceof Error
          ? `Deleted, but failed to refresh gallery: ${err.message}`
          : 'Deleted, but failed to refresh gallery'
      )
    }
  }

  return (
    <>
      <div
        className={`relative border transition-colors ${dragActive ? 'border-gold/60 bg-gold/5' : 'border-white/5'}`}
        onDragEnter={handleGalleryDragEnter}
        onDragOver={handleGalleryDragOver}
        onDragLeave={handleGalleryDragLeave}
        onDrop={handleGalleryDrop}
      >
        {dragActive && (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center border-2 border-dashed border-gold/70 bg-navy-950/70">
            <div className="bg-navy-900 border border-gold/30 px-5 py-3 text-sm font-medium text-gold">
              Drop photos to upload
            </div>
          </div>
        )}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-2 text-sm font-medium text-text-primary">
              <ImageIcon className="w-4 h-4 text-text-muted" />
              Event Gallery ({total})
            </span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value)
                setPage(1)
              }}
              className="bg-white/[0.03] border border-white/10 px-2 py-1 text-xs text-text-secondary focus:border-gold/40 focus:outline-none"
              aria-label="Filter gallery by album or category"
            >
              <option value={GALLERY_CATEGORY_ALL}>All albums/categories</option>
              {uncategorizedCount > 0 && (
                <option value={GALLERY_CATEGORY_UNCATEGORIZED}>Uncategorized ({uncategorizedCount})</option>
              )}
              {categoryOptions
                .filter((category) => category.count > 0)
                .map((category) => (
                  <option key={category.name} value={category.name}>
                    {category.name} ({category.count})
                  </option>
                ))}
            </select>
            {galleryImages.length > 0 && (
              <button
                onClick={toggleVisibleSelection}
                className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs transition-colors ${allVisibleSelected ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/10 text-text-muted hover:border-gold/30 hover:text-gold'}`}
              >
                {allVisibleSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                {allVisibleSelected ? 'Clear visible' : 'Select all visible'}
              </button>
            )}
          </div>
          {editing === null && (
            <button
              onClick={() => {
                resetForm()
                setEditing('new')
              }}
              className="flex items-center gap-1.5 text-xs text-gold hover:text-gold/80"
            >
              <Plus className="w-3 h-3" /> Add
            </button>
          )}
        </div>

        {error && (
          <div className="mx-4 mb-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2">{error}</div>
        )}
        {success && (
          <div className="mx-4 mb-2 text-sm text-green-400 bg-green-500/10 border border-green-500/20 px-3 py-2">
            {success}
          </div>
        )}
        {uncategorizedCount > 0 && (
          <div className="mx-4 mb-3 flex flex-col gap-2 border border-gold/15 bg-gold/[0.04] px-3 py-2 text-sm text-text-secondary sm:flex-row sm:items-center sm:justify-between">
            <span>
              {uncategorizedCount} photo{uncategorizedCount === 1 ? '' : 's'} do not have an album/category yet.
            </span>
            <button
              onClick={() => {
                setCategoryFilter(GALLERY_CATEGORY_UNCATEGORIZED)
                setPage(1)
              }}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gold hover:text-gold-400"
            >
              <Tags className="w-3 h-3" /> Review uncategorized
            </button>
          </div>
        )}

        <div className="mx-4 mb-4 grid gap-3 lg:grid-cols-[1fr_280px]">
          <div
            className={`border border-dashed p-5 transition-colors ${dragActive ? 'border-gold bg-gold/10' : 'border-white/10 bg-white/[0.02]'}`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-11 h-11 bg-gold/10 text-gold flex items-center justify-center shrink-0">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary">Bulk upload tournament photos</div>
                <div className="text-xs text-text-muted mt-1">
                  Pick an album/category, then drop a folder selection or choose many images. Uploads continue while you
                  move around admin.
                </div>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gold text-navy-900 text-xs font-heading font-semibold uppercase tracking-wider hover:bg-gold-400"
              >
                <Upload className="w-3.5 h-3.5" /> Choose Photos
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={GALLERY_IMAGE_ACCEPT}
              multiple
              onChange={(e) => {
                if (e.target.files) void handleFiles(e.target.files)
              }}
              className="hidden"
            />
          </div>
          <div className="border border-white/5 bg-white/[0.01] p-3 space-y-3">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={uploadActive}
                onChange={(e) => setUploadActive(e.target.checked)}
                className="accent-gold"
              />
              Active after upload
            </label>
            <div>
              <label
                className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1"
                htmlFor="eventgallerysection-field-1"
              >
                Default Caption
              </label>
              <input
                id="eventgallerysection-field-1"
                value={uploadCaption}
                onChange={(e) => setUploadCaption(e.target.value)}
                placeholder="Optional shared caption"
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
              />
            </div>
            <GalleryCategoryPicker
              label="Album / Category"
              value={uploadCategory}
              onChange={(category) => {
                uploadCategoryTouchedRef.current = true
                setUploadCategory(category)
              }}
              categoryOptions={categoryOptions}
              emptyLabel="Upload without an album"
              helpText="Every photo in this upload will be assigned to this album/category. You can move them later."
            />
          </div>
        </div>
        {loading ? (
          <div className="p-4 text-center">
            <Loader2 className="w-4 h-4 animate-spin mx-auto text-text-muted" />
          </div>
        ) : (
          <div className="border-t border-white/5">
            {galleryImages.length > 0 && (
              <div className="flex flex-col gap-2 border-b border-white/5 bg-white/[0.015] px-4 py-3 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
                <span>
                  Showing {pageStart}-{pageEnd} of {total}
                  {categoryFilter !== GALLERY_CATEGORY_ALL ? ` in ${activeCategoryLabel}` : ''}
                </span>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="border border-white/10 px-3 py-1.5 text-text-secondary hover:border-gold/30 hover:text-gold disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-text-secondary"
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {totalPages}
                    </span>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="border border-white/10 px-3 py-1.5 text-text-secondary hover:border-gold/30 hover:text-gold disabled:opacity-40 disabled:hover:border-white/10 disabled:hover:text-text-secondary"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}
            {selectedIds.length > 0 && (
              <div className="p-3 border-b border-white/5 bg-white/[0.02] flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-text-secondary">{selectedIds.length} selected</div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="grid w-full gap-2 sm:w-auto sm:min-w-72 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <GalleryCategoryPicker
                      label="Move selected to"
                      value={bulkCategory}
                      onChange={setBulkCategory}
                      categoryOptions={categoryOptions}
                      emptyLabel="Choose album/category"
                      compact
                    />
                    <button
                      onClick={() => void handleBulkCategory()}
                      disabled={!bulkCategory.trim()}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-gold bg-gold/10 hover:bg-gold/15 disabled:opacity-40"
                    >
                      <Tags className="w-3 h-3" /> Move
                    </button>
                    <button
                      onClick={() => void handleBulkCategory('')}
                      className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-text-muted bg-white/5 hover:text-text-primary"
                    >
                      <X className="w-3 h-3" /> Clear album
                    </button>
                  </div>
                  <button
                    onClick={() => void handleBulkActive(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-green-400 bg-green-500/10 hover:bg-green-500/15"
                  >
                    <Eye className="w-3 h-3" /> Show
                  </button>
                  <button
                    onClick={() => void handleBulkActive(false)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-text-muted bg-white/5 hover:text-text-primary"
                  >
                    <EyeOff className="w-3 h-3" /> Hide
                  </button>
                  <button
                    onClick={requestBulkDelete}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/15"
                  >
                    <Trash2 className="w-3 h-3" /> Delete
                  </button>
                </div>
              </div>
            )}
            {galleryImages.length > 0 && (
              <div className="grid grid-cols-1 gap-3 border-b border-white/5 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {galleryImages.map((image, index) => {
                  const previewUrl = resolveMediaUrl(image.thumbnail_url)

                  return (
                    <div
                      key={image.id}
                      className={`relative border bg-white/[0.01] transition-colors ${selectedIds.includes(image.id) ? 'border-gold/70 bg-gold/[0.04]' : 'border-white/5'}`}
                    >
                      <button
                        onClick={() => toggleSelected(image.id)}
                        className={`absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center border shadow-lg transition-colors ${selectedIds.includes(image.id) ? 'border-gold bg-gold text-navy-950' : 'border-white/30 bg-navy-950/80 text-white/70 hover:border-gold/70 hover:text-gold'}`}
                        aria-label={selectedIds.includes(image.id) ? 'Deselect image' : 'Select image'}
                      >
                        {selectedIds.includes(image.id) ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                      <div className="aspect-[16/9] bg-white/[0.02] overflow-hidden">
                        {previewUrl ? (
                          <ImageWithShimmer
                            src={previewUrl}
                            alt={image.alt_text || image.title || 'Gallery image'}
                            loading={index < GALLERY_ADMIN_EAGER_IMAGE_COUNT ? 'eager' : 'lazy'}
                            decoding="async"
                            fetchPriority={index < GALLERY_ADMIN_EAGER_IMAGE_COUNT ? 'high' : 'auto'}
                            sizes="(min-width: 1536px) 23vw, (min-width: 1280px) 31vw, (min-width: 640px) 48vw, 100vw"
                            lazyRootMargin="900px 0px"
                            className="w-full h-full object-cover"
                            placeholderClassName="flex items-center justify-center"
                            placeholderContent={<ImageIcon className="w-6 h-6 text-text-muted/40" />}
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <ImageIcon className="w-6 h-6 text-text-muted/40" />
                            {image.status !== 'ready' && (
                              <span className="text-xs text-text-muted">Processing preview</span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="p-3 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm text-text-primary font-medium truncate">
                            {image.title || 'Untitled image'}
                          </div>
                          <div className="text-xs text-text-muted truncate">
                            Sort #{image.sort_order} · {image.status}
                            {image.category ? ` · ${image.category}` : ''}
                            {image.caption ? ` · ${image.caption}` : ''}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span
                            className={`text-xs px-1.5 py-0.5 ${image.active ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-muted'}`}
                          >
                            {image.active ? 'Active' : 'Hidden'}
                          </span>
                          <button
                            aria-label={`Edit photo details: ${image.title || `Photo ${image.id}`}`}
                            onClick={() => editGalleryImage(image)}
                            className="p-1 text-text-muted hover:text-text-primary"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => requestDelete(image)}
                            className="p-1 text-text-muted hover:text-red-400"
                            aria-label="Delete gallery image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {galleryImages.length === 0 && editing === null && (
              <div className="p-4 text-center text-text-muted text-xs">
                {categoryFilter === GALLERY_CATEGORY_ALL
                  ? 'No gallery images yet.'
                  : `No photos in ${activeCategoryLabel}.`}
              </div>
            )}
            {totalPages > 1 && (
              <div className="p-4 flex items-center justify-center gap-2 border-t border-white/5">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 text-xs text-text-secondary bg-white/5 disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="text-xs text-text-muted">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 text-xs text-text-secondary bg-white/5 disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <AnimatePresence>
        {editing !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
            onClick={closeEditor}
          >
            <motion.div
              initial={{ y: 24, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 24, opacity: 0 }}
              className="flex max-h-[92vh] w-full flex-col border border-white/10 bg-navy-900 shadow-xl sm:max-w-3xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold text-text-primary">
                    {editing === 'new' ? 'Add gallery photo' : 'Edit gallery photo'}
                  </h3>
                  {editingImage && (
                    <p className="mt-0.5 truncate text-xs text-text-muted">
                      {editingImage.original_filename || editingImage.title || `Photo #${editingImage.id}`}
                    </p>
                  )}
                </div>
                <button
                  onClick={closeEditor}
                  className="shrink-0 p-1.5 text-text-muted hover:text-text-primary"
                  aria-label="Close editor"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="overflow-y-auto p-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-[240px_1fr]">
                  <div className="space-y-3">
                    <div className="aspect-[4/3] overflow-hidden border border-white/10 bg-white/[0.02]">
                      {editingImage && editingImage.thumbnail_url ? (
                        <ImageWithShimmer
                          src={resolveMediaUrl(editingImage.thumbnail_url) || ''}
                          alt={editingImage.alt_text || editingImage.title || 'Gallery image'}
                          loading="eager"
                          decoding="async"
                          className="h-full w-full object-cover"
                          placeholderClassName="flex items-center justify-center"
                          placeholderContent={<ImageIcon className="h-7 w-7 text-text-muted/40" />}
                        />
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-text-muted">
                          <ImageIcon className="h-7 w-7 opacity-40" />
                          <span className="text-xs">{editing === 'new' ? 'New photo' : 'Preview unavailable'}</span>
                        </div>
                      )}
                    </div>
                    <label className="flex items-center gap-2 text-sm text-text-secondary">
                      <input
                        type="checkbox"
                        checked={form.active}
                        onChange={(e) => setForm((p) => ({ ...p, active: e.target.checked }))}
                        className="accent-gold"
                      />
                      Active
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div>
                      <label
                        className="block text-xs font-medium uppercase tracking-wide text-text-secondary mb-1"
                        htmlFor="eventgallerysection-field-2"
                      >
                        Title
                      </label>
                      <input
                        id="eventgallerysection-field-2"
                        value={form.title}
                        onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                        className="w-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-medium uppercase tracking-wide text-text-secondary mb-1"
                        htmlFor="eventgallerysection-field-3"
                      >
                        Alt Text
                      </label>
                      <input
                        id="eventgallerysection-field-3"
                        value={form.alt_text}
                        onChange={(e) => setForm((p) => ({ ...p, alt_text: e.target.value }))}
                        placeholder="Describe the image"
                        className="w-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        className="block text-xs font-medium uppercase tracking-wide text-text-secondary mb-1"
                        htmlFor="eventgallerysection-field-4"
                      >
                        Caption
                      </label>
                      <input
                        id="eventgallerysection-field-4"
                        value={form.caption}
                        onChange={(e) => setForm((p) => ({ ...p, caption: e.target.value }))}
                        className="w-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <GalleryCategoryPicker
                      label="Album / Category"
                      value={form.category}
                      onChange={(category) => setForm((p) => ({ ...p, category }))}
                      categoryOptions={categoryOptions}
                      emptyLabel="No album / category"
                    />
                    <div>
                      <label
                        className="block text-xs font-medium uppercase tracking-wide text-text-secondary mb-1"
                        htmlFor="eventgallerysection-field-5"
                      >
                        Sort Order
                      </label>
                      <input
                        id="eventgallerysection-field-5"
                        type="number"
                        value={form.sort_order}
                        onChange={(e) => setForm((p) => ({ ...p, sort_order: parseInt(e.target.value, 10) || 0 }))}
                        className="w-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-text-secondary mb-1">
                        {editing === 'new' ? 'Image File *' : 'Replace Image'}
                      </label>
                      <input
                        type="file"
                        accept={GALLERY_IMAGE_ACCEPT}
                        onChange={(e) => {
                          const file = e.target.files?.[0] || null
                          if (file && !isSupportedGalleryImage(file)) {
                            setError(
                              `Choose a ${GALLERY_IMAGE_TYPE_LABEL} image under ${Math.round(GALLERY_IMAGE_MAX_BYTES / 1024 / 1024)} MB`
                            )
                            setPendingFile(null)
                            e.target.value = ''
                            return
                          }
                          setPendingFile(file)
                        }}
                        className="w-full border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-text-primary file:mr-3 file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gold"
                      />
                      {pendingFile && <div className="mt-1 text-xs text-text-muted">{pendingFile.name}</div>}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-white/10 px-4 py-3">
                <button onClick={closeEditor} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || (editing === 'new' && !pendingFile)}
                  className="inline-flex items-center gap-1.5 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/15 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {galleryDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            onClick={() => setGalleryDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="w-full max-w-sm border border-white/10 bg-navy-900 p-5 shadow-xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center bg-red-500/10 text-red-400">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-center text-lg font-semibold text-text-primary">
                {galleryDeleteConfirm.type === 'bulk'
                  ? `Delete ${galleryDeleteConfirm.ids.length} photos?`
                  : 'Delete this photo?'}
              </h3>
              <p className="mt-2 text-center text-sm text-text-secondary">
                {galleryDeleteConfirm.type === 'bulk'
                  ? 'These gallery photos will be removed from the event and public gallery.'
                  : `"${galleryDeleteConfirm.title}" will be removed from the event and public gallery.`}
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  onClick={() => setGalleryDeleteConfirm(null)}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmGalleryDelete}
                  className="px-4 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

function GalleryCategoryPicker({
  label,
  value,
  onChange,
  categoryOptions,
  emptyLabel = 'No album / category',
  helpText,
  compact = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  categoryOptions: { name: string; count: number }[]
  emptyLabel?: string
  helpText?: string
  compact?: boolean
}) {
  const [creating, setCreating] = useState(false)
  const pickerId = useId()
  const selectId = `${pickerId}-select`
  const customInputId = `${pickerId}-custom`
  const helpId = helpText ? `${pickerId}-help` : undefined
  const knownNames = useMemo(() => new Set(categoryOptions.map((category) => category.name)), [categoryOptions])
  const trimmedValue = value.trim()
  const isKnownValue = trimmedValue === '' || knownNames.has(trimmedValue)
  const showingCustomInput = creating || !isKnownValue
  const selectValue = showingCustomInput ? GALLERY_CATEGORY_CREATE : trimmedValue
  const inputClass = compact
    ? 'w-full bg-white/[0.03] border border-white/10 px-2 py-1.5 text-xs text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none'
    : 'w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none'

  useEffect(() => {
    if (trimmedValue && knownNames.has(trimmedValue)) setCreating(false)
  }, [knownNames, trimmedValue])

  return (
    <div>
      <label htmlFor={selectId} className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1">
        {label}
      </label>
      <select
        id={selectId}
        value={selectValue}
        onChange={(event) => {
          const nextValue = event.target.value
          if (nextValue === GALLERY_CATEGORY_CREATE) {
            setCreating(true)
            if (isKnownValue) onChange('')
            return
          }
          setCreating(false)
          onChange(nextValue)
        }}
        aria-describedby={helpId}
        className={inputClass}
      >
        <option value="">{emptyLabel}</option>
        {categoryOptions.map((category) => (
          <option key={category.name} value={category.name}>
            {category.name}
            {category.count > 0 ? ` (${category.count})` : ' — default'}
          </option>
        ))}
        <option value={GALLERY_CATEGORY_CREATE}>Create new album/category...</option>
      </select>
      {showingCustomInput && (
        <input
          id={customInputId}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          maxLength={80}
          aria-label={`Custom ${label}`}
          aria-describedby={helpId}
          placeholder="e.g. Taiwan Podium"
          className={`${inputClass} mt-2`}
        />
      )}
      {showingCustomInput && trimmedValue && (
        <p className="mt-1 text-[11px] text-gold-400/80">
          New album/category will be created when photos are saved or uploaded.
        </p>
      )}
      {helpText && (
        <p id={helpId} className="mt-1 text-[11px] text-text-muted">
          {helpText}
        </p>
      )}
    </div>
  )
}

const GALLERY_CATEGORY_ALL = '__all__'
const GALLERY_CATEGORY_UNCATEGORIZED = '__uncategorized__'
const GALLERY_CATEGORY_CREATE = '__create_category__'
