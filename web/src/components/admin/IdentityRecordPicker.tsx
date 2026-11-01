import { useEffect, useId, useState } from 'react'
import { api } from '../../services/api'

export type IdentityRecord = { id: number; name: string; detail?: string }
export type IdentityKind = 'academies' | 'competitors'
export const identityInputClass = 'w-full min-w-0 border border-white/20 bg-surface px-3 py-2.5 text-base sm:text-sm text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold'
export const identityButtonClass = 'min-h-11 px-4 py-2 text-sm font-medium text-gold border border-gold/30 hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold disabled:opacity-50 disabled:cursor-not-allowed'

export default function IdentityRecordPicker({ kind, label, excludeId, value, onChange, disabled = false }: {
  kind: IdentityKind; label: string; excludeId?: number; value: IdentityRecord | null;
  onChange: (value: IdentityRecord | null) => void; disabled?: boolean
}) {
  const id = useId()
  const [query, setQuery] = useState('')
  const [records, setRecords] = useState<IdentityRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (value || disabled) return
    let active = true
    setLoading(true)
    setRecords([])
    setError('')
    const timer = setTimeout(async () => {
      try {
        const params = { search: query.trim(), per_page: '20', page: '1', sort_by: 'name', sort_dir: 'asc' }
        const response = kind === 'academies' ? await api.admin.getAcademies(params) : await api.admin.getCompetitors(params)
        if (!active) return
        const items = 'academies' in response
          ? response.academies.map(a => ({ id: a.id, name: a.name, detail: [a.location, a.country_code].filter(Boolean).join(' · ') }))
          : response.competitors.map(c => ({ id: c.id, name: c.full_name, detail: [c.academy, c.country_code, c.belt_rank, `${c.results_count} results`].filter(Boolean).join(' · ') }))
        setRecords(items.filter(item => item.id !== excludeId))
        setTotal(response.total)
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not search. Try again.')
      } finally {
        if (active) setLoading(false)
      }
    }, 300)
    return () => { active = false; clearTimeout(timer) }
  }, [kind, query, excludeId, value, disabled, attempt])

  return <div className="min-w-0 space-y-2">
    {value ? <p id={`${id}-label`} className="text-sm font-medium text-text-primary">{label}</p>
      : <label htmlFor={id} className="block text-sm font-medium text-text-primary">{label}</label>}
    {value ? <div role="group" aria-labelledby={`${id}-label`} className="flex flex-wrap items-center gap-2 border border-white/20 p-3">
      <span id={id} className="min-w-0 flex-1 break-words text-sm text-text-primary">{value.name} <span className="text-text-secondary">(ID {value.id})</span></span>
      <button type="button" disabled={disabled} onClick={() => onChange(null)} className={identityButtonClass}>Change selection</button>
    </div> : <>
      <input id={id} type="search" value={query} disabled={disabled} autoComplete="off" placeholder="Search by name"
        onChange={e => { setQuery(e.target.value); setRecords([]); setLoading(true) }} className={identityInputClass} />
      {!disabled && <div aria-live="polite" className="text-sm text-text-secondary">
        {loading ? 'Searching…' : error ? <p role="alert">{error} <button type="button" onClick={() => setAttempt(n => n + 1)} className={identityButtonClass}>Retry search</button></p>
          : records.length === 0 ? 'No matches. Try another spelling.' : null}
      </div>}
      {!disabled && !loading && !error && records.length > 0 && <ul aria-label={`${label} matches`} className="max-h-56 overflow-y-auto border border-white/10 divide-y divide-white/10">
        {records.map(record => <li key={record.id}><button type="button" disabled={disabled} onClick={() => onChange(record)}
          className="w-full min-h-11 px-3 py-3 text-left hover:bg-white/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-gold">
          <span className="block break-words text-sm text-text-primary">{record.name} <span className="text-text-secondary">(ID {record.id})</span></span>
          {record.detail && <span className="block break-words text-xs text-text-secondary">{record.detail}</span>}
        </button></li>)}
      </ul>}
      {!disabled && !loading && !error && total > 20 && <p className="text-xs text-text-secondary">Showing up to 20 of {total} matches. Refine the search to find another record.</p>}
    </>}
  </div>
}
