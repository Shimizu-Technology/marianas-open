import { AdminWriteButton } from '../AdminWriteControls'
import { useState } from 'react'
import { api, type Event } from '../../../services/api'
import { Field, SelectField } from './EditorFields'
import EditorDialog from './EditorDialog'

export default function RolloverDialog({
  events,
  initialEventId,
  onClose,
  onComplete,
}: {
  events: Event[]
  initialEventId?: number
  onClose: () => void
  onComplete: (events: Event[], message: string) => void
}) {
  const initial = events.find((event) => event.id === initialEventId)
  const years = [
    ...new Set(
      events
        .map((event) => event.season_year ?? Number(event.date?.slice(0, 4)))
        .filter(Number.isFinite)
        .filter((year) => year >= 2000)
    ),
  ].sort((a, b) => b - a)
  const [scope, setScope] = useState(initial ? 'event' : 'season')
  const [eventId, setEventId] = useState(String(initialEventId ?? events[0]?.id ?? ''))
  const [sourceYear, setSourceYear] = useState(
    String(initial?.season_year ?? (Number(initial?.date?.slice(0, 4)) || years[0] || new Date().getFullYear()))
  )
  const [targetYear, setTargetYear] = useState(String(Number(sourceYear) + 1))
  const [keepTagline, setKeepTagline] = useState(false)
  const [ids, setIds] = useState<Record<number, string>>({})
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const sources =
    scope === 'event'
      ? events.filter((event) => event.id === Number(eventId))
      : events.filter((event) => (event.season_year ?? Number(event.date?.slice(0, 4))) === Number(sourceYear))
  const submit = async () => {
    const year = Number(targetYear)
    if (
      !Number.isInteger(year) ||
      year < 2000 ||
      year > 2100 ||
      (scope === 'season' && year <= Number(sourceYear)) ||
      sources.some((event) => year <= (event.season_year ?? (Number(event.date?.slice(0, 4)) || 0)))
    ) {
      setError('Choose a target year after the source season, between 2000 and 2100.')
      return
    }
    if (sources.length === 0) {
      setError('Choose at least one source event.')
      return
    }
    if (
      sources.some(
        (event) => ids[event.id]?.trim() && (!/^\d+$/.test(ids[event.id].trim()) || Number(ids[event.id]) < 1)
      )
    ) {
      setError('ASJJF IDs must be positive whole numbers, or blank.')
      return
    }
    setBusy(true)
    setError('')
    try {
      if (scope === 'event') {
        const source = sources[0]
        const result = await api.admin.cloneEvent(source.id, {
          target_year: year,
          keep_tagline: keepTagline,
          ...(ids[source.id]?.trim() ? { asjjf_event_id: Number(ids[source.id]) } : {}),
        })
        onComplete([result.event], result.message)
      } else {
        const mapping = Object.fromEntries(
          sources.filter((event) => ids[event.id]?.trim()).map((event) => [event.id, Number(ids[event.id])])
        )
        const result = await api.admin.rolloverEvents({
          source_year: Number(sourceYear),
          target_year: year,
          keep_tagline: keepTagline,
          ...(Object.keys(mapping).length ? { asjjf_event_ids: mapping } : {}),
        })
        onComplete(result.events, result.message)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rollover failed. Your selections are preserved.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <EditorDialog title="Prepare next season" onClose={onClose} busy={busy}>
      <p className="text-sm text-text-secondary mb-4">
        Create draft copies for review. Dates, registration, ticket links and prices, in-person contacts, prize amounts
        and hotel booking details are cleared for fresh review. Existing events stay unchanged.
      </p>
      <fieldset disabled={busy} className="space-y-4 min-w-0">
        <SelectField
          label="Copy scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: 'event', label: 'One event' },
            { value: 'season', label: 'Whole season' },
          ]}
        />
        {scope === 'event' ? (
          <SelectField
            label="Source event"
            value={eventId}
            onChange={setEventId}
            options={events.map((event) => ({ value: String(event.id), label: event.name }))}
          />
        ) : (
          <SelectField
            label="Source season"
            value={sourceYear}
            onChange={setSourceYear}
            options={years.map((year) => ({ value: String(year), label: String(year) }))}
          />
        )}
        <Field label="Target season year" type="number" value={targetYear} onChange={setTargetYear} />
        <label className="flex items-center gap-3 text-sm">
          <input type="checkbox" checked={keepTagline} onChange={(event) => setKeepTagline(event.target.checked)} />
          Keep taglines
        </label>
        <p className="text-sm text-text-secondary">
          {sources.length} {sources.length === 1 ? 'event' : 'events'} will be copied as drafts.
        </p>
        {sources.map((event) => (
          <Field
            key={event.id}
            label={`New ASJJF info ID — ${event.name} (optional)`}
            value={ids[event.id] || ''}
            onChange={(value) => setIds((previous) => ({ ...previous, [event.id]: value }))}
          />
        ))}
        <p className="text-sm text-text-muted">
          Optional IDs use saved ASJJF snapshots. If a snapshot is unavailable, a fetch is queued; review the draft when
          it arrives.
        </p>
      </fieldset>
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-300">
          {error}
        </p>
      )}
      <div className="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" disabled={busy} onClick={onClose} className="px-4 text-text-secondary">
          Cancel
        </button>
        <AdminWriteButton
          type="button"
          disabled={busy || !sources.length}
          onClick={submit}
          className="px-4 bg-gold/10 text-gold disabled:opacity-50"
        >
          {busy ? 'Creating drafts…' : 'Create draft copies'}
        </AdminWriteButton>
      </div>
    </EditorDialog>
  )
}
