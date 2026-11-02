import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, CheckCircle2, ExternalLink, RefreshCw } from 'lucide-react'
import { api, type AdminAttention } from '../../services/api'

const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2 text-sm font-semibold text-gold hover:bg-white/5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold disabled:opacity-50'

export default function AdminDashboard() {
  const [data, setData] = useState<AdminAttention | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [attempt, setAttempt] = useState(0)
  const refresh = useCallback(() => setAttempt(value => value + 1), [])

  useEffect(() => {
    let active = true
    api.admin.getAttention().then(result => {
      if (active) { setData(result); setError('') }
    }).catch(() => {
      if (active) setError('Could not check what needs attention. Try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])

  const analyticsUrl = import.meta.env.VITE_POSTHOG_DASHBOARD_URL?.trim()
  const total = data?.groups.reduce((sum, group) => sum + group.items.length, 0) ?? 0
  const checked = data ? new Date(data.checked_at).toLocaleString(undefined, { timeZoneName: 'short' }) : null

  return <div className="mx-auto max-w-6xl space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-widest text-gold">Team workspace</p><h1 className="mt-1 font-heading text-3xl font-bold">Needs attention</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Start here to see what needs a person. Open an item to review it and take the next step.</p></div>
      <button type="button" className={actionClass} disabled={loading} onClick={() => { setLoading(true); refresh() }}><RefreshCw size={16} />{loading ? 'Checking…' : 'Check again'}</button>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-400/40 bg-red-400/5 p-4 text-sm text-red-200"><p>{error}{data ? ' Showing the last successful check below.' : ''}</p><button type="button" className={`${actionClass} mt-3`} disabled={loading} onClick={() => { setLoading(true); refresh() }}>Try again</button></div>}
    {loading && !data && <p role="status" className="text-sm text-text-secondary">Checking the latest saved information…</p>}
    {data && <>
      <p className="text-xs text-text-muted">Last checked: <time dateTime={data.checked_at}>{checked}</time>{total > 0 ? ` · ${total} ${total === 1 ? 'item' : 'items'} to review` : ''}</p>
      {!total && <div className="flex items-start gap-3 rounded-xl border border-green-400/25 bg-green-400/5 p-5 sm:p-6"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-300" /><p className="font-medium">Nothing needs attention.</p></div>}
      {data.groups.map(group => <section key={group.area} aria-labelledby={`attention-${group.area}`}>
        <h2 id={`attention-${group.area}`} className="mb-3 text-lg font-semibold">{group.title}</h2>
        <ul className="grid gap-3 xl:gap-0 xl:divide-y xl:divide-white/10 xl:overflow-hidden xl:rounded-xl xl:border xl:border-white/15">
          {group.items.map(item => <li key={item.key} className="min-w-0 rounded-xl border border-white/15 bg-surface p-4 xl:rounded-none xl:border-0">
            <div className="grid min-w-0 gap-3 xl:grid-cols-[6rem_minmax(0,1fr)_4rem_8rem] xl:items-start">
              <span className={`w-fit rounded px-2 py-1 text-xs font-semibold ${item.severity === 'error' ? 'bg-red-400/10 text-red-200' : 'bg-amber-400/10 text-amber-200'}`}>{item.severity === 'error' ? 'Needs help' : 'Review'}</span>
              <div className="min-w-0"><h3 className="break-words font-semibold [overflow-wrap:anywhere]">{item.title}</h3><p className="mt-1 break-words text-sm leading-6 text-text-secondary [overflow-wrap:anywhere]">{item.explanation}</p></div>
              <span className="text-sm tabular-nums text-text-secondary"><strong className="font-semibold text-text-primary">{item.count}</strong><span className="xl:sr-only"> affected</span></span>
              <Link className={actionClass} to={item.href} aria-label={`Open: ${item.title}`}>Open <ArrowRight size={16} /></Link>
            </div>
          </li>)}
        </ul>
      </section>)}
    </>}
    <nav aria-label="Workspace shortcuts" className="flex flex-wrap gap-3 border-t border-white/10 pt-5">
      <Link className={actionClass} to="/admin/events">Events & Results</Link><Link className={actionClass} to="/admin/photos">Photos</Link><Link className={actionClass} to="/admin/help">Staff help</Link>
      {analyticsUrl && <a className={actionClass} href={analyticsUrl} target="_blank" rel="noopener noreferrer">PostHog analytics dashboard <ExternalLink size={16} /></a>}
    </nav>
  </div>
}
