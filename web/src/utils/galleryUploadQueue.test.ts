// @vitest-environment node
import { IDBFactory, IDBObjectStore } from 'fake-indexeddb';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventGalleryImage } from '../services/api';
import { drainGalleryUploadQueue, GalleryUploadQueueStore, GALLERY_QUEUE_STORAGE_ERROR, withGalleryUploadLock } from './galleryUploadQueue';
import type { DurableGalleryUpload, GalleryQueueAdapter } from './galleryUploadQueue';

function record(id = 'one', owner = 'clerk-a'): DurableGalleryUpload {
  return { id, owner, groupId: 'group', lastModified: 1234, meta: { active: false, caption: 'Mat 1', category: 'day-1', sortOrder: 7 },
    task: { id, eventId: 42, eventName: 'Copa', batchId: 0, fileName: 'one.jpg', fileSize: 8, originalFileSize: 8,
      browserPreviewable: true, progress: 0, bytesUploaded: 0, createdAt: 1234, status: 'queued' } };
}
const prepared = { signed_id: 'signed-same-blob', direct_upload: { url: 'https://storage.invalid/file', headers: { checksum: 'same-bytes' } } };
const galleryImage = { id: 55 } as EventGalleryImage;
function adapter(): GalleryQueueAdapter {
  return { batch: vi.fn(async () => 9), optimize: vi.fn(async file => ({ file })), prepare: vi.fn(async () => prepared),
    put: vi.fn(async () => undefined), complete: vi.fn(async () => galleryImage) };
}
let store: GalleryUploadQueueStore;
const file = () => new File(['original'], 'one.jpg', { type: 'image/jpeg', lastModified: 1234 });
async function enqueue(item = record()) { await store.enqueue([{ record: item, file: file() }]); }
async function drain(api = adapter(), controller = new AbortController(), owner = 'clerk-a') {
  await drainGalleryUploadQueue(store, owner, api, controller.signal, vi.fn(), vi.fn());
  return api;
}
beforeEach(() => { vi.stubGlobal('indexedDB', new IDBFactory()); store = new GalleryUploadQueueStore(); });

describe('durable gallery upload checkpoints', () => {
  it('restores file bytes and metadata from a new store instance', async () => {
    await enqueue();
    const restored = new GalleryUploadQueueStore();
    expect(await restored.list('clerk-a')).toEqual([record()]);
    const blob = await restored.file('clerk-a', 'one');
    expect(await blob?.text()).toBe('original');
    expect(blob?.type).toBe('image/jpeg');
    expect(await restored.list('clerk-b')).toEqual([]);
    expect(await restored.file('clerk-b', 'one')).toBeUndefined();
  });

  it('rolls back all metadata and blobs when browser quota rejects a file', async () => {
    const add = IDBObjectStore.prototype.add;
    vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, ...args: Parameters<typeof add>) {
      if (this.name === 'files') throw new DOMException('Quota reached', 'QuotaExceededError');
      return add.apply(this, args);
    });
    await expect(enqueue()).rejects.toThrow(GALLERY_QUEUE_STORAGE_ERROR);
    expect(await store.list('clerk-a')).toEqual([]);
    expect(await store.file('clerk-a', 'one')).toBeUndefined();
  });

  it('saves matching optimized bytes before prepare and the signed ID before PUT', async () => {
    await enqueue();
    const api = adapter();
    api.optimize = vi.fn(async () => ({ file: new File(['web'], 'one.jpg', { type: 'image/jpeg' }) }));
    api.prepare = vi.fn(async (item, uploadFile) => {
      const saved = (await store.list('clerk-a'))[0];
      expect(saved.optimized).toBe(true);
      expect(saved.task.fileSize).toBe(3);
      expect(await (await store.file('clerk-a', item.id))?.text()).toBe(await uploadFile.text());
      return prepared;
    });
    api.put = vi.fn(async () => { expect((await store.list('clerk-a'))[0].prepared?.signed_id).toBe(prepared.signed_id); });
    api.complete = vi.fn(async () => {
      expect((await store.list('clerk-a'))[0]).toMatchObject({ uploaded: true, prepared, task: { status: 'saving', bytesUploaded: 3 } });
      return galleryImage;
    });
    await drain(api);
    expect((await store.list('clerk-a'))[0].task).toMatchObject({ status: 'complete', galleryImage, fileSize: 3, optimizedFileSize: 3, progress: 100 });
  });

  it('retries lost completion responses using the SAME blob, without optimizing, preparing or uploading again', async () => {
    await enqueue();
    const api = adapter();
    vi.mocked(api.complete).mockRejectedValueOnce(new Error('Response lost'));
    await drain(api);
    expect((await store.list('clerk-a'))[0]).toMatchObject({ prepared, uploaded: true, task: { status: 'failed', progress: 90, bytesUploaded: 8 } });
    store = new GalleryUploadQueueStore(); // simulate reload
    await store.retryFailed('clerk-a');
    await drain(api);
    expect(api.optimize).toHaveBeenCalledTimes(1);
    expect(api.prepare).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.complete).toHaveBeenCalledTimes(2);
    expect(vi.mocked(api.complete).mock.calls.map(([item]) => item.prepared?.signed_id)).toEqual([prepared.signed_id, prepared.signed_id]);
    expect((await store.list('clerk-a'))[0].task.status).toBe('complete');
  });

  it('resumes an interrupted PUT using the persisted optimized file and preparation', async () => {
    await enqueue();
    const api = adapter();
    const controller = new AbortController();
    api.optimize = vi.fn(async () => ({ file: new File(['web'], 'one.jpg', { type: 'image/jpeg' }) }));
    api.put = vi.fn(async () => { controller.abort(); throw new Error('Phone suspended'); });
    await drain(api, controller);
    expect((await store.list('clerk-a'))[0]).toMatchObject({ optimized: true, prepared, task: { status: 'uploading' } });
    const resumed = adapter();
    resumed.put = vi.fn(async (_prepared, uploadFile) => { expect(await uploadFile.text()).toBe('web'); expect(uploadFile.size).toBe(3); });
    await drain(resumed);
    expect(resumed.optimize).not.toHaveBeenCalled();
    expect(resumed.prepare).not.toHaveBeenCalled();
    expect(resumed.put).toHaveBeenCalledTimes(1);
    expect(resumed.complete).toHaveBeenCalledTimes(1);
  });

  it('resumes after PUT at completion, retaining signed ID across suspension', async () => {
    await enqueue();
    const api = adapter();
    const controller = new AbortController();
    api.complete = vi.fn(async () => { controller.abort(); throw new Error('Suspended'); });
    await drain(api, controller);
    const resumed = await drain();
    expect(resumed.put).not.toHaveBeenCalled();
    expect(resumed.prepare).not.toHaveBeenCalled();
    expect(resumed.complete).toHaveBeenCalledWith(expect.objectContaining({ uploaded: true, prepared }));
  });

  it('recovers from an expired PUT link on explicit retry before completion is attempted', async () => {
    await enqueue();
    const api = adapter();
    vi.mocked(api.put).mockRejectedValueOnce(new Error('Storage upload failed (403)'));
    await drain(api);
    expect((await store.list('clerk-a'))[0]).toMatchObject({ prepared: undefined, task: { status: 'failed' } });
    expect(api.complete).not.toHaveBeenCalled();
    await store.retryFailed('clerk-a');
    await drain(api);
    expect(api.prepare).toHaveBeenCalledTimes(2);
    expect(api.optimize).toHaveBeenCalledTimes(1);
    expect(api.complete).toHaveBeenCalledTimes(1);
  });

  it('does no network work after an optimization checkpoint fails for quota', async () => {
    await enqueue();
    const api = adapter();
    const save = store.save.bind(store);
    vi.spyOn(store, 'save').mockImplementationOnce(save).mockRejectedValueOnce(new Error(GALLERY_QUEUE_STORAGE_ERROR));
    await drain(api);
    expect(api.prepare).not.toHaveBeenCalled();
    expect(api.put).not.toHaveBeenCalled();
    expect((await store.list('clerk-a'))[0]).toMatchObject({ task: { status: 'failed', error: GALLERY_QUEUE_STORAGE_ERROR } });
    expect(await (await store.file('clerk-a', 'one'))?.text()).toBe('original');
  });

  it('does not PUT if saving the signed ID fails', async () => {
    await enqueue();
    const api = adapter();
    const save = store.save.bind(store);
    vi.spyOn(store, 'save').mockImplementation(async (item, blob) => {
      if (item.prepared && item.task.status !== 'failed') throw new Error(GALLERY_QUEUE_STORAGE_ERROR);
      return save(item, blob);
    });
    await drain(api);
    expect(api.prepare).toHaveBeenCalledOnce();
    expect(api.put).not.toHaveBeenCalled();
    expect(api.complete).not.toHaveBeenCalled();
  });

  it('does not complete if persisting successful PUT fails', async () => {
    await enqueue();
    const api = adapter();
    const save = store.save.bind(store);
    vi.spyOn(store, 'save').mockImplementation(async (item, blob) => {
      if (item.uploaded && item.task.status === 'saving') throw new Error(GALLERY_QUEUE_STORAGE_ERROR);
      return save(item, blob);
    });
    await drain(api);
    expect(api.put).toHaveBeenCalledOnce();
    expect(api.complete).not.toHaveBeenCalled();
    expect((await store.list('clerk-a'))[0].uploaded).toBeUndefined();
  });

  it('preserves completion idempotency when saving the final result fails', async () => {
    await enqueue();
    const api = adapter();
    const save = store.save.bind(store);
    vi.spyOn(store, 'save').mockImplementation(async (item, blob) => {
      if (item.task.status === 'complete') throw new Error(GALLERY_QUEUE_STORAGE_ERROR);
      return save(item, blob);
    });
    await drain(api);
    expect((await store.list('clerk-a'))[0]).toMatchObject({ uploaded: true, prepared, task: { status: 'failed' } });
    vi.mocked(store.save).mockRestore();
    await store.retryFailed('clerk-a'); await drain(api);
    expect(api.prepare).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(api.complete).toHaveBeenCalledTimes(2);
  });

  it('stops further requests on account sign-out and restores later under the same owner', async () => {
    await enqueue();
    const api = adapter(); const controller = new AbortController();
    api.prepare = vi.fn(async () => { controller.abort(); return prepared; });
    await drain(api, controller);
    expect(api.put).not.toHaveBeenCalled();
    expect(api.complete).not.toHaveBeenCalled();
    expect((await store.list('clerk-a'))[0].prepared).toBeUndefined();
    await drain();
    expect((await store.list('clerk-a'))[0].task.status).toBe('complete');
  });

  it('isolates processing, retries, clear-completed and blobs between users, even with identical IDs', async () => {
    await enqueue(); await enqueue(record('one', 'clerk-b'));
    await drain();
    await store.clearCompleted('clerk-b');
    expect(await store.file('clerk-a', 'one')).toBeDefined();
    expect((await store.list('clerk-b'))[0].task.status).toBe('queued');
    await store.clearCompleted('clerk-a');
    expect(await store.list('clerk-a')).toEqual([]);
    expect(await store.file('clerk-a', 'one')).toBeUndefined();
    expect(await store.file('clerk-b', 'one')).toBeDefined();
    const b = (await store.list('clerk-b'))[0];
    await store.save({ ...b, task: { ...b.task, status: 'failed' } });
    await store.retryFailed('clerk-a');
    expect((await store.list('clerk-b'))[0].task.status).toBe('failed');
    await store.retryFailed('clerk-b');
    expect((await store.list('clerk-b'))[0].task.status).toBe('queued');
  });

  it('keeps failed batch creation retryable, with no file transfer', async () => {
    await enqueue(); const api = adapter();
    vi.mocked(api.batch).mockRejectedValueOnce(new Error('Offline'));
    await drain(api);
    expect(api.prepare).not.toHaveBeenCalled();
    expect((await store.list('clerk-a'))[0].task).toMatchObject({ status: 'failed', batchId: 0, error: 'Offline' });
    await store.retryFailed('clerk-a'); await drain(api);
    expect(api.batch).toHaveBeenCalledTimes(2);
    expect((await store.list('clerk-a'))[0].task).toMatchObject({ status: 'complete', batchId: 9 });
  });

  it('keeps the processor alive until other uploads settle when recording a failure also fails', async () => {
    await enqueue(); await enqueue(record('two'));
    const api = adapter();
    let finishSecond!: () => void;
    api.put = vi.fn(async (_prepared, uploadFile) => {
      // Both records have the same filename; use invocation order to keep one request pending.
      expect(uploadFile.size).toBe(8);
      if (vi.mocked(api.put).mock.calls.length === 2) await new Promise<void>(resolve => { finishSecond = resolve; });
    });
    const save = store.save.bind(store);
    vi.spyOn(store, 'save').mockImplementation(async (item, blob) => {
      if (item.id === 'one' && ['complete', 'failed'].includes(item.task.status)) throw new Error('Storage revoked');
      return save(item, blob);
    });
    let settled = false;
    const running = drain(api).then(() => { settled = true; }, () => { settled = true; });
    await vi.waitFor(() => expect(api.complete).toHaveBeenCalledTimes(1));
    expect(settled).toBe(false);
    finishSecond();
    await running;
    expect(settled).toBe(true);
    expect(api.complete).toHaveBeenCalledTimes(2);
  });

  it('fails closed without cross-tab lock support', async () => {
    vi.stubGlobal('navigator', {});
    const work = vi.fn();
    await expect(withGalleryUploadLock('clerk-a', new AbortController().signal, work)).rejects.toThrow('Web Locks');
    expect(work).not.toHaveBeenCalled();
  });

  it('serializes two simulated tabs through the account Web Lock and completes once', async () => {
    await enqueue(); const api = adapter();
    const tails = new Map<string, Promise<unknown>>();
    const request = vi.fn((name: string, _options: unknown, callback: () => Promise<unknown>) => {
      const next = (tails.get(name) || Promise.resolve()).then(callback);
      tails.set(name, next.catch(() => undefined));
      return next;
    });
    vi.stubGlobal('navigator', { locks: { request } });
    const controller = new AbortController();
    await Promise.all([1, 2].map(() => withGalleryUploadLock('clerk-a', controller.signal, () => drain(api))));
    expect(api.complete).toHaveBeenCalledTimes(1);
    expect(api.put).toHaveBeenCalledTimes(1);
    expect(request.mock.calls.map(([name]) => name)).toEqual(['marianas-gallery-uploads:clerk-a', 'marianas-gallery-uploads:clerk-a']);
  });
});
