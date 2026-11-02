import { AdminWriteButton } from './AdminWriteControls'
import { useEffect, useId, useRef, useState } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import { api, type ResultsSyncCounts, type ResultsSyncResponse } from '../../services/api'
import { asjjfButtonClass } from './AsjjfIntakePanel'

const statusLabels: Record<string, string> = {
  incomplete: 'Waiting for complete pages', no_changes: 'Up to date', applied: 'Synced',
  held: 'Needs review', failed: 'Sync failed', discarded: 'Review discarded',
}

function checkedTime(value?: string | null) {
  if (!value || Number.isNaN(Date.parse(value))) return 'Not checked yet'
  return `${new Intl.DateTimeFormat('en-US', {
    timeZone: 'Pacific/Guam', dateStyle: 'medium', timeStyle: 'short',
  }).format(new Date(value))} ChST`
}

export function ResultsSyncBadge({ status, lastCheckedAt }: { status?: string | null; lastCheckedAt?: string | null }) {
  const color = status === 'held' || status === 'incomplete' ? 'bg-amber-500/10 text-amber-300'
    : status === 'failed' ? 'bg-red-500/10 text-red-400'
      : status === 'applied' || status === 'no_changes' ? 'bg-green-500/10 text-green-400' : 'bg-white/5 text-text-secondary'
  return <span title={`Last results check: ${checkedTime(lastCheckedAt)}`} className={`inline-block max-w-full rounded px-2 py-1 text-xs ${color}`}>
    Results: {status ? statusLabels[status] || status.replaceAll('_', ' ') : 'Not checked'}
  </span>
}

function Counts({ counts }: { counts: Partial<ResultsSyncCounts> }) {
  return <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
    {(['added', 'removed', 'changed', 'unchanged'] as const).map(key => <div key={key} className="rounded-lg bg-white/5 p-3">
      <dt className="text-xs capitalize text-text-secondary">{key}</dt>
      <dd className="mt-1 text-lg font-semibold text-text-primary">{counts[key] ?? '—'}</dd>
    </div>)}
  </dl>
}

function Report({ title, items }: { title: string; items?: string[] }) {
  if (!items?.length) return null
  return <div className="space-y-2">
    <h3 className="font-medium text-text-primary">{title}</h3>
    <ul className="list-disc space-y-1 pl-5 text-sm text-text-secondary">
      {items.map((item, i) => <li className="break-words [overflow-wrap:anywhere]" key={i}>{item}</li>)}
    </ul>
  </div>
}

export default function ResultsSyncCard(props: { eventId: number; onApplied?: () => void }) {
  // A route change must never retain another event's review or pending action.
  return <ResultsSyncCardContent key={props.eventId} {...props} />
}

function ResultsSyncCardContent({ eventId, onApplied }: { eventId: number; onApplied?: () => void }) {
  const { isAdmin = false } = useOutletContext<{ isAdmin?: boolean }>() || {}
  const headingId = useId()
  const [data, setData] = useState<ResultsSyncResponse | null>(null)
  const [busy, setBusy] = useState<'load' | 'preview' | 'approve' | 'discard' | null>('load')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [stale, setStale] = useState(false)
  const request = useRef(0)
  const pending = useRef(false)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    const id = ++request.current
    pending.current = true
    api.admin.getResultsSync(eventId).then(result => {
      if (mounted.current && id === request.current) setData(result)
    }).catch(err => {
      if (mounted.current && id === request.current) setError(err instanceof Error ? err.message : 'Could not load results sync.')
    }).finally(() => {
      if (mounted.current && id === request.current) { setBusy(null); pending.current = false }
    })
    return () => { mounted.current = false }
  }, [eventId])

  async function refresh() {
    if (pending.current) return
    pending.current = true
    const id = ++request.current
    setBusy('preview')
    setError('')
    setNotice('')
    try {
      const result = await api.admin.previewResultsSync(eventId)
      if (!mounted.current || id !== request.current) return
      setData(result)
      setStale(false)
      setNotice('Saved snapshots reviewed. This review did not apply changes to published results.')
    } catch (err) {
      if (!mounted.current || id !== request.current) return
      setError(err instanceof Error ? err.message : 'Could not review saved snapshots. Try again.')
      setStale(true)
    } finally {
      if (mounted.current && id === request.current) { setBusy(null); pending.current = false }
    }
  }

  const run = data?.run
  const diff = run?.diff_summary
  const held = run?.status === 'held' && !run.discarded_at
  const approvable = held && diff?.approvable === true

  async function decide(action: 'approve' | 'discard') {
    if (pending.current || !isAdmin || !run || !held || stale || (action === 'approve' && !approvable)) return
    pending.current = true
    const id = ++request.current
    setBusy(action)
    setError('')
    setNotice('')
    try {
      const result = action === 'approve'
        ? await api.admin.approveResultsSync(eventId, run.id)
        : await api.admin.discardResultsSync(eventId, run.id)
      if (!mounted.current || id !== request.current) return
      // Approval rechecks the snapshots; discarding does not run another check.
      setData(previous => ({ ...result, last_checked_at: action === 'approve' ? result.run.updated_at : previous?.last_checked_at ?? null }))
      setNotice(action === 'approve' ? 'Review approved. Published results have been synced.' : 'Review discarded. Published results were kept.')
      if (action === 'approve') onApplied?.()
    } catch (err) {
      if (!mounted.current || id !== request.current) return
      setError(err instanceof Error ? err.message : `Could not ${action} this review.`)
      // A conflict or lost response can mean the review has already changed.
      setStale(true)
    } finally {
      if (mounted.current && id === request.current) { setBusy(null); pending.current = false }
    }
  }

  return <section aria-labelledby={headingId} aria-busy={!!busy} className="mb-6 min-w-0 space-y-4 rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h2 id={headingId} className="font-heading text-lg font-bold text-text-primary">Results sync</h2>
        <p className="mt-1 text-sm text-text-secondary">Complete ASJJF snapshots sync automatically. Safety holds keep published results in place until issues are resolved or an administrator approves the review.</p>
      </div>
      <AdminWriteButton type="button" className={`${asjjfButtonClass} shrink-0`} disabled={!!busy} onClick={refresh}>
        {busy === 'preview' ? 'Reviewing snapshots…' : 'Refresh / review saved snapshots'}
      </AdminWriteButton>
    </div>
    <p className="text-sm text-text-secondary">Review uses saved pages only and does not publish changes. The next nightly fetch is at 02:30 ChST; this does not fetch ASJJF immediately.</p>
    {busy === 'load' && <p role="status" className="text-sm text-text-secondary">Loading results sync…</p>}
    {error && <div role="alert" className="space-y-2 break-words text-sm text-red-400">
      <p>{error}</p>
      {data && <p>Showing the last loaded review. It may be out of date. Refresh saved snapshots before making a decision.</p>}
      <AdminWriteButton type="button" disabled={!!busy} onClick={refresh} className={asjjfButtonClass}>Retry saved review</AdminWriteButton>
    </div>}
    {notice && <p role="status" className="text-sm text-green-400">{notice}</p>}
    {data && <>
      <div className="flex flex-wrap items-center gap-2">
        <ResultsSyncBadge status={run?.discarded_at ? 'discarded' : data.status ?? run?.status} lastCheckedAt={data.last_checked_at} />
        {stale && <span className="text-sm text-amber-300">Review may be out of date</span>}
      </div>
      <p className="text-sm text-text-secondary">Last checked: {checkedTime(data.last_checked_at)}</p>
      {!run && <p className="text-sm text-text-secondary">No results sync runs yet. Queue an ASJJF check or upload saved pages, then review the snapshots.</p>}
      {run && <>
        <p className="text-sm text-text-secondary">Review #{run.id} · {run.trigger.replaceAll('_', ' ')} · {checkedTime(run.created_at)}</p>
        {run.status === 'incomplete' && <p className="text-sm text-amber-300">Published results are unchanged. Complete, successfully parsed pages are required for every source.</p>}
        {run.status === 'held' && !run.discarded_at && <p className="text-sm text-amber-300">Changes are held for review. Published results have not been replaced.</p>}
        {run.status === 'no_changes' && <p className="text-sm text-text-secondary">Saved snapshots match the published results.</p>}
        {run.status === 'applied' && <p className="text-sm text-green-400">Published results synced{run.applied_at ? `: ${checkedTime(run.applied_at)}` : '.'}</p>}
        {run.error && <p role="alert" className="break-words text-sm text-red-400">Sync error: {run.error}</p>}
        {run.status === 'failed' && <p className="text-sm text-text-secondary">Sync could not finish. Review saved snapshots to retry.</p>}
        {diff && <>
          {diff.first_import && <p className="text-sm text-text-secondary">First ASJJF import for this event.</p>}
          <Report title="Change summary" items={diff.messages} />
          <Counts counts={diff} />
          {!!diff.relabeled_divisions && <p className="text-sm text-text-secondary">Division labels corrected: {diff.relabeled_divisions}</p>}
          {!!diff.divisions?.length && <details className="border-t border-white/10 pt-2">
            <summary className="min-h-11 cursor-pointer py-2 font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-gold">Per-division changes ({diff.divisions.length})</summary>
            <ul className="space-y-3">
              {diff.divisions.map((division, i) => <li key={`${division.asjjf_event_id}-${division.division}-${i}`} className="min-w-0 space-y-2 rounded-lg border border-white/10 p-3">
                <h3 className="break-words text-sm font-medium text-text-primary [overflow-wrap:anywhere]">{division.division}</h3>
                <p className="text-xs text-text-secondary">ASJJF source: {division.asjjf_event_id ?? 'Unknown'}</p>
                <Counts counts={division} />
              </li>)}
            </ul>
          </details>}
          <Report title="Missing pages" items={diff.missing} />
          <Report title="Protected result conflicts" items={diff.conflicts?.map(c => `${c.competitor_name} · ${c.division} · Result #${c.id}: ${c.reason}`)} />
          <Report title="Unlinked competitors" items={diff.unlinked_competitors?.map(c => `${c.competitor_name} · Result #${c.id}: ${c.reason}`)} />
          {!!diff.unlinked_competitors?.length && <Link to="/admin/competitors" className="inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4">Review competitor identities</Link>}
          {!!diff.snapshot_ids?.length && <p className="break-words text-xs text-text-secondary">Saved snapshot IDs: {diff.snapshot_ids.join(', ')}</p>}
        </>}
        <Report title="Safety guard failures" items={run.guard_failures} />
        {run.discarded_at && <p className="text-sm text-text-secondary">Discarded: {checkedTime(run.discarded_at)}. This review cannot be approved.</p>}
        {held && <div className="space-y-3 border-t border-white/10 pt-4">
          {!isAdmin && <p className="text-sm text-text-secondary">An administrator is needed to approve or discard this review. Staff can refresh saved snapshots and inspect the issues.</p>}
          {!approvable && <p className="text-sm text-amber-300">Approval is blocked. Resolve missing pages, blocking guard failures, or protected result conflicts, then refresh saved snapshots.</p>}
          {isAdmin && <div className="flex flex-col gap-2 sm:flex-row">
            <AdminWriteButton type="button" disabled={!!busy || stale || !approvable} onClick={() => decide('approve')} className={asjjfButtonClass}>{busy === 'approve' ? 'Approving…' : 'Approve review'}</AdminWriteButton>
            <AdminWriteButton type="button" disabled={!!busy || stale} onClick={() => decide('discard')} className={asjjfButtonClass}>{busy === 'discard' ? 'Discarding…' : 'Discard review'}</AdminWriteButton>
          </div>}
        </div>}
      </>}
    </>}
  </section>
}
