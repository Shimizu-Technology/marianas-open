import { waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api, setAuthTokenGetter, type AuthenticatedRequestScope } from './api';
import { photoIntake } from './photoIntake';
import { sendSavedZip, type SavedZip } from '../utils/zipIntake';

afterEach(() => { vi.unstubAllGlobals(); setAuthTokenGetter(async () => null); });
const unauthorized = () => new Response(JSON.stringify({ error: 'Expired' }), { status: 401 });

it('does not retry a delayed 401 with a new account token, even before effect cleanup aborts the signal', async () => {
  let owner = 'A';
  let respond!: (response: Response) => void;
  const token = vi.fn(async () => `token-${owner}`);
  setAuthTokenGetter(token);
  const fetch = vi.fn(() => new Promise<Response>(resolve => { respond = resolve; }));
  vi.stubGlobal('fetch', fetch);
  const scope: AuthenticatedRequestScope = { signal: new AbortController().signal, isCurrent: () => owner === 'A' };
  const request = api.admin.completeEventGalleryDirectUpload(7, { signed_id: 'A-photo' }, scope);
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining('complete_direct_upload'), expect.objectContaining({ signal: scope.signal, headers: expect.objectContaining({ Authorization: 'Bearer token-A' }) }));
  owner = 'B'; respond(unauthorized());
  await expect(request).rejects.toHaveProperty('name', 'AbortError');
  expect(token).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('stops a queued ZIP completion retry after its session aborts', async () => {
  let respond!: (response: Response) => void;
  const token = vi.fn(async () => 'token-A'); setAuthTokenGetter(token);
  const fetch = vi.fn(() => new Promise<Response>(resolve => { respond = resolve; }));
  vi.stubGlobal('fetch', fetch);
  const abort = new AbortController();
  const request = photoIntake.completeZip(7, 'A-zip', { album_type: 'Podium', category: '', timezone: 'Pacific/Guam', hold_flagged: false }, { signal: abort.signal, isCurrent: () => !abort.signal.aborted });
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  abort.abort(); respond(unauthorized());
  await expect(request).rejects.toHaveProperty('name', 'AbortError');
  expect(token).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('checks ownership again after asynchronously refreshing an expired token', async () => {
  let owner = 'A';
  let refreshed!: (token: string) => void;
  const token = vi.fn().mockResolvedValueOnce('token-A').mockImplementationOnce(() => new Promise<string>(resolve => { refreshed = resolve; }));
  setAuthTokenGetter(token);
  const fetch = vi.fn().mockResolvedValue(unauthorized()); vi.stubGlobal('fetch', fetch);
  const request = api.admin.prepareEventGalleryDirectUpload(7, { filename: 'photo.jpg', checksum: 'hash', byte_size: 3, content_type: 'image/jpeg' }, { signal: new AbortController().signal, isCurrent: () => owner === 'A' });
  await waitFor(() => expect(token).toHaveBeenCalledTimes(2));
  owner = 'B'; refreshed('token-B');
  await expect(request).rejects.toHaveProperty('name', 'AbortError');
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('still retries an expired token once while the original owner is current', async () => {
  const token = vi.fn().mockResolvedValueOnce('expired-A').mockResolvedValueOnce('fresh-A'); setAuthTokenGetter(token);
  const fetch = vi.fn().mockResolvedValueOnce(unauthorized()).mockResolvedValueOnce(new Response(JSON.stringify({ batch: { id: 42 } }), { status: 201 }));
  vi.stubGlobal('fetch', fetch);
  const scope = { signal: new AbortController().signal, isCurrent: () => true };
  expect(await api.admin.createGalleryUploadBatch(7, { total_files: 1 }, scope)).toEqual({ batch: { id: 42 } });
  expect(token).toHaveBeenLastCalledWith({ skipCache: true });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls[1][1]).toMatchObject({ signal: scope.signal, headers: { Authorization: 'Bearer fresh-A' } });
});

function savedZip(): SavedZip {
  return { id: 'zip-A', key: 'A:7', eventId: 7, file: new File(['zip'], 'A.zip'), checksum: 'saved-checksum', uploaded: true,
    prepared: { signed_id: 'A-zip', direct_upload: { url: 'https://storage.invalid/A', headers: {} } },
    options: { album_type: 'Podium', category: '', timezone: 'Pacific/Guam', hold_flagged: false } };
}

it('keeps a resumed ZIP completion bound to its account before passive cleanup aborts', async () => {
  let owner = 'A';
  let respond!: (response: Response) => void;
  const token = vi.fn(async () => `token-${owner}`); setAuthTokenGetter(token);
  const fetch = vi.fn(() => new Promise<Response>(resolve => { respond = resolve; })); vi.stubGlobal('fetch', fetch);
  const signal = new AbortController().signal;
  const request = sendSavedZip(savedZip(), () => {}, signal, () => owner === 'A');
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
  owner = 'B'; respond(unauthorized());
  await expect(request).rejects.toHaveProperty('name', 'AbortError');
  expect(signal.aborted).toBe(false);
  expect(token).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledTimes(1);
});

it('checks the ZIP owner after an in-progress token refresh during preparation', async () => {
  let owner = 'A';
  let refreshed!: (token: string) => void;
  const token = vi.fn().mockResolvedValueOnce('token-A').mockImplementationOnce(() => new Promise<string>(resolve => { refreshed = resolve; })); setAuthTokenGetter(token);
  const fetch = vi.fn().mockResolvedValue(unauthorized()); vi.stubGlobal('fetch', fetch);
  const signal = new AbortController().signal;
  const request = sendSavedZip({ ...savedZip(), uploaded: false, prepared: undefined }, () => {}, signal, () => owner === 'A');
  await waitFor(() => expect(token).toHaveBeenCalledTimes(2));
  owner = 'B'; refreshed('token-B');
  await expect(request).rejects.toHaveProperty('name', 'AbortError');
  expect(signal.aborted).toBe(false);
  expect(fetch).toHaveBeenCalledTimes(1);
});
