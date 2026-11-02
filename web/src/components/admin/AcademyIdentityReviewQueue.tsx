import { AdminWriteButton } from './AdminWriteControls'
import { useCallback, useEffect, useId, useState } from 'react'
import { api } from '../../services/api'
import type { AcademyIdentityReview } from '../../services/api'
import IdentityRecordPicker, { identityButtonClass } from './IdentityRecordPicker'
import type { IdentityRecord } from './IdentityRecordPicker'

export default function AcademyIdentityReviewQueue({ onResolved }: { onResolved: () => void }) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  return <section id="identity-reviews" className="mb-6 border border-white/15 bg-surface p-4 sm:p-5">
    <h2 className="text-base font-semibold text-text-primary">Academy identity review</h2>
    <p className="mt-2 mb-3 text-sm text-text-secondary">Check imported names that may refer to an existing gym. Link the name to a verified gym, or approve a new distinct gym.</p>
    <button type="button" disabled={busy} aria-expanded={open} onClick={() => setOpen(value => !value)} className={identityButtonClass}>{open ? 'Hide review queue' : 'Review pending names'}</button>
    {open && <ReviewList onResolved={onResolved} busy={busy} setBusy={setBusy} />}
  </section>
}

function ReviewList({ onResolved, busy, setBusy }: { onResolved: () => void; busy: boolean; setBusy: (value: boolean) => void }) {
  const [reviews, setReviews] = useState<AcademyIdentityReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    setLoading(true); setError('')
    api.admin.getIdentityReviews().then(response => {
      if (active) setReviews(response.reviews.filter(review => review.status === 'pending'))
    }).catch(err => { if (active) setError(err instanceof Error ? err.message : 'Could not load reviews.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [attempt])
  const resolved = useCallback((review: AcademyIdentityReview) => {
    setReviews(items => items.filter(item => item.id !== review.id))
    setSuccess(`Resolved “${review.raw_name}”.`)
    onResolved()
  }, [onResolved])
  return <div className="mt-4 space-y-4">
    <button type="button" disabled={busy || loading} onClick={() => { setSuccess(''); setAttempt(n => n + 1) }} className={identityButtonClass}>Refresh review queue</button>
    {loading && <p role="status" className="text-sm text-text-secondary">Loading pending reviews…</p>}
    {error && <p role="alert" className="text-sm text-red-300">{error} <button type="button" onClick={() => setAttempt(n => n + 1)} className={identityButtonClass}>Retry reviews</button></p>}
    {success && <p role="status" className="break-words text-sm text-green-300">{success}</p>}
    {!loading && !error && reviews.length === 0 && <p className="text-sm text-text-secondary">No pending academy names to review.</p>}
    {!loading && !error && reviews.map(review => <ReviewItem key={review.id} review={review} disabled={busy} setBusy={setBusy} onResolved={resolved} />)}
  </div>
}

function ReviewItem({ review, disabled, setBusy, onResolved }: {
  review: AcademyIdentityReview; disabled: boolean; setBusy: (busy: boolean) => void;
  onResolved: (review: AcademyIdentityReview) => void
}) {
  const id = useId()
  const [target, setTarget] = useState<IdentityRecord | null>(null)
  const [createNew, setCreateNew] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const choose = (record: IdentityRecord | null) => { setTarget(record); setCreateNew(false); setConfirmed(false); setError('') }
  const resolve = async () => {
    if (!confirmed || (!createNew && !target) || saving) return
    setSaving(true); setBusy(true); setError('')
    try {
      await api.admin.resolveIdentityReview(review.id, createNew ? { create_new: true, confirm: true } : { academy_id: target!.id })
      onResolved(review)
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Could not resolve this name.'} Your selection is preserved. Check the review queue before retrying if the connection was interrupted.`)
      setConfirmed(false)
    } finally { setSaving(false); setBusy(false) }
  }
  return <article className="min-w-0 space-y-4 border border-white/15 p-4">
    <h3 className="break-words font-semibold text-text-primary">{review.raw_name}</h3>
    <p className="text-sm text-text-secondary">{review.results_count} results await this identity decision.</p>
    {review.candidate_academy_id && <div className="space-y-2">
      <p className="break-words text-sm text-text-secondary">Suggested match: {review.candidate_name || 'Academy'} (ID {review.candidate_academy_id}). Verify it before linking.</p>
      <button type="button" disabled={disabled} onClick={() => choose({ id: review.candidate_academy_id!, name: review.candidate_name || `Academy ${review.candidate_academy_id}` })} className={identityButtonClass}>Select suggested gym</button>
    </div>}
    <fieldset disabled={disabled} className="min-w-0 space-y-4">
      {!createNew && <IdentityRecordPicker kind="academies" label={`Existing gym for ${review.raw_name}`} value={target} onChange={choose} disabled={disabled} />}
      <label htmlFor={`${id}-new`} className="flex items-start gap-3 py-2 text-sm text-text-primary cursor-pointer">
        <input id={`${id}-new`} type="checkbox" checked={createNew} onChange={e => { setCreateNew(e.target.checked); setTarget(null); setConfirmed(false); setError('') }} className="mt-1 size-5 shrink-0 accent-gold" />
        <span>This is a new, distinct gym. Create a gym using the imported name.</span>
      </label>
      {(createNew || target) && <>
        <p className="break-words text-sm text-text-secondary">{createNew ? `Create “${review.raw_name}” as a distinct gym.` : `Link “${review.raw_name}” to “${target!.name}” (ID ${target!.id}).`} This resolves {review.results_count} results and cannot be undone here.</p>
        <label htmlFor={`${id}-confirm`} className="flex items-start gap-3 py-2 text-sm text-text-primary cursor-pointer">
          <input id={`${id}-confirm`} type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-1 size-5 shrink-0 accent-gold" />
          <span>I verified this identity decision and its result count.</span>
        </label>
        <AdminWriteButton type="button" disabled={!confirmed || disabled} onClick={resolve} className={identityButtonClass}>{saving ? 'Resolving…' : createNew ? 'Approve new distinct gym' : 'Link to selected gym'}</AdminWriteButton>
      </>}
    </fieldset>
    {error && <p role="alert" className="break-words text-sm text-red-300">{error}</p>}
  </article>
}
