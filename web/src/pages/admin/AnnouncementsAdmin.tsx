import { useEffect, useState, useCallback } from 'react'
import { Megaphone, Plus, Pencil, Trash2, X, Loader2, Save, ToggleLeft, ToggleRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Announcement, AnnouncementFormData } from '../../services/api'
import { useEditingParam } from '../../hooks/useEditingParam'
import ImageUpload from '../../components/ImageUpload'
import { resolveMediaUrl } from '../../utils/images'

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const TYPES = ['info', 'event', 'promo', 'urgent'] as const
const TYPE_LABELS: Record<string, string> = { info: 'Info', event: 'Event', promo: 'Promo', urgent: 'Urgent' }
const TYPE_COLORS: Record<string, string> = {
  info: 'text-blue-400 bg-blue-500/10',
  event: 'text-gold bg-gold/10',
  promo: 'text-green-400 bg-green-500/10',
  urgent: 'text-red-400 bg-red-500/10',
}

const emptyForm: AnnouncementFormData = {
  title: '',
  body: '',
  link_url: '',
  link_text: '',
  announcement_type: 'info',
  active: true,
  starts_at: '',
  ends_at: '',
}

function getStatus(a: Announcement): { label: string; className: string } {
  if (!a.active) return { label: 'Inactive', className: 'text-text-muted bg-white/5' }
  const now = new Date()
  if (a.starts_at && new Date(a.starts_at) > now) return { label: 'Scheduled', className: 'text-blue-400 bg-blue-500/10' }
  if (a.ends_at && new Date(a.ends_at) < now) return { label: 'Expired', className: 'text-orange-400 bg-orange-500/10' }
  return { label: 'Active', className: 'text-green-400 bg-green-500/10' }
}

export default function AnnouncementsAdmin() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useEditingParam()
  const [form, setForm] = useState<AnnouncementFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [pendingImage, setPendingImage] = useState<File | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await api.admin.getAnnouncements()
      setAnnouncements(res.announcements)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    setPendingImage(null)
    if (editing === 'new') {
      setForm({ ...emptyForm })
    } else if (typeof editing === 'number' && announcements.length > 0) {
      const ann = announcements.find(a => a.id === editing)
      if (ann) {
        setForm({
          title: ann.title,
          body: ann.body || '',
          link_url: ann.link_url || '',
          link_text: ann.link_text || '',
          announcement_type: ann.announcement_type,
          active: ann.active,
          starts_at: ann.starts_at ? toLocalDatetimeValue(ann.starts_at) : '',
          ends_at: ann.ends_at ? toLocalDatetimeValue(ann.ends_at) : '',
        })
      }
    }
  }, [editing, announcements])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        ...form,
        starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : '',
        ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : '',
      }
      let savedId: number | null = null
      if (editing === 'new') {
        const res = await api.admin.createAnnouncement(payload)
        savedId = res.announcement?.id ?? null
        if (savedId) setEditing(savedId)
        setSuccess('Announcement created')
      } else if (typeof editing === 'number') {
        savedId = editing
        await api.admin.updateAnnouncement(editing, payload)
        setSuccess('Announcement updated')
      }
      if (pendingImage && savedId) {
        await api.admin.uploadAnnouncementImage(savedId, pendingImage)
        setPendingImage(null)
      }
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    const prev = announcements
    setAnnouncements(a => a.filter(x => x.id !== id))
    setDeleteConfirm(null)
    if (editing === id) setEditing(null)
    setSuccess('Announcement deleted')
    setTimeout(() => setSuccess(''), 3000)
    try {
      await api.admin.deleteAnnouncement(id)
    } catch (err) {
      setAnnouncements(prev)
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleToggleActive = (ann: Announcement) => {
    const prev = announcements
    setAnnouncements(a => a.map(x => x.id === ann.id ? { ...x, active: !x.active } : x))
    api.admin.updateAnnouncement(ann.id, { active: !ann.active }).catch((err) => {
      setAnnouncements(prev)
      setError(err instanceof Error ? err.message : 'Toggle failed')
    })
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
          <Megaphone className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Announcements</h1>
        </div>
        {!editing && (
          <button
            onClick={() => { setForm({ ...emptyForm }); setEditing('new'); setError('') }}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Announcement
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
              {editing === 'new' ? 'New Announcement' : 'Edit Announcement'}
            </h2>
            <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Title</label>
                <input
                  value={form.title}
                  onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  placeholder="e.g. Koko Run coming up!"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Body (optional)</label>
                <textarea
                  value={form.body}
                  onChange={e => setForm(prev => ({ ...prev, body: e.target.value }))}
                  rows={2}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none resize-none"
                  placeholder="Additional details..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Link URL</label>
                <input
                  value={form.link_url}
                  onChange={e => setForm(prev => ({ ...prev, link_url: e.target.value }))}
                  placeholder="https://"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Link Text</label>
                <input
                  value={form.link_text}
                  onChange={e => setForm(prev => ({ ...prev, link_text: e.target.value }))}
                  placeholder="Learn more"
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Type</label>
                <select
                  value={form.announcement_type}
                  onChange={e => setForm(prev => ({ ...prev, announcement_type: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                >
                  {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Starts At</label>
                <input
                  type="datetime-local"
                  value={form.starts_at}
                  onChange={e => setForm(prev => ({ ...prev, starts_at: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Ends At</label>
                <input
                  type="datetime-local"
                  value={form.ends_at}
                  onChange={e => setForm(prev => ({ ...prev, ends_at: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                />
              </div>
            </div>

            {typeof editing === 'number' ? (
              <ImageUpload
                currentUrl={resolveMediaUrl(announcements.find(a => a.id === editing)?.image_url)}
                onUpload={async (file) => {
                  await api.admin.uploadAnnouncementImage(editing, file)
                  await load()
                }}
                label="Image (optional — adds a visual card to the announcement)"
              />
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide">
                  Image (optional — adds a visual card to the announcement)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={e => setPendingImage(e.target.files?.[0] || null)}
                    className="w-full bg-white/3 border border-white/10 px-3 py-2 text-sm text-text-primary file:mr-3 file:border-0 file:bg-gold/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-gold"
                  />
                  {pendingImage && (
                    <p className="text-xs text-text-muted mt-1">
                      {pendingImage.name} — will be uploaded when you save
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, active: !prev.active }))}
                className="flex items-center gap-2 text-sm"
              >
                {form.active ? (
                  <ToggleRight className="w-6 h-6 text-green-400" />
                ) : (
                  <ToggleLeft className="w-6 h-6 text-text-muted" />
                )}
                <span className={form.active ? 'text-green-400' : 'text-text-muted'}>
                  {form.active ? 'Active' : 'Inactive'}
                </span>
              </button>
            </div>

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
        <div className="bg-surface border border-white/5">
          {announcements.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No announcements yet. Add your first announcement.
            </div>
          ) : (
            announcements.map(ann => {
              const status = getStatus(ann)
              const typeColor = TYPE_COLORS[ann.announcement_type] || TYPE_COLORS.info

              return (
                <div key={ann.id} className="px-5 py-3 flex items-center justify-between border-b border-white/5 last:border-b-0">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <button
                      onClick={() => handleToggleActive(ann)}
                      className="shrink-0"
                      title={ann.active ? 'Deactivate' : 'Activate'}
                    >
                      {ann.active ? (
                        <ToggleRight className="w-5 h-5 text-green-400" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-text-muted" />
                      )}
                    </button>
                    {ann.image_url && (
                      <img
                        src={resolveMediaUrl(ann.image_url) || ''}
                        alt=""
                        className="w-10 h-10 object-cover rounded shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium truncate">{ann.title}</span>
                        <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 ${typeColor}`}>
                          {ann.announcement_type}
                        </span>
                        <span className={`text-[10px] font-medium uppercase px-1.5 py-0.5 ${status.className}`}>
                          {status.label}
                        </span>
                      </div>
                      {ann.body && (
                        <div className="text-xs text-text-muted truncate mt-0.5">{ann.body}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setForm({
                          title: ann.title,
                          body: ann.body || '',
                          link_url: ann.link_url || '',
                          link_text: ann.link_text || '',
                          announcement_type: ann.announcement_type,
                          active: ann.active,
                          starts_at: ann.starts_at ? toLocalDatetimeValue(ann.starts_at) : '',
                          ends_at: ann.ends_at ? toLocalDatetimeValue(ann.ends_at) : '',
                        })
                        setEditing(ann.id)
                        setError('')
                      }}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(ann.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

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
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Delete Announcement</h3>
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
