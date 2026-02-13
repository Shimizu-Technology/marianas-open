import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, Pencil, Trash2, X, Loader2, Save, Search } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Competitor, CompetitorFormData } from '../../services/api'
import ImageUpload from '../../components/ImageUpload'

const BELT_RANKS = ['white', 'blue', 'purple', 'brown', 'black'] as const
const WEIGHT_CLASSES = [
  'Rooster', 'Light Feather', 'Feather', 'Light', 'Middle',
  'Medium Heavy', 'Heavy', 'Super Heavy', 'Ultra Heavy', 'Open Class',
]

const BELT_COLORS: Record<string, string> = {
  white: 'text-white',
  blue: 'text-blue-400',
  purple: 'text-purple-400',
  brown: 'text-amber-600',
  black: 'text-gray-300',
}

const emptyForm: CompetitorFormData = {
  first_name: '', last_name: '', nickname: '', country_code: '', belt_rank: '',
  weight_class: '', academy: '', bio: '', instagram_url: '', youtube_url: '',
  wins: 0, losses: 0, draws: 0, gold_medals: 0, silver_medals: 0, bronze_medals: 0,
}

export default function CompetitorsAdmin() {
  const [competitors, setCompetitors] = useState<Competitor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<CompetitorFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await api.admin.getCompetitors()
      setCompetitors(res.competitors)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSave = async () => {
    setSaving(true); setError('')
    try {
      if (editing === 'new') {
        await api.admin.createCompetitor(form)
        setSuccess('Competitor created')
      } else if (typeof editing === 'number') {
        await api.admin.updateCompetitor(editing, form)
        setSuccess('Competitor updated')
      }
      setEditing(null); await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.admin.deleteCompetitor(id)
      setDeleteConfirm(null); setSuccess('Competitor deleted'); await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) { setError(err instanceof Error ? err.message : 'Delete failed') }
  }

  const handlePhotoUpload = async (file: File) => {
    if (typeof editing !== 'number') return
    await api.admin.uploadCompetitorPhoto(editing, file)
    await load()
  }

  const currentCompetitor = typeof editing === 'number' ? competitors.find(c => c.id === editing) : null

  const filtered = searchQuery
    ? competitors.filter(c => `${c.first_name} ${c.last_name} ${c.academy || ''}`.toLowerCase().includes(searchQuery.toLowerCase()))
    : competitors

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Competitors</h1>
          <span className="text-sm text-text-muted">({competitors.length})</span>
        </div>
        {!editing && (
          <button
            onClick={() => { setForm(emptyForm); setEditing('new'); setError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Competitor
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
              {editing === 'new' ? 'New Competitor' : 'Edit Competitor'}
            </h2>
            <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">First Name *</label>
                <input value={form.first_name} onChange={e => setForm(p => ({ ...p, first_name: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Last Name *</label>
                <input value={form.last_name} onChange={e => setForm(p => ({ ...p, last_name: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Nickname</label>
                <input value={form.nickname} onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Belt Rank</label>
                <select value={form.belt_rank} onChange={e => setForm(p => ({ ...p, belt_rank: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
                  <option value="">Select...</option>
                  {BELT_RANKS.map(b => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Weight Class</label>
                <select value={form.weight_class} onChange={e => setForm(p => ({ ...p, weight_class: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
                  <option value="">Select...</option>
                  {WEIGHT_CLASSES.map(w => <option key={w} value={w}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Country Code</label>
                <input value={form.country_code} onChange={e => setForm(p => ({ ...p, country_code: e.target.value.toUpperCase().slice(0, 2) }))}
                  placeholder="US, JP, KR..."
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Academy</label>
                <input value={form.academy} onChange={e => setForm(p => ({ ...p, academy: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Wins</label>
                  <input type="number" value={form.wins} onChange={e => setForm(p => ({ ...p, wins: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Losses</label>
                  <input type="number" value={form.losses} onChange={e => setForm(p => ({ ...p, losses: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Draws</label>
                  <input type="number" value={form.draws} onChange={e => setForm(p => ({ ...p, draws: parseInt(e.target.value) || 0 }))}
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Instagram URL</label>
                <input value={form.instagram_url} onChange={e => setForm(p => ({ ...p, instagram_url: e.target.value }))}
                  placeholder="https://instagram.com/..."
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">YouTube URL</label>
                <input value={form.youtube_url} onChange={e => setForm(p => ({ ...p, youtube_url: e.target.value }))}
                  placeholder="https://youtube.com/..."
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Gold Medals</label>
                <input type="number" value={form.gold_medals} onChange={e => setForm(p => ({ ...p, gold_medals: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Silver Medals</label>
                <input type="number" value={form.silver_medals} onChange={e => setForm(p => ({ ...p, silver_medals: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Bronze Medals</label>
                <input type="number" value={form.bronze_medals} onChange={e => setForm(p => ({ ...p, bronze_medals: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Bio</label>
              <textarea value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none resize-none" />
            </div>

            {typeof editing === 'number' && (
              <ImageUpload currentUrl={currentCompetitor?.photo_url || null} onUpload={handlePhotoUpload} label="Photo" />
            )}

            <div className="flex gap-3 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => { setEditing(null); setError('') }} className="px-5 py-2.5 text-text-muted text-sm hover:text-text-primary">Cancel</button>
            </div>
          </div>
        </motion.div>
      ) : (
        <>
          <div className="mb-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search competitors..."
                className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
            </div>
          </div>

          <div className="bg-surface border border-white/5">
            {filtered.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">No competitors found.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map(c => (
                  <div key={c.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.photo_url ? (
                        <img src={c.photo_url} alt={c.full_name} className="w-8 h-8 object-cover rounded-full shrink-0" />
                      ) : (
                        <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-xs text-text-muted">{c.first_name[0]}{c.last_name[0]}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary font-medium truncate">{c.first_name} {c.last_name}</div>
                        <div className="text-xs text-text-muted flex items-center gap-2">
                          {c.belt_rank && <span className={BELT_COLORS[c.belt_rank]}>{c.belt_rank}</span>}
                          {c.weight_class && <span>{c.weight_class}</span>}
                          {c.academy && <span>· {c.academy}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-text-muted font-mono hidden sm:block">{c.wins}W-{c.losses}L-{c.draws}D</span>
                      <button
                        onClick={() => {
                          setForm({
                            first_name: c.first_name, last_name: c.last_name, nickname: c.nickname || '',
                            country_code: c.country_code || '', belt_rank: c.belt_rank || '',
                            weight_class: c.weight_class || '', academy: c.academy || '', bio: c.bio || '',
                            instagram_url: c.instagram_url || '', youtube_url: c.youtube_url || '',
                            wins: c.wins, losses: c.losses, draws: c.draws,
                            gold_medals: c.gold_medals, silver_medals: c.silver_medals, bronze_medals: c.bronze_medals,
                          })
                          setEditing(c.id); setError('')
                        }}
                        className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                      ><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(c.id)}
                        className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                      ><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {deleteConfirm !== null && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              onClick={e => e.stopPropagation()} className="bg-surface border border-white/10 p-6 max-w-sm w-full mx-4">
              <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">Delete Competitor</h3>
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
