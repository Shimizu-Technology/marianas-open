import type { GalleryUploadTask } from '../contexts/GalleryUploadContext';

export type UploadMetadata = { active: boolean; caption: string; category: string; sortOrder: number };
export type PreparedGalleryUpload = { signed_id: string; direct_upload: { url: string; headers: Record<string, string> }; target?: GalleryUploadTask['directUploadTarget'] };
export interface DurableGalleryUpload {
  owner: string;
  id: string;
  groupId: string;
  task: Omit<GalleryUploadTask, 'previewUrl'>;
  meta: UploadMetadata;
  lastModified: number;
  optimized?: boolean;
  prepared?: PreparedGalleryUpload;
  uploaded?: boolean;
}

export const GALLERY_QUEUE_DB = 'marianas-gallery-upload-queue-v1';
export const GALLERY_QUEUE_BATCH_SIZE = 100;
export const GALLERY_QUEUE_STORAGE_ERROR = 'Could not save the upload queue on this device. Browser storage may be full or unavailable. Free some space, then select the files again. No unsaved files will be uploaded.';

function storageError(cause: unknown) {
  return new Error(GALLERY_QUEUE_STORAGE_ERROR, { cause });
}

/** Metadata and file bytes are committed together; no network work may precede enqueue. */
export class GalleryUploadQueueStore {
  private readonly database: string;
  constructor(database = GALLERY_QUEUE_DB) { this.database = database; }

  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.database, 1);
      let blocked = false;
      request.onupgradeneeded = () => {
        const db = request.result;
        const tasks = db.createObjectStore('tasks', { keyPath: ['owner', 'id'] });
        tasks.createIndex('owner', 'owner');
        db.createObjectStore('files', { keyPath: ['owner', 'id'] });
      };
      request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
      request.onerror = () => reject(storageError(request.error));
      request.onblocked = () => { blocked = true; reject(storageError(new Error('Browser storage is blocked by another tab'))); };
    });
  }

  private async transaction<T>(names: string[], mode: IDBTransactionMode, run: (tx: IDBTransaction, result: (value: T) => void) => void): Promise<T> {
    let db: IDBDatabase | undefined;
    try {
      db = await this.open();
      return await new Promise<T>((resolve, reject) => {
        const tx = db!.transaction(names, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
        let result: T;
        tx.oncomplete = () => resolve(result);
        tx.onabort = () => reject(tx.error || new Error('Storage transaction aborted'));
        tx.onerror = () => { /* onabort handles errors after rollback */ };
        try { run(tx, value => { result = value; }); } catch (error) { tx.abort(); reject(error); }
      });
    } catch (error) {
      throw storageError(error);
    } finally { db?.close(); }
  }

  enqueue(records: { record: DurableGalleryUpload; file: Blob }[]) {
    return this.transaction<void>(['tasks', 'files'], 'readwrite', tx => {
      for (const { record, file } of records) {
        tx.objectStore('tasks').add(record);
        tx.objectStore('files').add({ owner: record.owner, id: record.id, file });
      }
    });
  }

  list(owner: string) {
    return this.transaction<DurableGalleryUpload[]>(['tasks'], 'readonly', (tx, done) => {
      tx.objectStore('tasks').index('owner').getAll(owner).onsuccess = event => done((event.target as IDBRequest<DurableGalleryUpload[]>).result);
    });
  }

  file(owner: string, id: string) {
    return this.transaction<Blob | undefined>(['files'], 'readonly', (tx, done) => {
      const request = tx.objectStore('files').get([owner, id]);
      request.onsuccess = () => done(request.result?.file);
    });
  }

  save(record: DurableGalleryUpload, file?: Blob) {
    return this.transaction<void>(['tasks', 'files'], 'readwrite', tx => {
      tx.objectStore('tasks').put(record);
      if (file) tx.objectStore('files').put({ owner: record.owner, id: record.id, file });
    });
  }

  assignBatch(owner: string, groupId: string, batchId: number) {
    return this.transaction<void>(['tasks'], 'readwrite', tx => {
      const store = tx.objectStore('tasks');
      const request = store.index('owner').getAll(owner);
      request.onsuccess = () => {
        for (const record of request.result as DurableGalleryUpload[]) {
          if (record.groupId === groupId) store.put({ ...record, task: { ...record.task, batchId } });
        }
      };
    });
  }

  retryFailed(owner: string) {
    return this.transaction<void>(['tasks'], 'readwrite', tx => {
      const store = tx.objectStore('tasks');
      const request = store.index('owner').getAll(owner);
      request.onsuccess = () => {
        for (const record of request.result as DurableGalleryUpload[]) {
          if (record.task.status === 'failed') store.put({ ...record, task: { ...record.task, status: 'queued', error: undefined } });
        }
      };
    });
  }

  clearCompleted(owner: string) {
    return this.transaction<void>(['tasks', 'files'], 'readwrite', tx => {
      const store = tx.objectStore('tasks');
      const request = store.index('owner').getAll(owner);
      request.onsuccess = () => {
        for (const record of request.result as DurableGalleryUpload[]) {
          if (record.task.status === 'complete') {
            store.delete([owner, record.id]);
            tx.objectStore('files').delete([owner, record.id]);
          }
        }
      };
    });
  }
}

export interface GalleryQueueAdapter {
  batch: (records: DurableGalleryUpload[]) => Promise<number>;
  optimize: (file: File, originalSize: number, progress: (fraction: number) => void) => Promise<{ file: File; error?: string }>;
  prepare: (record: DurableGalleryUpload, file: File) => Promise<PreparedGalleryUpload>;
  put: (prepared: PreparedGalleryUpload, file: File, progress: (fraction: number) => void, signal: AbortSignal) => Promise<void>;
  complete: (record: DurableGalleryUpload) => Promise<NonNullable<GalleryUploadTask['galleryImage']>>;
}

/** Called only under the account's exclusive Web Lock. A signed ID is never replaced after PUT succeeds. */
export async function drainGalleryUploadQueue(
  store: GalleryUploadQueueStore, owner: string, adapter: GalleryQueueAdapter, signal: AbortSignal,
  changed: () => void, progress: (id: string, update: Partial<GalleryUploadTask>) => void,
) {
  const check = () => { if (signal.aborted) throw new DOMException('Upload session ended', 'AbortError'); };
  const process = async (initial: DurableGalleryUpload) => {
    let record = initial;
    const checkpoint = async (update: Partial<DurableGalleryUpload>, task: Partial<GalleryUploadTask>, file?: Blob) => {
      check();
      const next = { ...record, ...update, task: { ...record.task, ...task } };
      await store.save(next, file);
      record = next;
      if (!signal.aborted) changed();
    };
    try {
      check();
      const blob = await store.file(owner, record.id);
      check();
      if (!blob) throw new Error('Saved file data is missing. Select this file again.');
      let file = new File([blob], record.task.fileName, { type: blob.type, lastModified: record.lastModified });
      if (!record.optimized) {
        await checkpoint({}, { status: 'optimizing', startedAt: Date.now(), progress: 2, bytesUploaded: 0, error: undefined });
        const optimized = await adapter.optimize(file, record.task.originalFileSize, fraction => {
          if (!signal.aborted) progress(record.id, { progress: Math.round(2 + fraction * 16) });
        });
        check();
        file = optimized.file;
        // Replace bytes and matching size atomically before preparing the signed blob.
        await checkpoint({ optimized: true }, { fileSize: file.size, optimizedFileSize: file.size < record.task.originalFileSize ? file.size : undefined,
          optimizationError: optimized.error, progress: 18 }, file);
      }
      if (!record.prepared) {
        await checkpoint({}, { status: 'preparing', uploadMode: 'direct', progress: 24, bytesUploaded: 0 });
        check();
        const prepared = await adapter.prepare(record, file);
        await checkpoint({ prepared }, { progress: 30, directUploadTarget: prepared.target });
      }
      if (!record.uploaded) {
        await checkpoint({}, { status: 'uploading', uploadStartedAt: Date.now(), progress: 30, bytesUploaded: 0 });
        check();
        try {
          await adapter.put(record.prepared!, file, fraction => {
            if (!signal.aborted) progress(record.id, { progress: Math.round(30 + Math.min(1, Math.max(0, fraction)) * 55), bytesUploaded: Math.round(file.size * Math.min(1, Math.max(0, fraction))) });
          }, signal);
        } catch (error) {
          check();
          // A failed/expired PUT can be prepared again on retry: completion has never been attempted.
          // Do not switch to a non-idempotent multipart endpoint after an ambiguous response.
          await checkpoint({ prepared: undefined }, { bytesUploaded: 0, progress: 24 });
          throw error;
        }
        await checkpoint({ uploaded: true }, { status: 'saving', progress: 90, bytesUploaded: file.size });
      }
      if (record.task.status !== 'saving') await checkpoint({}, { status: 'saving', progress: 90, bytesUploaded: file.size });
      check();
      const galleryImage = await adapter.complete(record);
      await checkpoint({}, { status: 'complete', progress: 100, bytesUploaded: file.size, completedAt: Date.now(), galleryImage, error: undefined });
    } catch (error) {
      if (signal.aborted) return;
      // Keep the last durable checkpoint, especially uploaded + signed_id on completion failure.
      await checkpoint({}, { status: 'failed', error: error instanceof Error ? error.message : 'Upload failed' });
    }
  };

  while (!signal.aborted) {
    const all = await store.list(owner);
    check();
    const pending = all.filter(record => !['failed', 'complete'].includes(record.task.status));
    if (!pending.length) return;
    const unbatched = pending.find(record => !record.task.batchId);
    if (unbatched) {
      const group = all.filter(record => record.groupId === unbatched.groupId);
      try {
        check();
        const batchId = await adapter.batch(group);
        check();
        await store.assignBatch(owner, unbatched.groupId, batchId);
      } catch (error) {
        if (signal.aborted) return;
        for (const record of group) await store.save({ ...record, task: { ...record.task, status: 'failed', error: error instanceof Error ? error.message : 'Could not create upload batch' } });
      }
      if (!signal.aborted) changed();
      continue;
    }
    // Keep the lock until every in-flight worker settles, even if persisting a failure
    // also fails (e.g. quota/storage revocation). Releasing early permits a second tab
    // to race the still-running workers.
    const results = await Promise.allSettled(pending.slice(0, 4).map(process));
    const failed = results.find(result => result.status === 'rejected');
    if (failed?.status === 'rejected') throw failed.reason;
  }
}

export function galleryUploadLockName(owner: string) { return `marianas-gallery-uploads:${owner}`; }

/** Fail closed on older/private browsers rather than risk two tabs completing the same work. */
export async function withGalleryUploadLock<T>(owner: string, signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('Resumable uploads require a browser with Web Locks support. Update your browser and try again.');
  return navigator.locks.request(galleryUploadLockName(owner), { mode: 'exclusive', signal }, work);
}
