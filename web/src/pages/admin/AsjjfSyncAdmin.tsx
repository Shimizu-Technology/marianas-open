import { useEffect, useState } from 'react'
import { useOutletContext } from 'react-router-dom'
import AsjjfIntakePanel, { asjjfButtonClass } from '../../components/admin/AsjjfIntakePanel'
import { api, type AsjjfStatus } from '../../services/api'

function timestamp(value: string | null) {
  if (!value) return 'Not reported'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Unknown time' : date.toLocaleString(undefined, { timeZoneName: 'short' })
}

function label(value: string) {
  return value.replaceAll('_', ' ')
}

export default function AsjjfSyncAdmin() {
  // AdminLayout resolves this role from the same current-user API used by admin navigation.
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>()
  const [status, setStatus] = useState<AsjjfStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMessage, setResetMessage] = useState('')

  useEffect(() => {
    let cancelled = false
    api.admin.getAsjjfStatus()
      .then(data => { if (!cancelled) setStatus(data) })
      .catch(error => { if (!cancelled) setError(error instanceof Error ? error.message : 'Could not load ASJJF status.') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  async function refresh() {
    setLoading(true)
    setError('')
    try {
      setStatus(await api.admin.getAsjjfStatus())
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not refresh ASJJF status. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function resetBreaker() {
    if (!isAdmin || resetting) return
    setResetting(true)
    setError('')
    setResetMessage('')
    try {
      const { breaker } = await api.admin.closeAsjjfBreaker()
      setStatus(previous => previous ? { ...previous, breaker } : previous)
      setResetMessage('Safety pause reset. Queued pages can be checked on the next fetcher run.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not reset the safety pause. Try again.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">ASJJF sync</h1>
          <p className="mt-1 text-sm text-text-secondary">Our fetcher checks ASJJF overnight; you'll see snapshots here after it runs.</p>
        </div>
        <button type="button" onClick={refresh} disabled={loading || resetting} className={`${asjjfButtonClass} shrink-0`}>{loading ? 'Refreshing…' : 'Refresh status'}</button>
      </div>
      {error && <p role="alert" className="break-words rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}{status ? ' Showing the last loaded status.' : ''}</p>}
      {loading && <p role="status" className="text-sm text-text-secondary">Loading ASJJF status…</p>}
      {resetMessage && <p role="status" className="text-sm text-green-400">{resetMessage}</p>}
      {status && (
        <>
          <section aria-labelledby="asjjf-queue" className="rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
            <h2 id="asjjf-queue" className="font-heading text-lg font-bold text-text-primary">Fetch queue</h2>
            {Object.keys(status.queue_counts).length === 0 ? <p className="mt-2 text-sm text-text-secondary">No queue counts reported.</p> : (
              <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {Object.entries(status.queue_counts).map(([state, count]) => (
                  <div key={state} className="min-w-0"><dt className="break-words text-sm capitalize text-text-secondary">{label(state)}</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-text-primary">{count}</dd></div>
                ))}
              </dl>
            )}
          </section>
          <section aria-labelledby="asjjf-breaker" className="rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
            <h2 id="asjjf-breaker" className="font-heading text-lg font-bold text-text-primary">Fetcher safety pause</h2>
            <p className="mt-2 text-sm text-text-primary">{status.breaker.open ? 'Paused — the circuit breaker is open.' : 'Ready — the circuit breaker is closed.'}</p>
            <p className="mt-1 text-sm text-text-secondary">Paused until: {status.breaker.paused_until ? timestamp(status.breaker.paused_until) : 'No timed pause'}</p>
            <p className="mt-2 text-sm text-text-secondary">The safety pause stops automatic checks when ASJJF needs attention.</p>
            {isAdmin && (status.breaker.open || status.breaker.paused_until) && <button type="button" onClick={resetBreaker} disabled={resetting || loading} className={`${asjjfButtonClass} mt-3`}>{resetting ? 'Resetting…' : 'Reset safety pause'}</button>}
            {!isAdmin && status.breaker.open && <p className="mt-2 text-sm text-text-secondary">An administrator can reset this pause.</p>}
          </section>
          <section aria-labelledby="asjjf-heartbeats" className="space-y-3">
            <h2 id="asjjf-heartbeats" className="font-heading text-lg font-bold text-text-primary">Last fetcher heartbeats</h2>
            {status.heartbeats.length === 0 && <p className="text-sm text-text-secondary">No fetcher has reported yet.</p>}
            {status.heartbeats.map(heartbeat => (
              <article key={heartbeat.fetcher_id} className="min-w-0 rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
                <h3 className="break-words font-semibold text-text-primary">{heartbeat.fetcher_id}</h3>
                <p className="mt-1 break-words text-sm text-text-secondary">Version: {heartbeat.fetcher_version}</p>
                <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-text-secondary">Last heartbeat</dt><dd className="text-text-primary">{timestamp(heartbeat.updated_at)}</dd></div>
                  <div><dt className="text-text-secondary">Run started</dt><dd className="text-text-primary">{timestamp(heartbeat.run_started_at)}</dd></div>
                  <div><dt className="text-text-secondary">Run finished</dt><dd className="text-text-primary">{timestamp(heartbeat.run_finished_at)}</dd></div>
                  <div><dt className="text-text-secondary">Run totals</dt><dd className="text-text-primary">Fetched: {heartbeat.fetched} · Challenged: {heartbeat.challenged} · Errors: {heartbeat.errors}</dd></div>
                </dl>
              </article>
            ))}
          </section>
          <section aria-labelledby="asjjf-snapshots" className="space-y-3">
            <h2 id="asjjf-snapshots" className="font-heading text-lg font-bold text-text-primary">Recent snapshots</h2>
            <p className="text-sm text-text-secondary">Parsing runs after a snapshot is saved. Refresh status to see updates. Snapshots won't yet replace published results.</p>
            {status.recent_snapshots.length === 0 && <p className="text-sm text-text-secondary">No snapshots yet. Queue an event check or upload a saved ASJJF page below.</p>}
            {status.recent_snapshots.map(snapshot => (
              <article key={snapshot.id} className="min-w-0 space-y-3 rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
                <h3 className="break-words font-semibold text-text-primary">Snapshot #{snapshot.id} · {label(snapshot.page_type)}</h3>
                <p className="break-all text-sm text-text-secondary">{snapshot.url}</p>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-text-secondary">Saved</dt><dd className="text-text-primary">{timestamp(snapshot.fetched_at)}</dd></div>
                  <div><dt className="text-text-secondary">Source</dt><dd className="break-words text-text-primary">{label(snapshot.source)}</dd></div>
                  <div><dt className="text-text-secondary">Fetch outcome</dt><dd className="break-words text-text-primary">{label(snapshot.outcome)}</dd></div>
                  <div><dt className="text-text-secondary">Parse status</dt><dd className="break-words text-text-primary">{label(snapshot.parse_status)}</dd></div>
                </dl>
                {snapshot.parse_error && <p className="break-words text-sm text-red-400">Parse error: {snapshot.parse_error}</p>}
                {snapshot.parsed_summary != null && (
                  <details>
                    <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-gold focus-visible:outline-2 focus-visible:outline-gold">Parsed summary</summary>
                    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-navy-900 p-3 text-xs text-text-secondary">{JSON.stringify(snapshot.parsed_summary, null, 2)}</pre>
                  </details>
                )}
              </article>
            ))}
          </section>
        </>
      )}
      <AsjjfIntakePanel />
    </div>
  )
}
