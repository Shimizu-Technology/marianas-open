import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api, type AsjjfCalendarResponse } from '../../services/api'
import { asjjfButtonClass } from './AsjjfIntakePanel'

function valueText(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not set'
  return Array.isArray(value) ? value.join(', ') : String(value)
}
function checkedTime(value: string | null) {
  return value ? `${new Intl.DateTimeFormat('en-US', { timeZone: 'Pacific/Guam', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))} ChST` : 'Not checked yet'
}
const labels: Record<string, string> = {
  date: 'Start date', end_date: 'End date', venue_name: 'Venue', country: 'Country',
  asjjf_event_ids: 'ASJJF event IDs', registration_url: 'Registration link',
  registration_url_gi: 'Gi registration link', registration_url_nogi: 'No-Gi registration link',
  registration_opens_on: 'Registration opens', message: 'What needs review',
}

export default function AsjjfCalendarPanel({ onChanged }: { onChanged?: () => void }) {
  const { isAdmin = false } = useOutletContext<{ isAdmin?: boolean }>() || {}
  const [data, setData] = useState<AsjjfCalendarResponse | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const pending = useRef(false)
  const mounted = useRef(true)
  const load = useCallback(async (page = 1) => {
    if (pending.current) return
    pending.current = true
    setBusy(true)
    setError('')
    try {
      const result = await api.admin.getAsjjfCalendar(page)
      if (mounted.current) setData(result)
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Could not load the calendar. Try again.')
    } finally {
      pending.current = false
      if (mounted.current) setBusy(false)
    }
  }, [])
  useEffect(() => {
    mounted.current = true
    void load()
    return () => { mounted.current = false }
  }, [load])

  async function decide(id: number, decision: 'apply' | 'dismiss') {
    if (pending.current || !isAdmin) return
    pending.current = true
    setBusy(true)
    setError('')
    setNotice('')
    let succeeded = false
    try {
      await api.admin.decideAsjjfCalendar(id, decision)
      succeeded = true
      if (mounted.current) {
        setNotice(decision === 'apply' ? 'ASJJF changes applied to the event.' : 'Review dismissed. The event was kept.')
        onChanged?.()
      }
    } catch (err) {
      if (mounted.current) setError(err instanceof Error ? err.message : 'Could not save this decision. Refresh and try again.')
    } finally {
      pending.current = false
      if (mounted.current) { setBusy(false); if (succeeded) await load(data?.page || 1) }
    }
  }

  return <section aria-label="ASJJF calendar" aria-busy={busy} className="mb-6 min-w-0 space-y-4 rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 className="font-heading text-lg font-bold text-text-primary">ASJJF calendar</h2>
        <p className="mt-1 text-sm text-text-secondary">New events arrive as unpublished drafts. Review them before publishing. Changes to existing events need an administrator’s approval.</p>
      </div>
      <button type="button" disabled={busy} onClick={() => load(data?.page || 1)} className={`${asjjfButtonClass} shrink-0`}>Refresh calendar panel</button>
    </div>
    {!data && busy && <p role="status">Loading calendar…</p>}
    {error && <p role="alert" className="break-words text-sm text-red-400">{error}</p>}
    {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}
    {data && <>
      <p className="text-sm text-text-secondary">Last calendar check: {checkedTime(data.last_checked_at)}{data.last_check_status && data.last_check_status !== 'parsed' ? ' · The latest page could not be read. Showing earlier reviews.' : ''}</p>
      <a href={data.source_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4">Open ASJJF calendar</a>
      {data.reviews.length === 0 && <p className="text-sm text-text-secondary">No calendar items need review on this page.</p>}
      <ul className="space-y-4">
        {data.reviews.map(review => <li key={review.id} className="min-w-0 space-y-3 rounded-lg border border-white/10 p-3 sm:p-4">
          <h3 className="break-words font-medium text-text-primary [overflow-wrap:anywhere]">{review.title}</h3>
          <p className="text-sm text-text-secondary">{review.kind === 'new_draft' ? 'ASJJF listed a new event. Review it, then publish.' : review.kind === 'change' ? 'ASJJF listed different event details. Review the changes below.' : 'This calendar listing needs a manual review. The event is still saved.'}</p>
          <dl className="space-y-3 text-sm">
            {Object.entries(review.new_values).map(([field, value]) => <div key={field} className="min-w-0">
              <dt className="font-medium text-text-secondary">{labels[field] || field.replaceAll('_', ' ')}</dt>
              <dd className="mt-1 break-words text-text-primary [overflow-wrap:anywhere]">
                {field in review.old_values && <><span className="text-text-secondary">{valueText(review.old_values[field])}</span><span aria-label=" changes to "> → </span></>}{valueText(value)}
              </dd>
            </div>)}
          </dl>
          <p className="text-xs text-text-secondary">Source checked: {checkedTime(review.source_checked_at)} · Snapshot #{review.snapshot_id}</p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            {review.event_id && <Link className={asjjfButtonClass} onClick={onChanged} to={`/admin/events?edit=${review.event_id}`}>{review.event_status === 'draft' ? 'Open draft' : 'Open event'}</Link>}
            <a href={review.source_url} target="_blank" rel="noopener noreferrer" className={asjjfButtonClass}>ASJJF source page</a>
            {isAdmin && <>
              {review.kind === 'change' && <button type="button" disabled={busy || !!error} onClick={() => decide(review.id, 'apply')} className={asjjfButtonClass}>Apply changes</button>}
              <button type="button" disabled={busy || !!error} onClick={() => decide(review.id, 'dismiss')} className={asjjfButtonClass}>Dismiss</button>
            </>}
          </div>
          {!isAdmin && <p className="text-xs text-text-secondary">An administrator can apply or dismiss this review.</p>}
        </li>)}
      </ul>
      {data.total > data.per_page && <nav aria-label="Calendar review pages" className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || data.page <= 1} onClick={() => load(data.page - 1)} className={asjjfButtonClass}>Previous</button>
        <span className="text-sm text-text-secondary">Page {data.page} of {Math.ceil(data.total / data.per_page)}</span>
        <button type="button" disabled={busy || data.page * data.per_page >= data.total} onClick={() => load(data.page + 1)} className={asjjfButtonClass}>Next</button>
      </nav>}
    </>}
  </section>
}
