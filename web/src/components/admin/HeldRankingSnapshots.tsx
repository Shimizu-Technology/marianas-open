import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../services/api'
import RankingSnapshotReview from './RankingSnapshotReview'
import { asjjfButtonClass } from './AsjjfIntakePanel'

type Held = { id: number; url: string; fetched_at: string; ranking_apply_status: string; ranking_apply_error: string; counts: Record<string, number> }
type Response = { snapshots: Held[]; total: number; per_page: number }
function SavedSummary({ id }: { id: number }) {
  const { t } = useTranslation()
  const [summary, setSummary] = useState<unknown>()
  const [failed, setFailed] = useState(false)
  return <details onToggle={event => {
    if (!event.currentTarget.open || summary) return
    fetchApi<{ snapshot: { parsed_summary: unknown } }>(`/api/v1/admin/asjjf/snapshots/${id}`, {}, true)
      .then(data => { setSummary(data.snapshot.parsed_summary); setFailed(false) }).catch(() => setFailed(true))
  }}><summary className="min-h-11 cursor-pointer py-2 text-gold focus-visible:outline-2 focus-visible:outline-gold">{t('rankingAdmin.savedSummary')}</summary>
    {failed && <p role="alert">{t('rankingAdmin.loadError')}</p>}
    {summary ? <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-navy-900 p-3 text-xs text-text-secondary">{JSON.stringify(summary, null, 2)}</pre> : <p role="status">{t('rankingAdmin.loading')}</p>}
  </details>
}
export default function HeldRankingSnapshots({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation()
  const [data, setData] = useState<Response>()
  const [page, setPage] = useState(1)
  const [attempt, setAttempt] = useState(0)
  const [error, setError] = useState(false)
  useEffect(() => {
    let active = true
    fetchApi<Response>(`/api/v1/admin/asjjf/ranking_holds?page=${page}`, {}, true)
      .then(result => { if (active) { setData(result); setError(false) } }).catch(() => { if (active) setError(true) })
    return () => { active = false }
  }, [page, attempt])
  return <section aria-labelledby="held-rankings" className="space-y-3">
    <div className="flex items-center justify-between gap-3"><h2 id="held-rankings" className="font-heading text-lg font-bold text-text-primary">{t('rankingAdmin.holds')}</h2>
      <button type="button" onClick={() => setAttempt(value => value + 1)} className={asjjfButtonClass}>{t('rankingAdmin.refresh')}</button></div>
    {error && <p role="alert" className="text-red-400">{t('rankingAdmin.loadError')}</p>}
    {!data && !error && <p role="status" className="text-sm text-text-secondary">{t('rankingAdmin.loading')}</p>}
    {data?.total === 0 && <p className="text-sm text-text-secondary">{t('rankingAdmin.noHolds')}</p>}
    {data?.snapshots.map(snapshot => <article key={snapshot.id} className="space-y-3 rounded-xl border border-white/10 bg-surface p-4">
      <a href={snapshot.url} target="_blank" rel="noopener noreferrer" className="break-all text-sm text-gold underline">#{snapshot.id} · {snapshot.url}</a>
      <p className="text-xs text-text-secondary">{new Date(snapshot.fetched_at).toLocaleString()}</p>
      <SavedSummary id={snapshot.id} />
      <RankingSnapshotReview id={snapshot.id} status={snapshot.ranking_apply_status} error={snapshot.ranking_apply_error} isAdmin={isAdmin} />
    </article>)}
    {data && (page > 1 || data.total > data.per_page) && <nav className="flex items-center justify-between gap-3" aria-label={t('officialRankings.pagination')}>
      <button type="button" disabled={page <= 1} className={asjjfButtonClass} onClick={() => { setData(undefined); setPage(value => value - 1) }}>{t('officialRankings.previous')}</button>
      <span className="text-sm text-text-secondary">{t('officialRankings.page', { page })}</span>
      <button type="button" disabled={page * data.per_page >= data.total} className={asjjfButtonClass} onClick={() => { setData(undefined); setPage(value => value + 1) }}>{t('officialRankings.next')}</button>
    </nav>}
  </section>
}
