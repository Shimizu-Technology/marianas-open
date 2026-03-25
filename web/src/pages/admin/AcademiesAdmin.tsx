import { useEffect, useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, Pencil, X, Loader2, Save, Search, Medal, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Academy, AcademyFormData, AcademyDetail } from '../../services/api'
import ImageUpload from '../../components/ImageUpload'
import { useEditingParam } from '../../hooks/useEditingParam'

const emptyForm: AcademyFormData = {
  name: '', country_code: '', location: '', website_url: '',
  instagram_url: '', facebook_url: '', description: '',
}

const PAGE_SIZE = 50
type SortField = 'name' | 'points' | 'athletes' | 'gold';

export default function AcademiesAdmin() {
  const navigate = useNavigate()
  const [academies, setAcademies] = useState<Academy[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useEditingParam()
  const [editDetail, setEditDetail] = useState<AcademyDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [form, setForm] = useState<AcademyFormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('points')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      const res = await api.admin.getAcademies()
      setAcademies(res.academies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (typeof editing === 'number') {
      const a = academies.find(x => x.id === editing)
      if (a) {
        setForm({
          name: a.name, country_code: a.country_code || '',
          location: a.location || '', website_url: a.website_url || '',
          instagram_url: a.instagram_url || '', facebook_url: a.facebook_url || '',
          description: a.description || '',
        })
      }
      setDetailLoading(true)
      api.admin.getAcademy(editing)
        .then(res => setEditDetail(res.academy))
        .catch(() => setEditDetail(null))
        .finally(() => setDetailLoading(false))
    } else {
      setEditDetail(null)
    }
  }, [editing, academies])

  const handleSave = async () => {
    if (typeof editing !== 'number') return
    setSaving(true); setError('')
    try {
      await api.admin.updateAcademy(editing, form)
      setSuccess('Academy updated')
      await load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally { setSaving(false) }
  }

  const handleLogoUpload = async (file: File) => {
    if (typeof editing !== 'number') return
    await api.admin.uploadAcademyLogo(editing, file)
    await load()
  }

  const currentAcademy = typeof editing === 'number' ? academies.find(a => a.id === editing) : null

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
    setPage(1)
  }
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null
    return sortDir === 'desc' ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />
  }

  const filtered = useMemo(() => {
    let list = [...academies]
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      list = list.filter(a => a.name.toLowerCase().includes(q))
    }
    list.sort((a, b) => {
      let cmp = 0
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'points': cmp = (a.total_points || 0) - (b.total_points || 0); break
        case 'athletes': cmp = (a.athletes || 0) - (b.athletes || 0); break
        case 'gold': cmp = (a.gold || 0) - (b.gold || 0); break
      }
      return sortDir === 'desc' ? -cmp : cmp
    })
    return list
  }, [academies, searchQuery, sortField, sortDir])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  useEffect(() => { setPage(1) }, [searchQuery])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 text-gold animate-spin" /></div>
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-gold" />
          <h1 className="font-heading text-2xl font-bold text-text-primary">Academies</h1>
          <span className="text-sm text-text-muted">({academies.length})</span>
        </div>
      </div>

      <div className="mb-4 p-4 bg-surface border border-white/5 text-xs text-text-secondary leading-relaxed">
        <p>
          <strong className="text-text-primary">Academies are auto-populated from tournament results.</strong>{' '}
          When event results are imported, academy records are automatically created from competitor affiliations.
          Points and medals are aggregated from all athletes. You can enrich profiles by adding logos, locations,
          and social links.
        </p>
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

      {editing !== null && typeof editing === 'number' ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-surface border border-white/5">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
            <h2 className="font-heading text-sm font-semibold text-text-primary">Edit Academy Profile</h2>
            <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>

          {currentAcademy && (currentAcademy.total_points > 0) && (
            <div className="px-5 py-3 bg-white/[0.02] border-b border-white/5">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">Team Stats (computed from results)</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <div className="text-center p-2 bg-white/[0.03] border border-white/5">
                  <div className="text-sm font-bold text-gold font-mono">{currentAcademy.total_points}</div>
                  <div className="text-[10px] text-text-muted uppercase">Points</div>
                </div>
                <div className="text-center p-2 bg-white/[0.03] border border-white/5">
                  <div className="text-sm font-bold text-yellow-400">{currentAcademy.gold}</div>
                  <div className="text-[10px] text-text-muted uppercase">Gold</div>
                </div>
                <div className="text-center p-2 bg-white/[0.03] border border-white/5">
                  <div className="text-sm font-bold text-gray-300">{currentAcademy.silver}</div>
                  <div className="text-[10px] text-text-muted uppercase">Silver</div>
                </div>
                <div className="text-center p-2 bg-white/[0.03] border border-white/5">
                  <div className="text-sm font-bold text-orange-400">{currentAcademy.bronze}</div>
                  <div className="text-[10px] text-text-muted uppercase">Bronze</div>
                </div>
                <div className="text-center p-2 bg-white/[0.03] border border-white/5">
                  <div className="text-sm font-bold text-text-primary">{currentAcademy.athletes}</div>
                  <div className="text-[10px] text-text-muted uppercase">Athletes</div>
                </div>
              </div>
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Athletes list */}
            {detailLoading ? (
              <div className="flex items-center gap-2 py-4 text-text-muted text-xs"><Loader2 className="w-3 h-3 animate-spin" /> Loading athletes...</div>
            ) : editDetail?.athletes && editDetail.athletes.length > 0 ? (
              <div>
                <label className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-2 block">
                  Athletes ({editDetail.athletes.length})
                </label>
                <div className="max-h-48 overflow-y-auto border border-white/5 divide-y divide-white/5">
                  {editDetail.athletes.map((a: { id: number; full_name: string; belt_rank: string | null; country_code: string | null }) => (
                    <div key={a.id} className="px-3 py-2 flex items-center justify-between text-xs">
                      <button
                        onClick={() => navigate(`/admin/competitors?edit=${a.id}`)}
                        className="text-text-primary hover:text-gold transition-colors text-left"
                      >
                        {a.full_name}
                      </button>
                      <div className="flex items-center gap-2 text-text-muted">
                        {a.belt_rank && <span className="capitalize">{a.belt_rank}</span>}
                        {a.country_code && <span>{a.country_code}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Academy Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Country Code</label>
                  <input value={form.country_code} onChange={e => setForm(p => ({ ...p, country_code: e.target.value.toUpperCase().slice(0, 2) }))}
                    placeholder="GU, JP, KR..."
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Location</label>
                  <input value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                    placeholder="City, Country"
                    className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Website</label>
                <input value={form.website_url} onChange={e => setForm(p => ({ ...p, website_url: e.target.value }))}
                  placeholder="https://..."
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Instagram</label>
                <input value={form.instagram_url} onChange={e => setForm(p => ({ ...p, instagram_url: e.target.value }))}
                  placeholder="https://instagram.com/..."
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Facebook</label>
                <input value={form.facebook_url} onChange={e => setForm(p => ({ ...p, facebook_url: e.target.value }))}
                  placeholder="https://facebook.com/..."
                  className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none resize-none" />
            </div>

            <ImageUpload currentUrl={currentAcademy?.logo_url || null} onUpload={handleLogoUpload} label="Logo" />

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
                placeholder="Search academies..."
                className="w-full bg-white/[0.03] border border-white/10 pl-9 pr-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
            </div>
          </div>

          <div className="bg-surface border border-white/5 overflow-x-auto">
            <div className="px-5 py-2.5 border-b border-white/5 hidden sm:grid sm:grid-cols-[1fr_100px_60px_60px_60px_80px_60px] gap-2 text-[10px] text-text-muted uppercase tracking-wider">
              <button onClick={() => toggleSort('name')} className="flex items-center gap-1 text-left hover:text-text-primary transition-colors">
                Academy <SortIcon field="name" />
              </button>
              <button onClick={() => toggleSort('points')} className="flex items-center gap-1 text-right hover:text-text-primary transition-colors">
                Points <SortIcon field="points" />
              </button>
              <button onClick={() => toggleSort('gold')} className="flex items-center gap-1 text-center hover:text-text-primary transition-colors">
                <Medal className="w-3 h-3 text-yellow-400" /> <SortIcon field="gold" />
              </button>
              <span className="text-center"><Medal className="w-3 h-3 text-gray-300 inline" /></span>
              <span className="text-center"><Medal className="w-3 h-3 text-orange-400 inline" /></span>
              <button onClick={() => toggleSort('athletes')} className="flex items-center gap-1 text-center hover:text-text-primary transition-colors">
                Athletes <SortIcon field="athletes" />
              </button>
              <span></span>
            </div>

            {paginated.length === 0 ? (
              <div className="p-8 text-center text-text-muted text-sm">No academies found.</div>
            ) : (
              <div className="divide-y divide-white/5">
                {paginated.map(a => (
                  <div key={a.id} className="px-5 py-3 sm:grid sm:grid-cols-[1fr_100px_60px_60px_60px_80px_60px] gap-2 items-center">
                    <div className="flex items-center gap-3 min-w-0">
                      {a.logo_url ? (
                        <img src={a.logo_url} alt={a.name} className="w-8 h-8 object-contain rounded shrink-0" />
                      ) : (
                        <div className="w-8 h-8 bg-white/5 rounded flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4 text-text-muted" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary font-medium truncate">{a.name}</div>
                        <div className="text-xs text-text-muted">
                          {a.country_code && <span>{a.country_code}</span>}
                          {a.location && <span> · {a.location}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-mono text-gold font-semibold text-right hidden sm:block">{a.total_points || 0}</div>
                    <div className="text-sm text-yellow-400 text-center hidden sm:block">{a.gold || 0}</div>
                    <div className="text-sm text-gray-300 text-center hidden sm:block">{a.silver || 0}</div>
                    <div className="text-sm text-orange-400 text-center hidden sm:block">{a.bronze || 0}</div>
                    <div className="text-sm text-text-secondary text-center hidden sm:block">{a.athletes || 0}</div>

                    <div className="flex items-center gap-3 mt-1 sm:hidden text-xs text-text-muted">
                      <span className="text-gold font-mono">{a.total_points || 0} pts</span>
                      {(a.gold || 0) > 0 && <span className="text-yellow-400">{a.gold}G</span>}
                      <span>{a.athletes || 0} athletes</span>
                    </div>

                    <div className="flex items-center justify-end mt-1 sm:mt-0">
                      <button onClick={() => { setEditing(a.id); setError('') }}
                        className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-text-muted">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} academies
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let pageNum: number
                  if (totalPages <= 7) pageNum = i + 1
                  else if (page <= 4) pageNum = i + 1
                  else if (page >= totalPages - 3) pageNum = totalPages - 6 + i
                  else pageNum = page - 3 + i
                  return (
                    <button key={pageNum} onClick={() => setPage(pageNum)}
                      className={`w-7 h-7 text-xs transition-colors ${page === pageNum ? 'bg-gold/15 text-gold font-semibold' : 'text-text-muted hover:text-text-primary'}`}>
                      {pageNum}
                    </button>
                  )
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="p-1.5 text-text-muted hover:text-text-primary disabled:opacity-30 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
