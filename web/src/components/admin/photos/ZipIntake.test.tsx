import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import ZipIntake from './ZipIntake';
import { enqueueZip, sendSavedZip, zipQueue, type SavedZip } from '../../../utils/zipIntake';

const identity = vi.hoisted(() => ({ userId: 'staff-a' }));
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => identity }));
vi.mock('../../../utils/zipIntake', () => ({
  ZIP_MAX_BYTES: 4 * 1024 ** 3,
  zipQueue: { load: vi.fn(), remove: vi.fn() },
  enqueueZip: vi.fn(), removeSavedZip: vi.fn(), sendSavedZip: vi.fn(),
  withZipIntakeLock: (_key: string, operation: () => Promise<unknown>) => operation(),
}));
const options = { album_type: 'Podium', category: '', timezone: 'Pacific/Guam', hold_flagged: false };
const record: SavedZip = { id: 'zip-a', key: 'staff-a:7', eventId: 7, file: new File(['zip'], 'private-staff-a.zip'), options };
const view = () => <ZipIntake eventId={7} options={options} onImported={() => {}} imports={[]} />;
beforeEach(() => {
  vi.clearAllMocks(); identity.userId = 'staff-a';
  vi.mocked(zipQueue.load).mockResolvedValue(undefined);
});
afterEach(cleanup);

it('aborts an account’s ZIP transfer and removes its filename when another account signs in', async () => {
  vi.mocked(zipQueue.load).mockImplementation(async key => key === record.key ? record : undefined);
  let transferSignal: AbortSignal | undefined;
  let ownerIsCurrent: (() => boolean) | undefined;
  vi.mocked(sendSavedZip).mockImplementation((_record, _progress, signal, isOwnerCurrent) => new Promise((_resolve, reject) => {
    transferSignal = signal;
    ownerIsCurrent = isOwnerCurrent;
    signal.addEventListener('abort', () => reject(new DOMException('Paused', 'AbortError')));
  }));
  const mounted = render(view());
  await screen.findByText('private-staff-a.zip');
  await waitFor(() => expect(transferSignal).toBeTruthy());
  identity.userId = 'staff-b'; mounted.rerender(view());
  expect(screen.queryByText('private-staff-a.zip')).toBeNull();
  expect(transferSignal?.aborted).toBe(true);
  expect(ownerIsCurrent?.()).toBe(false);
  await waitFor(() => expect(screen.getByLabelText('ZIP file')).toHaveProperty('disabled', false));
});

it('never starts a transfer after navigating away while the selected file is being saved', async () => {
  let saved!: () => void;
  vi.mocked(enqueueZip).mockImplementation(() => new Promise(resolve => { saved = resolve; }));
  const mounted = render(view());
  await waitFor(() => expect(screen.getByLabelText('ZIP file')).toHaveProperty('disabled', false));
  fireEvent.change(screen.getByLabelText('ZIP file'), { target: { files: [new File(['zip'], 'team.zip')] } });
  await waitFor(() => expect(enqueueZip).toHaveBeenCalledTimes(1));
  mounted.unmount(); saved();
  await Promise.resolve();
  expect(sendSavedZip).not.toHaveBeenCalled();
});
