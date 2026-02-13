import { useEffect, useState, useCallback } from 'react'
import { Play, Plus, Pencil, Trash2, X, Loader2, Save, Star } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Video, VideoFormData, Event } from '../../services/api'

const BELT_RANKS = ['white', 'blue', 'purple', 'brown', 'black'] as const
const CATEGORIES = ['gi', 'no-gi'] as const
const STATUSES = ['published', 'draft'] as const

const BELT_COLORS: Record<string, string> = {
  white: 'bg-white text-gray-900',
  blue: 'bg-blue-600 text-white',
  purple: 'bg-purple-600 text-white',
  brown: 'bg-amber-800 text-white',
  black: 'bg-gray-900 text-white border border-white/20',
}

const emptyForm: VideoFormData = {
  title: '', youtube_url: '', competitor_1_name: '', competitor_2_name: '',
  weight_class: '', belt_rank: '', round: '', result: '',
  duration_seconds: null, category: '', sort_order: 0, featured: false,
  status: 'published', event_id: null,
}

function getYouTubeId(url: string): string | null {
  if (!url) return null
  if (url.includes('youtu.be/')) return url.split('/').pop()?.split('?')[0] || null
  const match = url.match(/[?&]v=([^&]+)/)
  return match ? match[1] : null
}

export default function VideosAdmin() {
  const [videos, setVideos] = useState<Video[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<VideoFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  const load = useCallback(async () => {
    try {
      const [vRes, eRes] = await Promise.all([api.admin.getVideos(), api.admin.getEvents()])
      setVideos(vRes.videos)
      setEvents(eRes.events)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.admin.createVideo(form)
        setSuccess('Video created')
      } else if (typeof editing === 'number') {
        await api.admin.updateVideo(editing, form)
        setSuccess('Video updated')
      }
      setEditing(null)
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.admin.deleteVideo(id)
      setDeleteConfirm(null)
      setSuccess('Video deleted')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const youtubePreviewId = getYouTubeId(form.youtube_url)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Play className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Videos</h1>
          <span className="text-sm text-text-muted">({videos.length})</span>
        </div>
        {!editing && (
          <button
            onClick={() => { setForm(emptyForm); setEditing('new'); setError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Video
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
              {editing === 'new' ? 'New Video' : 'Edit Video'}
            </h2>
            <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Title</label>
              <input
                value={form.title}
                onChange={e => setForm(prev => ({ ...prev, title: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                placeholder="Match title..."
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">YouTube URL</label>
              <input
                value={form.youtube_url}
                onChange={e => setForm(prev => ({ ...prev, youtube_url: e.target.value }))}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {youtubePreviewId && (
                <div className="mt-2">
                  <img
                    src={`https://img.youtube.com/vi/${youtubePreviewId}/mqdefault.jpg`}
                    alt="YouTube thumbnail"
                    className="w-48 border border-white/10"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Competitor 1</label>
                <input
                  value={form.competitor_1_name}
                  onChange={e => setForm(prev => ({ ...prev, competitor_1_name: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Competitor 2</label>
                <input
                  value={form.competitor_2_name}
                  onChange={e => setForm(prev => ({ ...prev, competitor_2_name: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Event</label>
                <select
                  value={form.event_id ?? ''}
                  onChange={e => setForm(prev => ({ ...prev, event_id: e.target.value ? Number(e.target.value) : null }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                >
                  <option value="">No event</option>
                  {events.map(ev => <option key={ev.id} value={ev.id}>{ev.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Weight Class</label>
                <input
                  value={form.weight_class}
                  onChange={e => setForm(prev => ({ ...prev, weight_class: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  placeholder="e.g. Light, Heavy, Open Class"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Belt Rank</label>
                <select
                  value={form.belt_rank}
                  onChange={e => setForm(prev => ({ ...prev, belt_rank: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                >
                  <option value="">None</option>
                  {BELT_RANKS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Category</label>
                <select
                  value={form.category}
                  onChange={e => setForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                >
                  <option value="">None</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c === 'gi' ? 'Gi' : 'No-Gi'}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Round</label>
                <input
                  value={form.round}
                  onChange={e => setForm(prev => ({ ...prev, round: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  placeholder="e.g. Final, Semi-Final"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Result</label>
                <input
                  value={form.result}
                  onChange={e => setForm(prev => ({ ...prev, result: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
                  placeholder="e.g. Submission (armbar), Points (8-4)"
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
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Status</label>
                <select
                  value={form.status}
                  onChange={e => setForm(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={e => setForm(prev => ({ ...prev, featured: e.target.checked }))}
                  className="accent-gold-500"
                />
                <span className="text-sm text-text-secondary">Featured</span>
              </label>
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
          {videos.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">
              No videos yet. Add your first video.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {videos.map(video => (
                <div key={video.id} className="px-5 py-3 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {video.youtube_video_id ? (
                      <img
                        src={`https://img.youtube.com/vi/${video.youtube_video_id}/default.jpg`}
                        alt=""
                        className="w-16 h-12 object-cover shrink-0 border border-white/10"
                      />
                    ) : (
                      <div className="w-16 h-12 bg-white/5 flex items-center justify-center shrink-0">
                        <Play className="w-4 h-4 text-text-muted" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-text-primary font-medium truncate">{video.title}</span>
                        {video.featured && <Star className="w-3 h-3 text-gold shrink-0 fill-gold" />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-muted mt-0.5">
                        {video.belt_rank && (
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold uppercase ${BELT_COLORS[video.belt_rank] || ''}`}>
                            {video.belt_rank}
                          </span>
                        )}
                        {video.event_name && <span>{video.event_name}</span>}
                        {video.competitor_1_name && video.competitor_2_name && (
                          <span>{video.competitor_1_name} vs {video.competitor_2_name}</span>
                        )}
                        <span className={video.status === 'draft' ? 'text-yellow-400' : 'text-green-400'}>
                          {video.status}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => {
                        setForm({
                          title: video.title,
                          youtube_url: video.youtube_url,
                          competitor_1_name: video.competitor_1_name || '',
                          competitor_2_name: video.competitor_2_name || '',
                          weight_class: video.weight_class || '',
                          belt_rank: video.belt_rank || '',
                          round: video.round || '',
                          result: video.result || '',
                          duration_seconds: video.duration_seconds,
                          category: video.category || '',
                          sort_order: video.sort_order,
                          featured: video.featured,
                          status: video.status,
                          event_id: video.event_id,
                        })
                        setEditing(video.id)
                        setError('')
                      }}
                      className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(video.id)}
                      className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Delete Video</h3>
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
