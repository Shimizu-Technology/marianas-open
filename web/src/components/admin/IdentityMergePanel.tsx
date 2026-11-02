import { AdminWriteButton } from './AdminWriteControls'
import { useId, useState } from 'react'
import { api } from '../../services/api'
import type { IdentityMergeKeep, IdentityMergePreview } from '../../services/api'
import IdentityRecordPicker, { identityButtonClass } from './IdentityRecordPicker'
import type { IdentityKind, IdentityRecord } from './IdentityRecordPicker'

export default function IdentityMergePanel({ kind, source, disabled = false, onBusyChange, onMerged }: {
  kind: IdentityKind; source: IdentityRecord; disabled?: boolean; onBusyChange?: (busy: boolean) => void; onMerged: (target: IdentityRecord) => void
}) {
  const [target, setTarget] = useState<IdentityRecord | null>(null)
  const [busy, setBusy] = useState(false)
  const updateBusy = (value: boolean) => { setBusy(value); onBusyChange?.(value) }
  const noun = kind === 'academies' ? 'academy' : 'competitor'
  return <section aria-label={`Merge ${noun}`} className="min-w-0 space-y-4 border border-red-400/30 p-4 sm:p-5">
    <h3 className="text-base font-semibold text-text-primary">Merge duplicate {noun}</h3>
    <p className="text-sm text-text-secondary">Use this only for two records of the same {noun}. To correct a name, edit the profile above and save. Separate branches or people should stay separate.</p>
    {disabled && <p role="status" className="text-sm text-text-secondary">Save profile changes and finish loading the profile before merging.</p>}
    <IdentityRecordPicker kind={kind} label="Keep this record" excludeId={source.id} value={target}
      disabled={disabled || busy} onChange={setTarget} />
    {target && <MergeConfirmation key={`${source.id}:${target.id}`} kind={kind} source={source} target={target}
      disabled={disabled} setBusy={updateBusy} onMerged={onMerged} />}
  </section>
}

function MergeConfirmation({ kind, source, target, disabled, setBusy, onMerged }: {
  kind: IdentityKind; source: IdentityRecord; target: IdentityRecord; disabled: boolean;
  setBusy: (value: boolean) => void; onMerged: (target: IdentityRecord) => void
}) {
  const id = useId()
  const [preview, setPreview] = useState<IdentityMergePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [merging, setMerging] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [warningsConfirmed, setWarningsConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [keep, setKeep] = useState<IdentityMergeKeep>({})
  const getPreview = async () => {
    setLoading(true); setBusy(true); setError(''); setPreview(null); setConfirmed(false); setWarningsConfirmed(false)
    try {
      const response = kind === 'academies'
        ? await api.admin.previewAcademyMerge(source.id, target.id)
        : await api.admin.previewCompetitorMerge(source.id, target.id)
      if (response.source.id !== source.id || response.target.id !== target.id) throw new Error('Preview did not match the selected records. Reload the preview.')
      setKeep(Object.fromEntries((response.conflicts ?? []).map(conflict => [conflict.field, 'target'])))
      setPreview(response)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load merge preview. Try again.') }
    finally { setLoading(false); setBusy(false) }
  }
  const merge = async () => {
    if (!preview || preview.blocked || disabled || !confirmed || (preview.warnings.length > 0 && !warningsConfirmed) || merging) return
    setMerging(true); setBusy(true); setError('')
    try {
      if (kind === 'academies') await api.admin.mergeAcademy(source.id, target.id, keep)
      else await api.admin.mergeCompetitor(source.id, target.id, preview.review_token, warningsConfirmed, keep)
      onMerged({ id: preview.target.id, name: preview.target.name })
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Merge failed.'} The merge was not confirmed. Reload the preview to check the current records before trying again.`)
      setPreview(null); setConfirmed(false); setWarningsConfirmed(false)
    } finally { setMerging(false); setBusy(false) }
  }
  return <div className="space-y-3">
    <button type="button" disabled={disabled || loading || merging} onClick={getPreview} className={identityButtonClass}>{loading ? 'Loading preview…' : 'Preview merge'}</button>
    {error && <p role="alert" className="break-words text-sm text-red-300">{error}</p>}
    {preview && <div className="space-y-4 text-sm text-text-secondary" aria-live="polite">
      <p className="break-words"><strong className="text-text-primary">Remove:</strong> {preview.source.name} (ID {preview.source.id})</p>
      <p className="break-words"><strong className="text-text-primary">Keep:</strong> {preview.target.name} (ID {preview.target.id})</p>
      <p><strong className="text-text-primary">{preview.results_count} results</strong>{preview.athletes_count !== undefined && <> and <strong className="text-text-primary">{preview.athletes_count} athletes</strong></>} will move to the kept record. The source record will be removed. This cannot be undone here.</p>
      {(preview.conflicts ?? []).length > 0 && <div className="min-w-0 space-y-3">
        <p className="font-semibold text-text-primary">Choose profile values to keep</p>
        <p>Empty fields copy from the source automatically. Conflicting values default to the kept record. Discarded values are recorded in the audit log.</p>
        {preview.conflicts?.map(conflict => <fieldset key={conflict.field} className="min-w-0 border border-white/20 p-3">
          <legend className="px-1 font-semibold capitalize text-text-primary">{conflict.field.replaceAll('_', ' ')}</legend>
          {(['target', 'source'] as const).map(choice => <label key={choice} className="flex min-w-0 cursor-pointer items-start gap-3 py-2">
            <input type="radio" name={`${id}-${conflict.field}`} value={choice} checked={keep[conflict.field] === choice}
              disabled={disabled || merging} onChange={() => setKeep(values => ({ ...values, [conflict.field]: choice }))} className="mt-1 size-5 shrink-0 accent-gold" />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]"><strong>{choice === 'target' ? 'Kept record' : 'Source'}:</strong> {profileValue(conflict[choice])}</span>
          </label>)}
        </fieldset>)}
      </div>}
      {preview.warnings.length > 0 && <div className="border border-amber-400/40 p-3">
        <p className="font-semibold text-amber-200">Review these warnings before continuing</p>
        <ul className="list-disc pl-5 space-y-1 break-words">{preview.warnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul>
      </div>}
      {preview.blocked ? <p role="alert" className="text-red-300">This merge is blocked. Correct the conflicting records before trying again.</p> : <>
        {preview.warnings.length > 0 && <label htmlFor={`${id}-warnings`} className="flex items-start gap-3 py-2 cursor-pointer">
          <input id={`${id}-warnings`} type="checkbox" checked={warningsConfirmed} disabled={disabled || merging} onChange={e => setWarningsConfirmed(e.target.checked)} className="mt-1 size-5 shrink-0 accent-gold" />
          <span>I reviewed every warning and verified these records belong to the same {kind === 'academies' ? 'gym' : 'person'}.</span>
        </label>}
        <label htmlFor={`${id}-confirm`} className="flex items-start gap-3 py-2 cursor-pointer">
          <input id={`${id}-confirm`} type="checkbox" checked={confirmed} disabled={disabled || merging} onChange={e => setConfirmed(e.target.checked)} className="mt-1 size-5 shrink-0 accent-gold" />
          <span className="break-words">Permanently merge {preview.source.name} into {preview.target.name}, moving {preview.results_count} results{preview.athletes_count !== undefined ? ` and ${preview.athletes_count} athletes` : ''}.</span>
        </label>
        <AdminWriteButton type="button" disabled={disabled || merging || !confirmed || (preview.warnings.length > 0 && !warningsConfirmed)} onClick={merge}
          className="min-h-11 w-full sm:w-auto border border-red-400/40 px-4 py-2 text-sm font-semibold text-red-300 hover:bg-red-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-300 disabled:opacity-50 disabled:cursor-not-allowed">{merging ? 'Merging…' : 'Permanently merge records'}</AdminWriteButton>
      </>}
    </div>}
  </div>
}

function profileValue(value: unknown): string {
  if (value && typeof value === 'object' && 'filename' in value) return String(value.filename)
  return typeof value === 'object' ? JSON.stringify(value) : String(value)
}
