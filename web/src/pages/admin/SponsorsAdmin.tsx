import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Handshake, Plus, Pencil, Trash2, X, Loader2, Save, ChevronUp, ChevronDown, GripVertical, Eye, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Sponsor, SponsorFormData } from '../../services/api'
import { getSponsorLogo, resolveMediaUrl } from '../../utils/images'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useEditingParam } from '../../hooks/useEditingParam'

const TIERS = ['presenting', 'partner', 'official', 'title', 'gold', 'silver', 'bronze', 'supporting'] as const
const TIER_COLORS: Record<string, string> = {
  presenting: 'text-gold',
  partner: 'text-blue-400',
  official: 'text-green-400',
  title: 'text-gold',
  gold: 'text-yellow-400',
  silver: 'text-gray-300',
  bronze: 'text-orange-400',
  supporting: 'text-text-muted',
}

const emptyForm: SponsorFormData = { name: '', tier: 'official', website_url: '', sort_order: 0 }

interface SortableSponsorRowProps {
  sponsor: Sponsor
  idx: number
  total: number
  onMove: (sponsor: Sponsor, direction: 'up' | 'down') => void
  onEdit: (sponsor: Sponsor) => void
  onDelete: (id: number) => void
}

function SortableSponsorRow({ sponsor, idx, total, onMove, onEdit, onDelete }: SortableSponsorRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sponsor.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  }

  const logoSrc = getSponsorLogo(sponsor.name, sponsor.logo_url)

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`px-5 py-3 flex items-center justify-between border-b border-white/5 last:border-b-0 ${
        isDragging ? 'bg-gold/5 shadow-lg shadow-gold/10 ring-1 ring-gold/20' : 'bg-transparent'
      }`}
    >
      <div className="flex items-center gap-3">
        {/* Drag handle — desktop: visible grip, mobile: up/down arrows */}
        <div className="flex flex-col items-center gap-0.5 mr-1">
          {/* Desktop: drag grip handle */}
          <div
            {...attributes}
            {...listeners}
            className="hidden sm:flex cursor-grab active:cursor-grabbing p-1 text-text-muted hover:text-gold transition-colors touch-none"
            title="Drag to reorder"
          >
            <GripVertical className="w-4 h-4" />
          </div>
          {/* Mobile: up/down arrows */}
          <div className="flex sm:hidden flex-col items-center gap-0.5">
            <button
              onClick={() => onMove(sponsor, 'up')}
              disabled={idx === 0}
              className="p-0.5 text-text-muted hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
            <div
              {...attributes}
              {...listeners}
              className="cursor-grab active:cursor-grabbing text-white/10 touch-none"
            >
              <GripVertical className="w-3 h-3" />
            </div>
            <button
              onClick={() => onMove(sponsor, 'down')}
              disabled={idx === total - 1}
              className="p-0.5 text-text-muted hover:text-gold disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
        {logoSrc ? (
          <img src={logoSrc} alt={sponsor.name} className="w-8 h-8 object-contain" />
        ) : (
          <div className="w-8 h-8 bg-white/5 flex items-center justify-center">
            <Handshake className="w-4 h-4 text-text-muted" />
          </div>
        )}
        <div>
          <div className="text-sm text-text-primary font-medium">{sponsor.name}</div>
          {sponsor.website_url && (
            <div className="text-xs text-text-muted">{sponsor.website_url}</div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onEdit(sponsor)}
          className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDelete(sponsor.id)}
          className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default function SponsorsAdmin() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useEditingParam()

  const [form, setForm] = useState<SponsorFormData>(emptyForm)
  const [pendingLogo, setPendingLogo] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const load = useCallback(async () => {
    try {
      const res = await api.admin.getSponsors()
      setSponsors(res.sponsors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (typeof editing === 'number' && sponsors.length > 0) {
      const sponsor = sponsors.find(s => s.id === editing)
      if (sponsor) {
        setForm({
          name: sponsor.name,
          tier: sponsor.tier,
          website_url: sponsor.website_url || '',
          sort_order: sponsor.sort_order || 0,
        })
      }
    }
  }, [editing, sponsors])

  const nextSortOrder = () => {
    if (sponsors.length === 0) return 1
    return Math.max(...sponsors.map(s => s.sort_order || 0)) + 1
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        const res = await api.admin.createSponsor(form)
        if (pendingLogo && res.sponsor?.id) {
          await api.admin.uploadSponsorLogo(res.sponsor.id, pendingLogo)
        }
        setSuccess('Sponsor created')
        setPendingLogo(null)
        await load()
        if (res.sponsor?.id) {
          setEditing(res.sponsor.id)
        }
      } else if (typeof editing === 'number') {
        await api.admin.updateSponsor(editing, form)
        setSuccess('Sponsor updated')
        await load()
      }
      setPendingLogo(null)
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.admin.deleteSponsor(id)
      setDeleteConfirm(null)
      setSuccess('Sponsor deleted')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleLogoUpload = async (file: File) => {
    if (editing === 'new') {
      setPendingLogo(file)
      return
    }
    if (typeof editing !== 'number') return
    try {
      await api.admin.uploadSponsorLogo(editing, file)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Logo upload failed')
    }
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleLogoUpload(file)
    if (logoInputRef.current) logoInputRef.current.value = ''
  }

  const previewLogoUrl = useMemo(
    () => (pendingLogo ? URL.createObjectURL(pendingLogo) : null),
    [pendingLogo]
  )

  useEffect(() => {
    return () => {
      if (previewLogoUrl?.startsWith('blob:')) URL.revokeObjectURL(previewLogoUrl)
    }
  }, [previewLogoUrl])

  const getPreviewLogoUrl = (): string | null => {
    if (previewLogoUrl) return previewLogoUrl
    if (typeof editing === 'number') {
      return resolveMediaUrl(currentSponsor?.logo_url) || getSponsorLogo(form.name)
    }
    return getSponsorLogo(form.name)
  }

  const handleMove = async (sponsor: Sponsor, direction: 'up' | 'down') => {
    const sameTier = sponsors
      .filter(s => s.tier === sponsor.tier)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    const idx = sameTier.findIndex(s => s.id === sponsor.id)
    if (idx < 0) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sameTier.length) return

    const other = sameTier[swapIdx]
    const myOrder = sponsor.sort_order || 0
    const otherOrder = other.sort_order || 0

    try {
      await Promise.all([
        api.admin.updateSponsor(sponsor.id, { sort_order: otherOrder }),
        api.admin.updateSponsor(other.id, { sort_order: myOrder }),
      ])
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Move failed')
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = active.id as number
    const overId = over.id as number
    const activeSponsor = sponsors.find(s => s.id === activeId)
    const overSponsor = sponsors.find(s => s.id === overId)
    if (!activeSponsor || !overSponsor) return
    if (activeSponsor.tier !== overSponsor.tier) return

    const sameTier = sponsors
      .filter(s => s.tier === activeSponsor.tier)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

    const oldIndex = sameTier.findIndex(s => s.id === activeId)
    const newIndex = sameTier.findIndex(s => s.id === overId)
    if (oldIndex === newIndex) return

    const reordered = [...sameTier]
    const [moved] = reordered.splice(oldIndex, 1)
    reordered.splice(newIndex, 0, moved)

    // Optimistic update
    const updatedSponsors = sponsors.map(s => {
      const reorderedIdx = reordered.findIndex(r => r.id === s.id)
      if (reorderedIdx >= 0) return { ...s, sort_order: reorderedIdx + 1 }
      return s
    })
    setSponsors(updatedSponsors)

    try {
      await Promise.all(
        reordered.map((s, i) =>
          api.admin.updateSponsor(s.id, { sort_order: i + 1 })
        )
      )
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reorder failed')
      await load()
    }
  }

  const currentSponsor = typeof editing === 'number' ? sponsors.find(s => s.id === editing) : null

  const sponsorsByTier = TIERS.map(tier => ({
    tier,
    sponsors: sponsors.filter(s => s.tier === tier).sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)),
  })).filter(g => g.sponsors.length > 0)

  const handleEditSponsor = (sponsor: Sponsor) => {
    setForm({
      name: sponsor.name,
      tier: sponsor.tier,
      website_url: sponsor.website_url || '',
      sort_order: sponsor.sort_order || 0,
    })
    setEditing(sponsor.id)
    setError('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Handshake className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Sponsors</h1>
        </div>
        {!editing && (
          <button
            onClick={() => { setForm({ ...emptyForm, sort_order: nextSortOrder() }); setPendingLogo(null); setEditing('new'); setError('') }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Sponsor
          </button>
        )}
      </div>

      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm"
          >{success}</motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
          >{error}</motion.div>
        )}
      </AnimatePresence>

      {editing !== null ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-white/5">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-text-primary">
              {editing === 'new' ? 'New Sponsor' : 'Edit Sponsor'}
            </h2>
            <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Name</label>
                <input
                  value={form.name}
                  onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Tier</label>
                <select
                  value={form.tier}
                  onChange={e => setForm(prev => ({ ...prev, tier: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                >
                  {TIERS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Website URL</label>
                <input
                  value={form.website_url}
                  onChange={e => setForm(prev => ({ ...prev, website_url: e.target.value }))}
                  placeholder="https://"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Sort Order</label>
                <input
                  type="number"
                  value={form.sort_order}
                  onChange={e => setForm(prev => ({ ...prev, sort_order: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Compact logo upload + inline preview */}
            <div className="flex items-center gap-4">
              <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoFileChange} className="hidden" />
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 border border-dashed border-white/15 hover:border-gold/40 text-text-secondary hover:text-gold text-sm transition-colors"
              >
                <Upload className="w-4 h-4" />
                {getPreviewLogoUrl() ? 'Change Logo' : 'Upload Logo'}
              </button>
              {getPreviewLogoUrl() && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/95 rounded flex items-center justify-center p-1">
                    <img src={getPreviewLogoUrl()!} alt="" className="max-w-full max-h-full object-contain" />
                  </div>
                  <span className="text-xs text-green-400">Logo ready</span>
                  {pendingLogo && (
                    <button
                      type="button"
                      onClick={() => setPendingLogo(null)}
                      className="text-text-muted hover:text-red-400 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Site Preview */}
            {(() => {
              const previewLogoUrl = getPreviewLogoUrl()

              return previewLogoUrl ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-text-muted" />
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Site Preview</label>
                    <span className="text-[10px] text-text-muted/50">— exactly how it appears on the live site</span>
                  </div>
                  <div className="border border-white/10 rounded overflow-hidden">
                    <div className="px-6 py-5 bg-navy-900/80">
                      <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.2em] text-text-muted text-center mb-4">
                        Homepage
                      </p>
                      <div className="flex justify-center">
                        <div className="bg-navy-900/80 border border-white/5 hover:border-gold-500/20 rounded-lg p-5 flex flex-col items-center justify-center w-48 h-36 transition-colors">
                          <div className="bg-white/95 rounded-md px-4 py-3 flex items-center justify-center w-full h-full">
                            <img
                              src={previewLogoUrl}
                              alt={form.name || 'Logo preview'}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-text-muted font-medium truncate w-full text-center">
                            {form.name || 'Sponsor Name'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="px-6 py-5 bg-[#0a1628]/80 border-t border-white/5">
                      <p className="text-[10px] font-heading font-semibold uppercase tracking-[0.2em] text-text-muted text-center mb-4">
                        Event Pages
                      </p>
                      <div className="flex justify-center">
                        <div className="opacity-60 hover:opacity-100 transition-opacity duration-300 cursor-default">
                          <img
                            src={previewLogoUrl}
                            alt={form.name || 'Logo preview'}
                            className="h-12 object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] text-text-muted/50 text-center">
                    For best results, use a transparent PNG with a clear background.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-text-muted" />
                    <label className="text-xs font-medium text-text-secondary uppercase tracking-wide">Site Preview</label>
                  </div>
                  <div className="border border-dashed border-white/10 rounded p-6 text-center text-text-muted text-xs">
                    Upload a logo to see how it will look on the site
                  </div>
                </div>
              )
            })()}

            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(null); setError('') }} className="px-5 py-2.5 text-text-muted text-sm hover:text-text-primary">
                Cancel
              </button>
            </div>
          </div>
        </motion.div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <div className="space-y-6">
            {sponsorsByTier.length === 0 ? (
              <div className="bg-surface border border-white/5 p-8 text-center text-text-muted text-sm">
                No sponsors yet. Add your first sponsor.
              </div>
            ) : (
              sponsorsByTier.map(({ tier, sponsors: tierSponsors }) => (
                <div key={tier} className="bg-surface border border-white/5">
                  <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
                    <h3 className={`font-heading text-sm font-semibold uppercase tracking-wide ${TIER_COLORS[tier]}`}>
                      {tier}
                    </h3>
                    <span className="text-[10px] text-text-muted/40 hidden sm:inline">drag to reorder</span>
                  </div>
                  <SortableContext items={tierSponsors.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <div>
                      {tierSponsors.map((sponsor, idx) => (
                        <SortableSponsorRow
                          key={sponsor.id}
                          sponsor={sponsor}
                          idx={idx}
                          total={tierSponsors.length}
                          onMove={handleMove}
                          onEdit={handleEditSponsor}
                          onDelete={setDeleteConfirm}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </div>
              ))
            )}
          </div>
        </DndContext>
      )}

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="bg-surface border border-white/10 p-6 max-w-sm w-full mx-4"
            >
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Delete Sponsor</h3>
              <p className="text-sm text-text-secondary mb-5">Are you sure? This action cannot be undone.</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">Cancel</button>
                <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
