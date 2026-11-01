import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { api } from '../../services/api'
import AcademyIdentityReviewQueue from './AcademyIdentityReviewQueue'
import { academyFixture, listResponse } from './identityFixtures'

const review = { id: 11, raw_name: 'Imported Gym', candidate_academy_id: 2, candidate_name: 'Target Gym', status: 'pending', results_count: 9 }
beforeEach(() => {
  vi.spyOn(api.admin, 'getIdentityReviews').mockResolvedValue({ reviews: [review] })
  vi.spyOn(api.admin, 'resolveIdentityReview').mockResolvedValue({})
  vi.spyOn(api.admin, 'getAcademies').mockResolvedValue({ academies: [academyFixture()], ...listResponse })
})
afterEach(() => { cleanup(); vi.restoreAllMocks() })
const openQueue = async (onResolved = vi.fn()) => {
  render(<AcademyIdentityReviewQueue onResolved={onResolved} />)
  expect(api.admin.getIdentityReviews).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Review pending names' }))
  await screen.findByText('Imported Gym')
}
it('links a pending name only after explicit candidate selection and confirmation', async () => {
  const onResolved = vi.fn()
  await openQueue(onResolved)
  expect(screen.getByText('9 results await this identity decision.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Link to selected gym' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Select suggested gym' }))
  expect((screen.getByRole('button', { name: 'Link to selected gym' }) as HTMLButtonElement).disabled).toBe(true)
  fireEvent.click(screen.getByRole('checkbox', { name: 'I verified this identity decision and its result count.' }))
  fireEvent.click(screen.getByRole('button', { name: 'Link to selected gym' }))
  await waitFor(() => expect(api.admin.resolveIdentityReview).toHaveBeenCalledWith(11, { academy_id: 2 }))
  await screen.findByText('No pending academy names to review.')
  expect(onResolved).toHaveBeenCalledOnce()
})
it('approves a distinct gym with create_new and confirm, clearing any selected candidate', async () => {
  await openQueue()
  fireEvent.click(screen.getByRole('button', { name: 'Select suggested gym' }))
  fireEvent.click(screen.getByRole('checkbox', { name: /This is a new, distinct gym/ }))
  expect(screen.queryByRole('button', { name: 'Link to selected gym' })).toBeNull()
  expect(screen.getByText(/Create “Imported Gym” as a distinct gym/)).toBeTruthy()
  fireEvent.click(screen.getByRole('checkbox', { name: 'I verified this identity decision and its result count.' }))
  fireEvent.click(screen.getByRole('button', { name: 'Approve new distinct gym' }))
  await waitFor(() => expect(api.admin.resolveIdentityReview).toHaveBeenCalledWith(11, { create_new: true, confirm: true }))
})
it('preserves the selected gym after an error and requires renewed confirmation', async () => {
  vi.mocked(api.admin.resolveIdentityReview).mockRejectedValueOnce(new Error('Already resolved'))
  await openQueue()
  fireEvent.click(screen.getByRole('button', { name: 'Select suggested gym' }))
  fireEvent.click(screen.getByRole('checkbox', { name: 'I verified this identity decision and its result count.' }))
  fireEvent.click(screen.getByRole('button', { name: 'Link to selected gym' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Already resolved')
  expect(screen.getByText(/Link “Imported Gym” to “Target Gym”/)).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Link to selected gym' }) as HTMLButtonElement).disabled).toBe(true)
})
it('shows retry for a failed queue load and excludes already resolved reviews', async () => {
  vi.mocked(api.admin.getIdentityReviews).mockRejectedValueOnce(new Error('Session expired')).mockResolvedValueOnce({ reviews: [{ ...review, status: 'resolved' }] })
  render(<AcademyIdentityReviewQueue onResolved={vi.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: 'Review pending names' }))
  expect((await screen.findByRole('alert')).textContent).toContain('Session expired')
  fireEvent.click(screen.getByRole('button', { name: 'Retry reviews' }))
  await screen.findByText('No pending academy names to review.')
  expect(screen.queryByText('Imported Gym')).toBeNull()
})
