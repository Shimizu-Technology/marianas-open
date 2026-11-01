/// <reference types="node" />
import { useLayoutEffect } from 'react';
import { createHash } from 'node:crypto';
import { Blob as NodeBlob, File as NodeFile } from 'node:buffer';
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider } from '../contexts/AuthContext';
import { GalleryUploadProvider, GalleryUploadStatusPanel, useGalleryUploads } from '../contexts/GalleryUploadContext';
import { api } from '../services/api';
import type { EventGalleryImage, EventGalleryUploadBatch } from '../services/api';
import { GalleryUploadQueueStore, GALLERY_QUEUE_STORAGE_ERROR } from './galleryUploadQueue';
import imageCompression from 'browser-image-compression';

vi.mock('../services/api', () => ({ api: { admin: {
  createGalleryUploadBatch: vi.fn(), prepareEventGalleryDirectUpload: vi.fn(), completeEventGalleryDirectUpload: vi.fn(),
} } }));
vi.mock('browser-image-compression', () => ({ default: vi.fn() }));
let queue: ReturnType<typeof useGalleryUploads>;
let transfers: number;
let reads: number;
const store = new GalleryUploadQueueStore();
const options = (files = [new File(['image'], 'match.jpg', { type: 'image/jpeg' })]) => ({ eventId: 1, eventName: 'Copa', files, active: false, caption: 'Day 1', category: 'day-1', startSortOrder: 0 });
function Observer() {
  const uploads = useGalleryUploads();
  useLayoutEffect(() => { queue = uploads; });
  return <><output data-testid="tasks">{JSON.stringify(uploads.tasks.map(({ id, status, progress }) => ({ id, status, progress })))}</output><GalleryUploadStatusPanel /></>;
}
function View({ owner = 'clerk-a' }: { owner?: string | null }) {
  return <AuthProvider value={{ isClerkEnabled: true, isSignedIn: Boolean(owner), isLoading: false, userId: owner }}>
    <GalleryUploadProvider><Observer /></GalleryUploadProvider>
  </AuthProvider>;
}

beforeEach(() => {
  vi.stubGlobal('indexedDB', new IDBFactory());
  vi.stubGlobal('File', NodeFile);
  vi.stubGlobal('Blob', NodeBlob);
  vi.stubGlobal('BroadcastChannel', undefined);
  transfers = 0; reads = 0;
  vi.stubGlobal('FileReader', class {
    result: ArrayBuffer | undefined;
    onload?: () => void;
    onerror?: () => void;
    readAsArrayBuffer(blob: Blob) {
      reads++;
      void blob.arrayBuffer().then(value => { const local = new ArrayBuffer(value.byteLength); new Uint8Array(local).set(new Uint8Array(value)); this.result = local; this.onload?.(); }).catch(() => this.onerror?.());
    }
  });
  vi.stubGlobal('XMLHttpRequest', class {
    status = 200;
    upload = { onprogress: undefined as undefined | ((event: { lengthComputable: boolean; loaded: number; total: number }) => void) };
    onload?: () => void;
    onabort?: () => void;
    open() {}
    setRequestHeader() {}
    send(file: File) {
      transfers++;
      queueMicrotask(() => { this.upload.onprogress?.({ lengthComputable: true, loaded: file.size, total: file.size }); this.onload?.(); });
    }
    abort() { this.onabort?.(); }
  });
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:fixture'), revokeObjectURL: vi.fn() }));
  const tails = new Map<string, Promise<unknown>>();
  Object.defineProperty(navigator, 'locks', { configurable: true, value: { request: vi.fn((name: string, _options: unknown, callback: () => Promise<unknown>) => {
    const next = (tails.get(name) || Promise.resolve()).then(callback);
    tails.set(name, next.catch(() => undefined)); return next;
  }) } });
  vi.mocked(api.admin.createGalleryUploadBatch).mockResolvedValue({ batch: { id: 8 } as EventGalleryUploadBatch });
  vi.mocked(api.admin.prepareEventGalleryDirectUpload).mockResolvedValue({ signed_id: 'signed-fixture', direct_upload: { url: 'https://storage.invalid/photo', headers: {} } } as Awaited<ReturnType<typeof api.admin.prepareEventGalleryDirectUpload>>);
  vi.mocked(api.admin.completeEventGalleryDirectUpload).mockResolvedValue({ gallery_image: { id: 22 } as EventGalleryImage });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); });

describe('GalleryUploadProvider persisted user journeys (jsdom, mock API/storage)', () => {
  it('saves the files before network work and exposes quota failure without starting an upload', async () => {
    const add = IDBObjectStore.prototype.add;
    vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<typeof add>) {
      if (this.name === 'files') throw new DOMException('Full', 'QuotaExceededError');
      return add.apply(this, args);
    });
    render(<View />);
    await act(async () => { await expect(queue.startUpload(options())).rejects.toThrow(GALLERY_QUEUE_STORAGE_ERROR); });
    expect(screen.getByRole('alert').textContent).toContain('Browser storage may be full');
    expect(api.admin.createGalleryUploadBatch).not.toHaveBeenCalled();
    expect(api.admin.prepareEventGalleryDirectUpload).not.toHaveBeenCalled();
    expect(await store.list('clerk-a')).toEqual([]);
  });

  it('restores failed completion after reload, retries the same signed ID and clears file bytes', async () => {
    vi.mocked(api.admin.completeEventGalleryDirectUpload).mockRejectedValueOnce(new Error('Response lost'));
    const view = render(<View />);
    await act(async () => { await queue.startUpload(options()); });
    await waitFor(() => expect(queue.failedCount).toBe(1));
    const id = queue.tasks[0].id;
    expect(screen.getByText(/Locking your phone or switching apps may pause uploads/)).toBeTruthy();
    expect(queue.tasks[0]).toMatchObject({ progress: 90, bytesUploaded: 5 });
    view.unmount();
    render(<View />);
    await waitFor(() => expect(queue.failedCount).toBe(1));
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed' }));
    await waitFor(() => expect(queue.completedCount).toBe(1));
    expect(api.admin.prepareEventGalleryDirectUpload).toHaveBeenCalledTimes(1);
    expect(api.admin.completeEventGalleryDirectUpload).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.admin.completeEventGalleryDirectUpload).mock.calls.map(([, input]) => input.signed_id)).toEqual(['signed-fixture', 'signed-fixture']);
    expect(transfers).toBe(1); expect(reads).toBe(1);
    expect(queue.tasks[0].progress).toBe(100);
    fireEvent.click(screen.getByRole('button', { name: 'Clear complete' }));
    await waitFor(() => expect(queue.tasks).toEqual([]));
    expect(await store.file('clerk-a', id)).toBeUndefined();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });

  it('accepts 101 files and creates backend batches of 100 and 1 without truncating the selection', async () => {
    vi.mocked(api.admin.createGalleryUploadBatch).mockImplementation(async (_eventId, input) => {
      const records = await store.list('clerk-a');
      expect(records).toHaveLength(101); // full selection is durable before first network call
      expect(input.total_files).toBeLessThanOrEqual(100);
      return { batch: { id: input.total_files === 100 ? 100 : 101 } as EventGalleryUploadBatch };
    });
    render(<View />);
    const files = Array.from({ length: 101 }, (_, i) => new File(['image'], `${i}.jpg`, { type: 'image/jpeg' }));
    await act(async () => { await queue.startUpload(options(files)); });
    await waitFor(() => expect(queue.completedCount).toBe(101), { timeout: 25000 });
    expect(api.admin.createGalleryUploadBatch).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.admin.createGalleryUploadBatch).mock.calls.map(([, input]) => input.total_files).sort((a, b) => a! - b!)).toEqual([1, 100]);
    expect(transfers).toBe(101);
    expect(api.admin.completeEventGalleryDirectUpload).toHaveBeenCalledTimes(101);
  }, 30000);

  it('hides the old account immediately and prevents later work after sign-out/account switch', async () => {
    let finishBatch!: (value: { batch: EventGalleryUploadBatch }) => void;
    vi.mocked(api.admin.createGalleryUploadBatch).mockImplementationOnce(() => new Promise(resolve => { finishBatch = resolve; }));
    const view = render(<View />);
    await act(async () => { await queue.startUpload(options()); });
    await waitFor(() => expect(api.admin.createGalleryUploadBatch).toHaveBeenCalledTimes(1));
    view.rerender(<View owner="clerk-b" />);
    expect(queue.tasks).toEqual([]);
    await act(async () => { finishBatch({ batch: { id: 8 } as EventGalleryUploadBatch }); });
    expect(api.admin.prepareEventGalleryDirectUpload).not.toHaveBeenCalled();
    expect(await store.list('clerk-b')).toEqual([]);
    expect((await store.list('clerk-a'))[0].task.batchId).toBe(0);
    view.rerender(<View />);
    await waitFor(() => expect(queue.completedCount).toBe(1));
    expect(api.admin.prepareEventGalleryDirectUpload).toHaveBeenCalledTimes(1);
  });

  it('requires an identified signed-in account', async () => {
    render(<View owner={null} />);
    await expect(queue.startUpload(options())).rejects.toThrow('Sign in');
    expect(api.admin.createGalleryUploadBatch).not.toHaveBeenCalled();
  });

  it('pages through all rows, filters failures beyond the first page, and retries every failed file with bounded previews', async () => {
    const records = Array.from({ length: 24 }, (_, index) => {
      const id = String(index).padStart(2, '0');
      return { file: new File(['image'], `resume-${id}.jpg`, { type: 'image/jpeg' }), record: {
        owner: 'clerk-a', id, groupId: 'restored', lastModified: 1, optimized: true, uploaded: true,
        prepared: { signed_id: `signed-${id}`, direct_upload: { url: 'https://storage.invalid/file', headers: {} } },
        meta: { active: false, caption: '', category: '', sortOrder: index },
        task: { id, eventId: 1, eventName: 'Copa', batchId: 8, fileName: `resume-${id}.jpg`, fileSize: 5, originalFileSize: 5,
          browserPreviewable: true, progress: index >= 12 ? 90 : 100, bytesUploaded: 5, createdAt: index,
          status: index >= 12 ? 'failed' as const : 'complete' as const, error: index >= 12 ? 'Response lost' : undefined },
      } };
    });
    await store.enqueue(records);
    render(<View />);
    await waitFor(() => expect(queue.tasks).toHaveLength(24));
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(document.querySelectorAll('img').length).toBeLessThanOrEqual(8);
    expect(screen.getByText('1–8 of 24')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'All files (24)' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Next files' }));
    expect(screen.getByText('9–16 of 24')).toBeTruthy();
    expect(screen.getByText('resume-23.jpg')).toBeTruthy();
    expect(screen.getByRole('progressbar', { name: 'resume-23.jpg upload progress' }).getAttribute('aria-valuenow')).toBe('90');
    fireEvent.click(screen.getByRole('button', { name: 'Next files' }));
    expect(screen.getByText('17–24 of 24')).toBeTruthy();
    expect(screen.getByText('resume-11.jpg')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Failed only (12)' }));
    expect(screen.getByText('1–8 of 12')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Failed only (12)' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Next files' }));
    expect(screen.getByText('9–12 of 12')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('button', { name: 'Next files' }).hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Retry failed' }));
    await waitFor(() => expect(queue.completedCount).toBe(24));
    expect(api.admin.completeEventGalleryDirectUpload).toHaveBeenCalledTimes(12);
    expect(transfers).toBe(0);
    expect(screen.getByText('No failed files')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'All files (24)' }));
    expect(screen.getAllByRole('listitem')).toHaveLength(8);
    expect(document.querySelectorAll('img').length).toBeLessThanOrEqual(8);
    fireEvent.click(screen.getByRole('button', { name: 'Clear complete' }));
    await waitFor(() => expect(queue.tasks).toEqual([]));
    expect(await store.file('clerk-a', '23')).toBeUndefined();
  });

  it('sends blank public labels for camera filenames and preserves only the user caption', async () => {
    render(<View />);
    const cameraFile = new File(['image'], 'IMG_20261031_173012.jpg', { type: 'image/jpeg' });
    await act(async () => { await queue.startUpload(options([cameraFile])); });
    await waitFor(() => expect(queue.completedCount).toBe(1));
    expect(api.admin.completeEventGalleryDirectUpload).toHaveBeenCalledWith(1, {
      signed_id: 'signed-fixture', batch_id: 8, title: '', alt_text: '', caption: 'Day 1', category: 'day-1', sort_order: 0, active: false,
    });
    expect(JSON.stringify(vi.mocked(api.admin.completeEventGalleryDirectUpload).mock.calls)).not.toContain(cameraFile.name);
  });

  it('checksums a large non-JPEG in chunks without changing the uploaded bytes', async () => {
    render(<View />);
    const bytes = new Uint8Array(5 * 1024 * 1024).fill(3);
    const large = new File([bytes], 'photo.png', { type: 'image/png' });
    await act(async () => { await queue.startUpload(options([large])); });
    await waitFor(() => expect(queue.completedCount).toBe(1));
    expect(reads).toBe(3);
    expect(api.admin.prepareEventGalleryDirectUpload).toHaveBeenCalledWith(1, expect.objectContaining({ byte_size: bytes.length, checksum: createHash('md5').update(bytes).digest('base64') }));
    expect(imageCompression).not.toHaveBeenCalled();
  });

  it('preserves EXIF when optimizing a JPEG before durable upload', async () => {
    vi.mocked(imageCompression).mockResolvedValue(new File(['optimized'], 'photo.jpg', { type: 'image/jpeg' }));
    render(<View />);
    const large = new File([new Uint8Array(4 * 1024 * 1024 + 1)], 'photo.jpg', { type: 'image/jpeg' });
    await act(async () => { await queue.startUpload(options([large])); });
    await waitFor(() => expect(queue.completedCount).toBe(1));
    expect(imageCompression).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ preserveExif: true }));
    const saved = (await store.list('clerk-a'))[0];
    expect(saved.task.fileSize).toBe(9);
    expect(await (await store.file('clerk-a', saved.id))?.text()).toBe('optimized');
    expect(api.admin.prepareEventGalleryDirectUpload).toHaveBeenCalledWith(1, expect.objectContaining({ byte_size: 9 }));
  });
});
