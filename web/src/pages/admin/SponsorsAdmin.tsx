import { useEffect, useState, useCallback } from 'react'
import { Handshake, Plus, Pencil, Trash2, X, Loader2, Save } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Sponsor, SponsorFormData } from '../../services/api'
import ImageUpload from '../../components/ImageUpload'

const TIERS = ['title', 'gold', 'silver', 'bronze', 'supporting'] as const
const TIER_COLORS: Record<string, string> = {
  title: 'text-gold',
  gold: 'text-yellow-400',
  silver: 'text-gray-300',
  bronze: 'text-orange-400',
  supporting: 'text-text-muted',
}

const emptyForm: SponsorFormData = { name: '', tier: 'supporting', website_url: '', sort_order: 0 }

export default function SponsorsAdmin() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<SponsorFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

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

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.admin.createSponsor(form)
        setSuccess('Sponsor created')
      } else if (typeof editing === 'number') {
        await api.admin.updateSponsor(editing, form)
        setSuccess('Sponsor updated')
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
    if (typeof editing !== 'number') return
    await api.admin.uploadSponsorLogo(editing, file)
    await load()
  }

  const currentSponsor = typeof editing === 'number' ? sponsors.find(s => s.id === editing) : null

  const sponsorsByTier = TIERS.map(tier => ({
    tier,
    sponsors: sponsors.filter(s => s.tier === tier),
  })).filter(g => g.sponsors.length > 0)

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
          <Handshake className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Sponsors</h1>
        </div>
        {!editing && (
          <button
            onClick={() => { setForm(emptyForm); setEditing('new'); setError('') }}
            className="flex items-center gap-2 px-4 py-2 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
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
          <div className="p-5 space-y-4">
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

            {typeof editing === 'number' && (
              <ImageUpload
                currentUrl={currentSponsor?.logo_url || null}
                onUpload={handleLogoUpload}
                label="Logo"
              />
            )}

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
        <div className="space-y-6">
          {sponsorsByTier.length === 0 ? (
            <div className="bg-surface border border-white/5 p-8 text-center text-text-muted text-sm">
              No sponsors yet. Add your first sponsor.
            </div>
          ) : (
            sponsorsByTier.map(({ tier, sponsors: tierSponsors }) => (
              <div key={tier} className="bg-surface border border-white/5">
                <div className="px-5 py-3 border-b border-white/5">
                  <h3 className={`font-heading text-sm font-semibold uppercase tracking-wide ${TIER_COLORS[tier]}`}>
                    {tier}
                  </h3>
                </div>
                <div className="divide-y divide-white/5">
                  {tierSponsors.map(sponsor => (
                    <div key={sponsor.id} className="px-5 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {sponsor.logo_url ? (
                          <img src={sponsor.logo_url} alt={sponsor.name} className="w-8 h-8 object-contain" />
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
                          onClick={() => {
                            setForm({
                              name: sponsor.name,
                              tier: sponsor.tier,
                              website_url: sponsor.website_url || '',
                              sort_order: sponsor.sort_order || 0,
                            })
                            setEditing(sponsor.id)
                            setError('')
                          }}
                          className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(sponsor.id)}
                          className="p-1.5 text-text-muted hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
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
