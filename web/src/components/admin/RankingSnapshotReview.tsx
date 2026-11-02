import { AdminWriteButton } from './AdminWriteControls'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../../services/api'
import { asjjfButtonClass } from './AsjjfIntakePanel'

export default function RankingSnapshotReview({ id, status, error, isAdmin }: { id: number; status?: string | null; error?: string | null; isAdmin: boolean }) {
  const { t } = useTranslation()
  const [confirmed, setConfirmed] = useState(false)
  const [sending, setSending] = useState(false)
  const [queued, setQueued] = useState(false)
  const [failed, setFailed] = useState(false)
  if (!status) return null
  async function approve() {
    setSending(true)
    setFailed(false)
    try {
      await fetchApi(`/api/v1/admin/asjjf/snapshots/${id}/apply_ranking`, { method: 'POST', body: JSON.stringify({ confirm: true }) }, true)
      setQueued(true)
    } catch { setFailed(true) } finally { setSending(false) }
  }
  return <div className="space-y-3 rounded-lg border border-white/10 p-3 text-sm">
    <p className="text-text-secondary">{t('rankingAdmin.applyStatus')}: {t(`rankingAdmin.status.${status}`, status)}</p>
    {error && <p className="break-words text-red-400">{error}</p>}
    {isAdmin && status === 'rejected' && (error?.startsWith('Row count decreased') || error?.startsWith('Division inventory changed')) && !queued && <>
      <label className="flex min-h-11 items-center gap-3 text-text-primary"><input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />{t('rankingAdmin.reviewed')}</label>
      <AdminWriteButton type="button" className={asjjfButtonClass} disabled={!confirmed || sending} onClick={approve}>{t('rankingAdmin.approveReduction')}</AdminWriteButton>
    </>}
    {queued && <p role="status" className="text-green-400">{t('rankingAdmin.queued')}</p>}
    {failed && <p role="alert" className="text-red-400">{t('rankingAdmin.reviewError')}</p>}
  </div>
}
