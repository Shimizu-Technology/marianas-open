import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, type Event as TournamentEvent, type ResultsSyncResponse, type ResultsSyncRun } from '../../services/api'
import ResultsSyncCard, { ResultsSyncBadge } from './ResultsSyncCard'
import EventResultsAdmin from '../../pages/admin/EventResultsAdmin'

const checkedAt = '2026-11-02T00:30:00Z'
const fixture: ResultsSyncRun = {
  id: 12, event_id: 7, trigger: 'snapshot', status: 'held',
  diff_summary: {
    added: 6, removed: 2, changed: 3, unchanged: 19,
    divisions: [{ division: 'NO-GI ADULT BLACK', asjjf_event_id: 2062, added: 6, removed: 2, changed: 3, unchanged: 19 }],
    relabeled_divisions: 1, messages: ['Adds 6 results across 1 division', 'Corrects 1 division labeled Gi that is actually No-Gi'],
    conflicts: [], missing: [], snapshot_ids: [101, 102, 103, 104, 105], fingerprint: 'fixture',
    approvable: true, first_import: false, unlinked_competitors: [],
  },
  guard_failures: ['First No-Gi relabel requires administrator approval'],
  applied_at: null, approved_by_id: null, discarded_at: null, error: null, created_at: checkedAt, updated_at: checkedAt,
}

function response(run: ResultsSyncRun | null = fixture): ResultsSyncResponse {
  return { run, status: run?.status ?? null, last_checked_at: run ? checkedAt : null }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>(done => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.spyOn(api.admin, 'getResultsSync').mockResolvedValue(response())
  vi.spyOn(api.admin, 'previewResultsSync').mockResolvedValue(response())
  vi.spyOn(api.admin, 'approveResultsSync').mockResolvedValue({
    run: { ...fixture, status: 'applied', approved_by_id: 3, applied_at: checkedAt }, status: 'applied',
  })
  vi.spyOn(api.admin, 'discardResultsSync').mockResolvedValue({
    run: { ...fixture, discarded_at: checkedAt }, status: 'held',
  })
})
afterEach(cleanup)

function View({ eventId = 7, isAdmin = true, onApplied = vi.fn() }: { eventId?: number; isAdmin?: boolean; onApplied?: () => void }) {
  return <MemoryRouter><Routes><Route element={<Outlet context={{ isAdmin }} />}>
    <Route path="*" element={<ResultsSyncCard eventId={eventId} onApplied={onApplied} />} />
  </Route></Routes></MemoryRouter>
}

describe.each([390, 1440])('results review interactions at %ipx (jsdom)', width => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
    window.dispatchEvent(new Event('resize'))
  })

  it('shows status, check time, human summary, totals and per-division detail', async () => {
    render(<View />)
    expect(await screen.findByText('Results: Needs review')).toBeTruthy()
    expect(screen.getByText(/Last checked:.*Nov 2, 2026.*10:30 AM ChST/)).toBeTruthy()
    expect(screen.getByText('Adds 6 results across 1 division')).toBeTruthy()
    expect(screen.getByText(/Division labels corrected: 1/)).toBeTruthy()
    const totals = screen.getAllByText('added', { selector: 'dt' })[0].closest('dl')!
    for (const [label, count] of [['added', '6'], ['removed', '2'], ['changed', '3'], ['unchanged', '19']]) {
      const term = within(totals).getByText(label, { selector: 'dt' })
      expect(term.nextElementSibling?.textContent).toBe(count)
    }
    fireEvent.click(screen.getByText('Per-division changes (1)'))
    const details = screen.getByText('Per-division changes (1)').closest('details')!
    expect(details.open).toBe(true)
    expect(within(details).getByText('NO-GI ADULT BLACK')).toBeTruthy()
    expect(within(details).getByText('ASJJF source: 2062')).toBeTruthy()
    expect(within(details).getByText('19')).toBeTruthy()
    expect(screen.getByText(/next nightly fetch is at 02:30 ChST/)).toBeTruthy()
  })

  it('lets staff inspect a hold but reserves approval and discard for administrators', async () => {
    render(<View isAdmin={false} />)
    expect(await screen.findByText(/An administrator is needed to approve or discard/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Discard review' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Refresh / review saved snapshots' }))
    expect(await screen.findByText(/Saved snapshots reviewed/)).toBeTruthy()
    expect(api.admin.previewResultsSync).toHaveBeenCalledWith(7)
    expect(api.admin.approveResultsSync).not.toHaveBeenCalled()
    expect(api.admin.discardResultsSync).not.toHaveBeenCalled()
  })

  it('displays missing pages, guards, protected conflicts and unlinked competitors while blocking approval', async () => {
    vi.mocked(api.admin.getResultsSync).mockResolvedValue(response({ ...fixture,
      diff_summary: { ...fixture.diff_summary, approvable: false,
        missing: ['Source 2062: FEMALE KIDS results list missing'],
        conflicts: [{ id: 40, division: 'NO-GI ADULT BLACK', competitor_name: 'Staff edited athlete', reason: 'Staff edit is protected' }],
        unlinked_competitors: [{ id: 41, competitor_name: 'Ambiguous athlete', reason: 'Multiple compatible identities' }],
      }, guard_failures: ['Invalid medal counts in NO-GI ADULT BLACK'],
    }))
    render(<View />)
    expect(await screen.findByText('Source 2062: FEMALE KIDS results list missing')).toBeTruthy()
    expect(screen.getByText(/Staff edited athlete.*Staff edit is protected/)).toBeTruthy()
    expect(screen.getByText(/Ambiguous athlete.*Multiple compatible identities/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Review competitor identities' }).getAttribute('href')).toBe('/admin/competitors')
    expect(screen.getByText('Invalid medal counts in NO-GI ADULT BLACK')).toBeTruthy()
    expect(screen.getByText(/Approval is blocked/)).toBeTruthy()
    const approve = screen.getByRole('button', { name: 'Approve review' })
    expect(approve).toHaveProperty('disabled', true)
    fireEvent.click(approve)
    expect(api.admin.approveResultsSync).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Discard review' })).toHaveProperty('disabled', false)
  })

  it('approves the exact held run once, shows the returned outcome and reloads published results', async () => {
    const pending = deferred<Awaited<ReturnType<typeof api.admin.approveResultsSync>>>()
    vi.mocked(api.admin.approveResultsSync).mockReturnValueOnce(pending.promise)
    const onApplied = vi.fn()
    render(<View onApplied={onApplied} />)
    const approve = await screen.findByRole('button', { name: 'Approve review' })
    fireEvent.click(approve)
    fireEvent.click(approve)
    expect(api.admin.approveResultsSync).toHaveBeenCalledExactlyOnceWith(7, 12)
    expect(screen.getByRole('button', { name: 'Approving…' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Discard review' })).toHaveProperty('disabled', true)
    await act(async () => pending.resolve({ run: { ...fixture, status: 'applied', applied_at: checkedAt, updated_at: '2026-11-02T01:30:00Z', approved_by_id: 3 }, status: 'applied' }))
    expect(await screen.findByText('Results: Synced')).toBeTruthy()
    expect(screen.getByText('Review approved. Published results have been synced.')).toBeTruthy()
    expect(screen.getByText(/Last checked:.*11:30 AM ChST/)).toBeTruthy()
    expect(onApplied).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
  })

  it('discards a review and prevents its later approval', async () => {
    render(<View />)
    fireEvent.click(await screen.findByRole('button', { name: 'Discard review' }))
    expect(await screen.findByText('Review discarded. Published results were kept.')).toBeTruthy()
    expect(api.admin.discardResultsSync).toHaveBeenCalledExactlyOnceWith(7, 12)
    expect(screen.getByText(/This review cannot be approved/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Discard review' })).toBeNull()
    vi.mocked(api.admin.previewResultsSync).mockResolvedValue(response({ ...fixture, discarded_at: checkedAt }))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh / review saved snapshots' }))
    await screen.findByText(/Saved snapshots reviewed/)
    expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
  })

  it('recovers from a stale approval by requiring a fresh saved-snapshot review', async () => {
    vi.mocked(api.admin.approveResultsSync).mockRejectedValueOnce(new Error('Results or snapshots changed. Refresh the preview before approving.'))
    vi.mocked(api.admin.previewResultsSync).mockResolvedValue(response({ ...fixture, id: 13 }))
    render(<View />)
    fireEvent.click(await screen.findByRole('button', { name: 'Approve review' }))
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Results or snapshots changed'))
    expect(screen.getByText('Review may be out of date')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Approve review' })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Discard review' })).toHaveProperty('disabled', true)
    fireEvent.click(screen.getByRole('button', { name: 'Retry saved review' }))
    expect(await screen.findByText(/Review #13/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.queryByText('Review may be out of date')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Approve review' }))
    await waitFor(() => expect(api.admin.approveResultsSync).toHaveBeenLastCalledWith(7, 13))
  })
})

it('shows loading and recovers from an unavailable initial status using saved snapshots', async () => {
  const pending = deferred<ResultsSyncResponse>()
  vi.mocked(api.admin.getResultsSync).mockReturnValue(pending.promise)
  render(<View />)
  expect(screen.getByRole('status').textContent).toBe('Loading results sync…')
  expect(screen.getByRole('button', { name: 'Refresh / review saved snapshots' })).toHaveProperty('disabled', true)
  await act(async () => pending.resolve(response(null)))
  expect(await screen.findByText(/No results sync runs yet/)).toBeTruthy()
  expect(screen.getByText('Last checked: Not checked yet')).toBeTruthy()
  cleanup()
  vi.mocked(api.admin.getResultsSync).mockRejectedValueOnce(new Error('Status unavailable'))
  render(<View />)
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Status unavailable'))
  fireEvent.click(screen.getByRole('button', { name: 'Retry saved review' }))
  expect(await screen.findByText('Results: Needs review')).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
})

it('preserves the last review after a failed refresh and clears stale notice on retry', async () => {
  vi.mocked(api.admin.previewResultsSync).mockRejectedValueOnce(new Error('Review unavailable'))
  render(<View />)
  await screen.findByText('Results: Needs review')
  fireEvent.click(screen.getByRole('button', { name: 'Refresh / review saved snapshots' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Showing the last loaded review'))
  expect(screen.getByText('Adds 6 results across 1 division')).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Approve review' })).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('button', { name: 'Retry saved review' }))
  expect(await screen.findByText(/Saved snapshots reviewed/)).toBeTruthy()
  expect(screen.queryByRole('alert')).toBeNull()
  expect(screen.getByRole('button', { name: 'Approve review' })).toHaveProperty('disabled', false)
})

it('requires a new review after a failed discard', async () => {
  vi.mocked(api.admin.discardResultsSync).mockRejectedValueOnce(new Error('Discard unavailable'))
  render(<View />)
  fireEvent.click(await screen.findByRole('button', { name: 'Discard review' }))
  expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('Discard unavailable'))
  expect(screen.getByRole('button', { name: 'Discard review' })).toHaveProperty('disabled', true)
  fireEvent.click(screen.getByRole('button', { name: 'Retry saved review' }))
  await screen.findByText(/Saved snapshots reviewed/)
  fireEvent.click(screen.getByRole('button', { name: 'Discard review' }))
  expect(await screen.findByText(/Review discarded. Published results were kept/)).toBeTruthy()
})

it('ignores a previous event response after navigation', async () => {
  const old = deferred<ResultsSyncResponse>()
  vi.mocked(api.admin.getResultsSync).mockReturnValueOnce(old.promise).mockResolvedValueOnce(response(null))
  const view = render(<View eventId={7} />)
  view.rerender(<View eventId={8} />)
  expect(await screen.findByText(/No results sync runs yet/)).toBeTruthy()
  await act(async () => old.resolve(response()))
  expect(screen.queryByText('Results: Needs review')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
})

it('ignores a previous event mutation response after navigation', async () => {
  const old = deferred<Awaited<ReturnType<typeof api.admin.approveResultsSync>>>()
  const onApplied = vi.fn()
  vi.mocked(api.admin.approveResultsSync).mockReturnValueOnce(old.promise)
  const view = render(<View eventId={7} onApplied={onApplied} />)
  fireEvent.click(await screen.findByRole('button', { name: 'Approve review' }))
  vi.mocked(api.admin.getResultsSync).mockResolvedValueOnce(response(null))
  view.rerender(<View eventId={8} onApplied={onApplied} />)
  expect(await screen.findByText(/No results sync runs yet/)).toBeTruthy()
  await act(async () => old.resolve({ run: { ...fixture, status: 'applied' }, status: 'applied' }))
  expect(onApplied).not.toHaveBeenCalled()
  expect(screen.queryByText(/Review approved/)).toBeNull()
})

it('fails closed without administrator route context', async () => {
  render(<MemoryRouter><ResultsSyncCard eventId={7} /></MemoryRouter>)
  expect(await screen.findByText(/An administrator is needed/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
})

it.each(['incomplete', 'no_changes', 'applied', 'failed'] as const)('shows a %s run without review decisions', async status => {
  vi.mocked(api.admin.getResultsSync).mockResolvedValue(response({ ...fixture, status,
    diff_summary: status === 'failed' ? {} : fixture.diff_summary,
    error: status === 'failed' ? 'Snapshot assembly failed' : null,
  }))
  render(<View />)
  await screen.findByText(/Review #12/)
  expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Discard review' })).toBeNull()
  if (status === 'failed') expect(screen.getByRole('alert').textContent).toBe('Sync error: Snapshot assembly failed')
})

it('never offers an already discarded held run for approval after reload', async () => {
  vi.mocked(api.admin.getResultsSync).mockResolvedValue(response({ ...fixture, discarded_at: checkedAt }))
  render(<View />)
  expect(await screen.findByText(/This review cannot be approved/)).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Approve review' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Discard review' })).toBeNull()
})

it('replaces the destructive importer on the results page and reloads its saved results after approval', async () => {
  const event: Partial<TournamentEvent> = {
    id: 7, name: 'Marianas Open', date: '2026-11-02', city: 'Hagåtña', country: 'Guam', status: 'completed', asjjf_source_urls: [],
  }
  vi.spyOn(api.admin, 'getEvent').mockResolvedValue({ event: event as TournamentEvent })
  vi.spyOn(api.admin, 'getEventResults').mockResolvedValue({ results: [], total: 0, page: 1, per_page: 100 })
  render(<MemoryRouter initialEntries={['/admin/events/7/results']}><Routes>
    <Route element={<Outlet context={{ isAdmin: true }} />}>
      <Route path="/admin/events/:eventId/results" element={<EventResultsAdmin />} />
    </Route>
  </Routes></MemoryRouter>)
  fireEvent.click(await screen.findByRole('button', { name: 'Approve review' }))
  expect(await screen.findByText('Review approved. Published results have been synced.')).toBeTruthy()
  await waitFor(() => expect(api.admin.getEventResults).toHaveBeenCalledTimes(2))
  expect(screen.getByRole('button', { name: 'Check ASJJF now' })).toBeTruthy()
  expect(screen.getByText('Upload saved ASJJF page')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Preview Import' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Confirm Import' })).toBeNull()
  expect(screen.queryByText(/Importing will replace all existing results/)).toBeNull()
})

it.each([
  [null, 'Not checked'], ['held', 'Needs review'], ['failed', 'Sync failed'],
  ['incomplete', 'Waiting for complete pages'], ['no_changes', 'Up to date'], ['applied', 'Synced'],
])('labels the compact event-list badge for %s', (status, label) => {
  render(<ResultsSyncBadge status={status} lastCheckedAt={checkedAt} />)
  expect(screen.getByText(`Results: ${label}`)).toHaveProperty('title', expect.stringContaining('10:30 AM ChST'))
})
