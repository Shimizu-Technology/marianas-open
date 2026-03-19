import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Trophy, Plus, Pencil, Trash2, X, Loader2, Save,
  ArrowLeft, Download, Upload, AlertTriangle, CheckCircle,
  ChevronDown, ChevronUp, Search,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../services/api'
import type { Event, EventResult, EventResultFormData, ImportPreview } from '../../services/api'

const BELT_RANKS = ['white', 'blue', 'purple', 'brown', 'black']
const GENDERS = ['male', 'female']
const PLACEMENTS = [1, 2, 3]

const PLACEMENT_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: 'Gold', color: 'text-yellow-400' },
  2: { label: 'Silver', color: 'text-gray-300' },
  3: { label: 'Bronze', color: 'text-amber-600' },
}

const emptyResultForm: EventResultFormData = {
  division: '',
  gender: 'male',
  belt_rank: 'black',
  age_category: 'adult',
  weight_class: '',
  placement: 1,
  competitor_name: '',
  academy: '',
  country_code: '',
}

type GroupedResults = Record<string, EventResult[]>

function groupByDivision(results: EventResult[]): GroupedResults {
  const grouped: GroupedResults = {}
  for (const r of results) {
    const key = r.division || 'Unknown Division'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  }
  for (const key of Object.keys(grouped)) {
    grouped[key].sort((a, b) => a.placement - b.placement)
  }
  return grouped
}

export default function EventResultsAdmin() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const numericEventId = Number(eventId)

  const [event, setEvent] = useState<Event | null>(null)
  const [results, setResults] = useState<EventResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [editing, setEditing] = useState<number | 'new' | null>(null)
  const [form, setForm] = useState<EventResultFormData>(emptyResultForm)
  const [saving, setSaving] = useState(false)

  // Import state
  const [importStep, setImportStep] = useState<'idle' | 'previewing' | 'preview' | 'importing' | 'done'>('idle')
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null)
  const [importError, setImportError] = useState('')

  // UI state
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false)
  const [collapsedDivisions, setCollapsedDivisions] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [filterBelt, setFilterBelt] = useState('')

  const loadData = useCallback(async () => {
    try {
      const [eventRes, resultsRes] = await Promise.all([
        api.admin.getEvent(numericEventId),
        api.admin.getEventResults(numericEventId),
      ])
      setEvent(eventRes.event)
      setResults(resultsRes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load event data')
    } finally {
      setLoading(false)
    }
  }, [numericEventId])

  useEffect(() => { loadData() }, [loadData])

  const showSuccess = (msg: string) => {
    setSuccess(msg)
    setTimeout(() => setSuccess(''), 3000)
  }

  // CRUD
  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      if (editing === 'new') {
        await api.admin.createEventResult(numericEventId, form)
        showSuccess('Result added')
      } else if (typeof editing === 'number') {
        await api.admin.updateEventResult(numericEventId, editing, form)
        showSuccess('Result updated')
      }
      setEditing(null)
      setForm(emptyResultForm)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await api.admin.deleteEventResult(numericEventId, id)
      setDeleteConfirm(null)
      showSuccess('Result deleted')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const handleDeleteAll = async () => {
    try {
      const res = await api.admin.deleteAllEventResults(numericEventId)
      setDeleteAllConfirm(false)
      showSuccess(`Deleted ${res.deleted} results`)
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete all failed')
    }
  }

  // ASJJF Import
  const handleImportPreview = async () => {
    setImportStep('previewing')
    setImportError('')
    try {
      const preview = await api.admin.importResultsPreview(numericEventId)
      setImportPreview(preview)
      setImportStep('preview')
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Preview failed')
      setImportStep('idle')
    }
  }

  const handleImportConfirm = async () => {
    setImportStep('importing')
    setImportError('')
    try {
      const result = await api.admin.importResults(numericEventId)
      showSuccess(result.message)
      setImportStep('done')
      setImportPreview(null)
      await loadData()
      setTimeout(() => setImportStep('idle'), 2000)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Import failed')
      setImportStep('preview')
    }
  }

  // Mark as completed
  const handleMarkCompleted = async () => {
    try {
      await api.admin.updateEvent(numericEventId, { status: 'completed' })
      showSuccess('Event marked as completed')
      await loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update event status')
    }
  }

  const editResult = (result: EventResult) => {
    setForm({
      division: result.division,
      gender: result.gender || 'male',
      belt_rank: result.belt_rank || 'black',
      age_category: result.age_category || 'adult',
      weight_class: result.weight_class || '',
      placement: result.placement,
      competitor_name: result.competitor_name,
      academy: result.academy || '',
      country_code: result.country_code || '',
    })
    setEditing(result.id)
  }

  const toggleDivision = (key: string) => {
    setCollapsedDivisions(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Filter results
  const filteredResults = results.filter(r => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      if (!r.competitor_name.toLowerCase().includes(q) && !(r.academy || '').toLowerCase().includes(q)) {
        return false
      }
    }
    if (filterBelt && r.belt_rank !== filterBelt) return false
    return true
  })

  const grouped = groupByDivision(filteredResults)
  const divisionKeys = Object.keys(grouped).sort()

  // Stats
  const totalResults = results.length
  const goldCount = results.filter(r => r.placement === 1).length
  const silverCount = results.filter(r => r.placement === 2).length
  const bronzeCount = results.filter(r => r.placement === 3).length
  const divisionCount = new Set(results.map(r => r.division)).size

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">Event not found</p>
        <Link to="/admin/events" className="text-gold text-sm mt-2 inline-block">Back to Events</Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate('/admin/events')} className="p-1.5 text-text-muted hover:text-text-primary transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-gold" />
              <h1 className="font-heading text-xl font-bold text-text-primary">{event.name}</h1>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {event.date} &middot; {event.city}, {event.country} &middot;
              <span className={`ml-1 px-1.5 py-0.5 text-[10px] ${
                event.status === 'completed' ? 'bg-green-500/10 text-green-400' :
                event.status === 'published' ? 'bg-blue-500/10 text-blue-400' :
                'bg-white/5 text-text-muted'
              }`}>{event.status}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          {event.status !== 'completed' && results.length > 0 && (
            <button
              onClick={handleMarkCompleted}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-green-500/10 text-green-400 text-xs font-medium hover:bg-green-500/15 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Mark Completed
            </button>
          )}
          {!editing && (
            <button
              onClick={() => { setForm(emptyResultForm); setEditing('new') }}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-gold/10 text-gold text-xs font-medium hover:bg-gold/15 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Result
            </button>
          )}
        </div>
      </div>

      {/* Alerts */}
      <AnimatePresence>
        {success && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm flex items-center gap-2">
            <CheckCircle className="w-4 h-4" /> {success}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="mb-4 px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> {error}
            <button onClick={() => setError('')} className="ml-auto"><X className="w-3 h-3" /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Results" value={totalResults} />
        <StatCard label="Divisions" value={divisionCount} />
        <StatCard label="Gold" value={goldCount} color="text-yellow-400" />
        <StatCard label="Silver" value={silverCount} color="text-gray-300" />
        <StatCard label="Bronze" value={bronzeCount} color="text-amber-600" />
      </div>

      {/* ASJJF Import Section */}
      <div className="mb-6 bg-surface border border-white/5 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2">
            <Download className="w-4 h-4 text-text-muted" />
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <span className="text-sm font-medium text-text-primary">ASJJF Import</span>
              <span className="text-xs text-text-muted">(Import results from asjjf.org)</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {importStep === 'idle' && (
              <button
                onClick={handleImportPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gold/10 text-gold text-xs font-medium hover:bg-gold/15 transition-colors"
              >
                <Upload className="w-3 h-3" />
                Preview Import
              </button>
            )}
            {importStep === 'previewing' && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" /> Fetching preview...
              </span>
            )}
            {importStep === 'importing' && (
              <span className="flex items-center gap-1.5 text-xs text-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" /> Importing...
              </span>
            )}
            {importStep === 'done' && (
              <span className="flex items-center gap-1.5 text-xs text-green-400">
                <CheckCircle className="w-3 h-3" /> Import complete
              </span>
            )}
          </div>
        </div>

        {importError && (
          <div className="mt-3 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
            {importError}
          </div>
        )}

        {importStep === 'preview' && importPreview && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{importPreview.preview.total_results}</div>
                <div className="text-[10px] text-text-muted uppercase">Results to Import</div>
              </div>
              <div className="bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{importPreview.preview.divisions}</div>
                <div className="text-[10px] text-text-muted uppercase">Divisions</div>
              </div>
              <div className="bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{importPreview.preview.countries}</div>
                <div className="text-[10px] text-text-muted uppercase">Countries</div>
              </div>
              <div className="bg-white/[0.03] p-3 text-center">
                <div className="text-lg font-bold text-text-primary">{importPreview.preview.academies}</div>
                <div className="text-[10px] text-text-muted uppercase">Academies</div>
              </div>
            </div>

            {importPreview.existing_results_count > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                This event already has {importPreview.existing_results_count} results. Importing will replace all existing results.
              </div>
            )}

            {importPreview.sample.length > 0 && (
              <div>
                <p className="text-xs text-text-muted mb-2">Sample results (first 10):</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/5 text-text-muted">
                        <th className="text-left p-2">Division</th>
                        <th className="text-left p-2">Place</th>
                        <th className="text-left p-2">Competitor</th>
                        <th className="text-left p-2">Academy</th>
                        <th className="text-left p-2">Country</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {importPreview.sample.map((s, i) => (
                        <tr key={i} className="text-text-secondary">
                          <td className="p-2">{s.division}</td>
                          <td className="p-2">{s.placement}</td>
                          <td className="p-2 text-text-primary">{s.competitor_name}</td>
                          <td className="p-2">{s.academy}</td>
                          <td className="p-2">{s.country_code}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleImportConfirm}
                className="flex items-center gap-1.5 px-4 py-2 bg-gold/10 text-gold text-xs font-medium hover:bg-gold/15 transition-colors"
              >
                <Download className="w-3 h-3" />
                Confirm Import
              </button>
              <button
                onClick={() => { setImportStep('idle'); setImportPreview(null) }}
                className="px-4 py-2 text-xs text-text-muted hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Edit/Create Form */}
      <AnimatePresence>
        {editing !== null && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-6 bg-surface border border-white/5"
          >
            <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between">
              <h2 className="font-heading text-sm font-semibold text-text-primary">
                {editing === 'new' ? 'Add Result' : 'Edit Result'}
              </h2>
              <button onClick={() => { setEditing(null); setError('') }} className="text-text-muted hover:text-text-primary">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Competitor Name" value={form.competitor_name} onChange={v => setForm(f => ({ ...f, competitor_name: v }))} />
                <Field label="Academy" value={form.academy} onChange={v => setForm(f => ({ ...f, academy: v }))} />
                <Field label="Country Code" value={form.country_code} onChange={v => setForm(f => ({ ...f, country_code: v }))} placeholder="e.g. JPN" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Field label="Division" value={form.division} onChange={v => setForm(f => ({ ...f, division: v }))} placeholder="e.g. Adult / Male / Black / Light" />
                <SelectField label="Belt Rank" value={form.belt_rank} onChange={v => setForm(f => ({ ...f, belt_rank: v }))}
                  options={BELT_RANKS.map(b => ({ value: b, label: b.charAt(0).toUpperCase() + b.slice(1) }))} />
                <SelectField label="Gender" value={form.gender} onChange={v => setForm(f => ({ ...f, gender: v }))}
                  options={GENDERS.map(g => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <SelectField label="Placement" value={form.placement.toString()} onChange={v => setForm(f => ({ ...f, placement: parseInt(v) }))}
                  options={PLACEMENTS.map(p => ({ value: p.toString(), label: `${PLACEMENT_LABELS[p].label} (${p})` }))} />
                <Field label="Weight Class" value={form.weight_class} onChange={v => setForm(f => ({ ...f, weight_class: v }))} placeholder="e.g. Light" />
                <Field label="Age Category" value={form.age_category} onChange={v => setForm(f => ({ ...f, age_category: v }))} placeholder="e.g. adult" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleSave} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors disabled:opacity-50">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button onClick={() => { setEditing(null); setError('') }}
                  className="px-5 py-2.5 text-text-muted text-sm hover:text-text-primary transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filters & Actions */}
      {results.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by name or academy..."
              className="w-full pl-9 pr-3 py-2 bg-white/[0.03] border border-white/10 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none"
            />
          </div>
          <select
            value={filterBelt}
            onChange={e => setFilterBelt(e.target.value)}
            className="bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none"
          >
            <option value="">All Belts</option>
            {BELT_RANKS.map(b => (
              <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
            ))}
          </select>
          {results.length > 0 && (
            <button
              onClick={() => setDeleteAllConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Delete All
            </button>
          )}
        </div>
      )}

      {/* Results by Division */}
      {results.length === 0 ? (
        <div className="bg-surface border border-white/5 p-12 text-center">
          <Trophy className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
          <p className="text-text-muted text-sm">No results yet for this event.</p>
          <p className="text-text-muted text-xs mt-1">Use the ASJJF Import above or add results manually.</p>
        </div>
      ) : filteredResults.length === 0 ? (
        <div className="bg-surface border border-white/5 p-8 text-center text-text-muted text-sm">
          No results match your filters.
        </div>
      ) : (
        <div className="space-y-3">
          {divisionKeys.map(division => (
            <div key={division} className="bg-surface border border-white/5">
              <button
                onClick={() => toggleDivision(division)}
                className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Trophy className="w-3.5 h-3.5 text-gold" />
                  <span className="text-sm font-medium text-text-primary">{division}</span>
                  <span className="text-xs text-text-muted">({grouped[division].length} results)</span>
                </div>
                {collapsedDivisions[division] ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronUp className="w-4 h-4 text-text-muted" />}
              </button>

              {!collapsedDivisions[division] && (
                <div className="border-t border-white/5 overflow-x-auto">
                  <table className="w-full text-sm min-w-[560px]">
                    <thead>
                      <tr className="border-b border-white/5 text-xs text-text-muted">
                        <th className="text-left px-4 py-2 w-16">Place</th>
                        <th className="text-left px-4 py-2">Competitor</th>
                        <th className="text-left px-4 py-2 hidden sm:table-cell">Academy</th>
                        <th className="text-left px-4 py-2 hidden md:table-cell">Country</th>
                        <th className="text-left px-4 py-2 hidden md:table-cell">Belt</th>
                        <th className="px-4 py-2 w-20"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {grouped[division].map(result => (
                        <tr key={result.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-2.5">
                            <span className={`text-xs font-bold ${PLACEMENT_LABELS[result.placement]?.color || 'text-text-muted'}`}>
                              {PLACEMENT_LABELS[result.placement]?.label || `#${result.placement}`}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-text-primary font-medium">{result.competitor_name}</td>
                          <td className="px-4 py-2.5 text-text-secondary hidden sm:table-cell">{result.academy || '—'}</td>
                          <td className="px-4 py-2.5 text-text-secondary hidden md:table-cell">{result.country_code || '—'}</td>
                          <td className="px-4 py-2.5 text-text-secondary capitalize hidden md:table-cell">{result.belt_rank || '—'}</td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-1">
                              <button onClick={() => editResult(result)} className="p-1 text-text-muted hover:text-text-primary transition-colors">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button onClick={() => setDeleteConfirm(result.id)} className="p-1 text-text-muted hover:text-red-400 transition-colors">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Single Confirmation */}
      <AnimatePresence>
        {deleteConfirm !== null && (
          <ConfirmModal
            title="Delete Result"
            message="Are you sure you want to delete this result?"
            onConfirm={() => handleDelete(deleteConfirm)}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}
      </AnimatePresence>

      {/* Delete All Confirmation */}
      <AnimatePresence>
        {deleteAllConfirm && (
          <ConfirmModal
            title="Delete All Results"
            message={`This will permanently delete all ${results.length} results for this event. This cannot be undone.`}
            onConfirm={handleDeleteAll}
            onCancel={() => setDeleteAllConfirm(false)}
            destructive
          />
        )}
      </AnimatePresence>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-surface border border-white/5 p-3 text-center">
      <div className={`text-xl font-bold ${color || 'text-text-primary'}`}>{value}</div>
      <div className="text-[10px] text-text-muted uppercase tracking-wide">{label}</div>
    </div>
  )
}

function ConfirmModal({ title, message, onConfirm, onCancel, destructive }: {
  title: string; message: string; onConfirm: () => void; onCancel: () => void; destructive?: boolean
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onCancel}>
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        onClick={e => e.stopPropagation()} className="bg-surface border border-white/10 p-6 max-w-sm w-full mx-4">
        <h3 className="font-heading text-lg font-semibold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary mb-5">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 text-sm text-text-muted hover:text-text-primary">Cancel</button>
          <button onClick={onConfirm}
            className={`px-4 py-2 text-sm transition-colors ${
              destructive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
            }`}>
            {destructive ? 'Delete All' : 'Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function Field({ label, value, onChange, type = 'text', placeholder }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary placeholder:text-text-muted focus:border-gold/40 focus:outline-none" />
    </div>
  )
}

function SelectField({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-secondary uppercase tracking-wide mb-1.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-white/[0.03] border border-white/10 px-3 py-2 text-sm text-text-primary focus:border-gold/40 focus:outline-none">
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}
