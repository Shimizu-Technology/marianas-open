import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { api } from '../services/api';
import { useGalleryImagePolicy } from './useGalleryImagePolicy';
import { DEFAULT_GALLERY_IMAGE_POLICY, galleryImageAccept } from '../utils/galleryImagePolicy';

afterEach(() => vi.restoreAllMocks());
it('uses a safe picker until the API enables HEIC and updates after loading', async () => {
  let resolve!: (value: Awaited<ReturnType<typeof api.admin.getGalleryUploadPolicy>>) => void;
  vi.spyOn(api.admin, 'getGalleryUploadPolicy').mockReturnValue(new Promise(done => { resolve = done; }));
  const { result } = renderHook(() => useGalleryImagePolicy(7));
  expect(galleryImageAccept(result.current)).not.toContain('heic');
  await act(async () => resolve({ upload_policy: { ...DEFAULT_GALLERY_IMAGE_POLICY,
    content_types: [...DEFAULT_GALLERY_IMAGE_POLICY.content_types, 'image/heic'],
    extensions: [...DEFAULT_GALLERY_IMAGE_POLICY.extensions, '.heic'], type_label: 'JPEG, HEIC' } }));
  await waitFor(() => expect(galleryImageAccept(result.current)).toContain('.heic'));
});
it('keeps HEIC disabled on configuration failure', async () => {
  vi.spyOn(api.admin, 'getGalleryUploadPolicy').mockRejectedValue(new Error('offline'));
  const { result } = renderHook(() => useGalleryImagePolicy(7));
  await act(async () => {});
  expect(galleryImageAccept(result.current)).not.toContain('heic');
});
