import { AdminWriteButton } from '../AdminWriteControls'
import { useEffect, useState } from 'react'
import { api, type Event } from '../../../services/api'
import type { EditorSection } from './editorState'
import { readinessSection } from './editorState'
import { Field, SelectField } from './EditorFields'

export default function PublishingSection({
  event,
  dirty,
  onSelect,
  onUpdate,
  onBusyChange,
}: {
  event: Event
  dirty: boolean
  onSelect: (section: EditorSection) => void
  onUpdate: (event: Event, message: string) => void
  onBusyChange?: (busy: boolean) => void
}) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [status, setStatus] = useState<'upcoming' | 'live' | 'completed' | 'cancelled'>(
    event.status === 'live' || event.status === 'completed' || event.status === 'cancelled' ? event.status : 'upcoming'
  )
  useEffect(() => {
    setStatus(
      event.status === 'live' || event.status === 'completed' || event.status === 'cancelled'
        ? event.status
        : 'upcoming'
    )
  }, [event.status])
  const [reason, setReason] = useState('')
  const [override, setOverride] = useState(false)
  const [asjjfId, setAsjjfId] = useState(String(event.asjjf_info_id ?? event.asjjf_event_ids?.[0] ?? ''))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => {
    let active = true
    api
      .getCurrentUser()
      .then(({ user }) => {
        if (active) setIsAdmin(user.role === 'admin')
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const perform = async (action: 'publish' | 'unpublish' | 'fill' | 'verify') => {
    if (dirty || busy) return
    if (action === 'publish' && override && (reason.trim().length < 10 || reason.trim().length > 2000)) {
      setError('Override reason must be 10–2000 characters.')
      return
    }
    setBusy(true)
    onBusyChange?.(true)
    setError('')
    try {
      if (action === 'fill' || action === 'verify') {
        if (!/^\d+$/.test(asjjfId.trim()) || Number(asjjfId) < 1) throw new Error('Enter a positive ASJJF info ID.')
        const result =
          action === 'fill'
            ? await api.admin.fillEventFromAsjjf(event.id, Number(asjjfId))
            : await api.admin.verifyEventAgainstAsjjf(event.id, Number(asjjfId))
        onUpdate(result.event, result.message)
      } else {
        const result =
          action === 'publish'
            ? await api.admin.publishEvent(event.id, {
                status,
                ...(override && isAdmin ? { override_reason: reason.trim() } : {}),
              })
            : await api.admin.unpublishEvent(event.id)
        onUpdate(result.event, action === 'publish' ? 'Publishing status updated.' : 'Event returned to draft.')
        setReason('')
        setOverride(false)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed. Please retry.')
    } finally {
      setBusy(false)
      onBusyChange?.(false)
    }
  }
  return (
    <div className="space-y-6">
      <div className="border border-white/10 p-4 space-y-3">
        <h3 className="font-semibold">Publishing readiness</h3>
        <p className="text-sm text-text-secondary">
          {event.readiness
            ? `${event.readiness.completed} of ${event.readiness.total} checks complete.`
            : 'Readiness is unavailable. Save and reload to check before publishing.'}{' '}
          Checks reflect saved content.
        </p>
        {dirty && (
          <p role="status" className="text-sm text-amber-300">
            Save event changes and any open hotel or gallery edits before publishing or filling from ASJJF.
          </p>
        )}
        <ul className="divide-y divide-white/5">
          {event.readiness?.checks.map((check) => (
            <li key={check.key} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span>
                <span
                  className={check.complete ? 'text-emerald-300' : check.blocking ? 'text-red-300' : 'text-amber-300'}
                >
                  {check.complete ? 'Complete' : check.blocking ? 'Required' : 'Recommended'}
                </span>{' '}
                · {check.label}
              </span>
              {!check.complete && (
                <button
                  type="button"
                  className="shrink-0 px-3 text-gold"
                  aria-label={`Fix ${check.label}`}
                  onClick={() => onSelect(readinessSection(check.section))}
                >
                  Fix<span className="sr-only"> {check.label}</span>
                </button>
              )}
            </li>
          ))}
        </ul>
        <fieldset disabled={dirty || busy} className="min-w-0 space-y-3">
          <SelectField
            label="Public status"
            value={status}
            onChange={(value) => setStatus(value as typeof status)}
            options={['upcoming', 'live', 'completed', 'cancelled'].map((value) => ({
              value,
              label: value[0].toUpperCase() + value.slice(1),
            }))}
          />
          {isAdmin && !event.readiness?.publishable && (
            <>
              <label className="flex items-center gap-3 text-sm">
                <input type="checkbox" checked={override} onChange={(e) => setOverride(e.target.checked)} />
                Admin override
              </label>
              {override && (
                <Field
                  label="Override reason (10–2000 characters; recorded in history)"
                  value={reason}
                  onChange={setReason}
                />
              )}
            </>
          )}
          <div className="flex flex-wrap gap-3">
            <AdminWriteButton
              type="button"
              onClick={() => perform('publish')}
              disabled={
                !event.readiness?.publishable &&
                !(isAdmin && override && reason.trim().length >= 10 && reason.trim().length <= 2000)
              }
              className="px-4 bg-gold/10 text-gold disabled:opacity-40"
            >
              {busy ? 'Working…' : event.status === 'draft' ? 'Publish event' : 'Update public status'}
            </AdminWriteButton>
            {event.status !== 'draft' && (
              <AdminWriteButton
                type="button"
                onClick={() => perform('unpublish')}
                className="px-4 border border-white/10 text-text-secondary"
              >
                Unpublish to draft
              </AdminWriteButton>
            )}
          </div>
        </fieldset>
        <p className="text-sm text-text-muted">
          Current saved status: {event.status}. Overrides require administrator permission and a recorded reason.
        </p>
      </div>
      <fieldset disabled={dirty || busy} className="border border-white/10 p-4 space-y-3 min-w-0">
        <legend className="px-1 font-semibold">
          {event.status === 'draft' ? 'Fill official event information' : 'Verify against ASJJF'}
        </legend>
        <Field label="ASJJF info ID" value={asjjfId} onChange={setAsjjfId} />
        {event.status === 'draft' ? (
          <p className="text-sm text-text-secondary">
            Fills dates, venue, stars, fees and deadlines from a saved snapshot. Review any existing values before
            continuing. If unavailable, the server queues a fetch.
          </p>
        ) : (
          <p className="text-sm text-text-secondary">
            Checks that this event's dates and star rating match the saved ASJJF page and links it as evidence.
            Nothing on the public page changes.
          </p>
        )}
        <p className="text-sm text-text-muted">Snapshot status: {event.asjjf_info_status || 'Not linked'}</p>
        {event.status === 'draft' ? (
          <AdminWriteButton type="button" onClick={() => perform('fill')} className="px-4 border border-white/10 text-gold">
            Fill from ASJJF
          </AdminWriteButton>
        ) : (
          <AdminWriteButton type="button" onClick={() => perform('verify')} className="px-4 border border-white/10 text-gold">
            Verify against ASJJF
          </AdminWriteButton>
        )}
      </fieldset>
      {error && (
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="space-y-3">
        <h3 className="font-semibold">Audit history</h3>
        {!event.audit_entries?.length && <p className="text-sm text-text-muted">No recorded changes yet.</p>}
        <ol className="space-y-3">
          {event.audit_entries?.map((entry) => (
            <li key={entry.id} className="border-l-2 border-white/10 pl-3 text-sm space-y-1">
              <p>
                {entry.action.replaceAll('_', ' ')} · {entry.actor_name || 'System'}
              </p>
              <p className="text-text-secondary">
                {entry.from_status || '—'} → {entry.to_status || '—'}
              </p>
              {entry.reason && <p className="text-text-secondary">Reason: {entry.reason}</p>}
              <time className="text-text-muted" dateTime={entry.created_at}>
                {new Date(entry.created_at).toLocaleString()}
              </time>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}
