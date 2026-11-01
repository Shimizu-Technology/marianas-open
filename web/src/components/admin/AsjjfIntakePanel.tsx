import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../../services/api'

const fieldClass = 'mt-1 min-h-11 w-full rounded-lg border border-white/15 bg-navy-900 px-3 py-2 text-base text-text-primary focus-visible:outline-2 focus-visible:outline-gold'
export const asjjfButtonClass = 'inline-flex min-h-11 items-center justify-center rounded-lg border border-gold/30 bg-gold/10 px-4 py-2 text-sm font-medium text-gold hover:bg-gold/15 focus-visible:outline-2 focus-visible:outline-gold disabled:cursor-wait disabled:opacity-60'

export default function AsjjfIntakePanel({ eventId }: { eventId?: number }) {
  const formId = useId()
  const [checking, setChecking] = useState(false)
  const [checkMessage, setCheckMessage] = useState('')
  const [checkError, setCheckError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState('')
  const [uploadError, setUploadError] = useState('')

  async function checkNow() {
    if (eventId === undefined || checking) return
    setChecking(true)
    setCheckError('')
    setCheckMessage('')
    try {
      const { queued_count } = await api.admin.checkAsjjf(eventId)
      setCheckMessage(queued_count > 0
        ? "Queued. Our fetcher checks ASJJF overnight; you'll see snapshots here after it runs."
        : 'No new pages queued. Check ASJJF sync for pending checks and snapshots.')
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : 'Could not queue a check. Try again.')
    } finally {
      setChecking(false)
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading) return
    const form = event.currentTarget
    const data = new FormData(form)
    const file = data.get('file')
    setUploadError('')
    setUploadMessage('')
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.html') || file.size === 0) {
      setUploadError('Choose a saved .html page with content.')
      return
    }
    setUploading(true)
    try {
      const result = await api.admin.uploadAsjjfSnapshot(data)
      setUploadMessage(`Snapshot #${result.snapshot_id} saved. Parse status: ${result.parse_status}. Refresh ASJJF sync to see the latest parse status and summary.`)
      form.reset()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Could not upload this page. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <section aria-labelledby={`${formId}-heading`} className="mb-6 space-y-4 rounded-xl border border-white/10 bg-surface p-4 sm:p-5">
      <div>
        <h2 id={`${formId}-heading`} className="font-heading text-lg font-bold text-text-primary">ASJJF snapshots</h2>
        <p className="mt-1 text-sm text-text-secondary">Save ASJJF pages for review. Snapshots won't yet replace published results.</p>
        {eventId !== undefined && <Link to="/admin/asjjf" className="mt-2 inline-flex min-h-11 items-center text-sm text-gold underline underline-offset-4">View ASJJF sync status</Link>}
      </div>
      {eventId !== undefined && (
        <div className="space-y-2">
          <button type="button" onClick={checkNow} disabled={checking} className={asjjfButtonClass}>
            {checking ? 'Queuing check…' : 'Check ASJJF now'}
          </button>
          <p className="text-sm text-text-secondary">Our fetcher checks ASJJF overnight. This queues a check for this event.</p>
          {checkMessage && <p role="status" className="text-sm text-green-400">{checkMessage}</p>}
          {checkError && <p role="alert" className="break-words text-sm text-red-400">{checkError}</p>}
        </div>
      )}
      <details className="border-t border-white/10 pt-3">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium text-text-primary focus-visible:outline-2 focus-visible:outline-gold">Upload saved ASJJF page</summary>
        <p id={`${formId}-help`} className="mb-4 text-sm text-text-secondary">Save the ASJJF page as HTML in your browser, then upload the .html file with its original URL. Parsing may take a moment.</p>
        <form onSubmit={upload} encType="multipart/form-data" aria-describedby={`${formId}-help`} className="space-y-4">
          <fieldset disabled={uploading} className="min-w-0 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-text-secondary" htmlFor={`${formId}-type`}>Page type
                <select id={`${formId}-type`} name="page_type" required defaultValue="event_results" className={fieldClass}>
                  <option value="event_results">Event results</option>
                  <option value="results_list">Results list</option>
                  <option value="event_info">Event information</option>
                  <option value="season_calendar">Season calendar</option>
                  <option value="team_ranking">Team ranking</option>
                  <option value="individual_ranking">Individual ranking</option>
                  <option value="individual_ranking_division">Individual division ranking</option>
                </select>
              </label>
              <label className="block text-sm text-text-secondary" htmlFor={`${formId}-url`}>Original ASJJF URL
                <input id={`${formId}-url`} name="url" type="url" required placeholder="https://asjjf.org/main/eventResults/1234" className={fieldClass} />
              </label>
            </div>
            <label className="block text-sm text-text-secondary" htmlFor={`${formId}-file`}>Saved HTML file
              <input id={`${formId}-file`} name="file" type="file" accept=".html,text/html" required className={`${fieldClass} file:mr-3 file:rounded file:border-0 file:bg-gold/10 file:px-3 file:py-1 file:text-sm file:text-gold`} />
            </label>
            <button type="submit" className={asjjfButtonClass}>{uploading ? 'Uploading…' : 'Upload saved page'}</button>
          </fieldset>
          {uploadMessage && <p role="status" className="break-words text-sm text-green-400">{uploadMessage}</p>}
          {uploadError && <p role="alert" className="break-words text-sm text-red-400">{uploadError}</p>}
        </form>
      </details>
    </section>
  )
}
