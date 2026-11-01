import SparkMD5 from 'spark-md5';
import type { DirectUploadPreparation } from '../services/api';
import { photoIntake, type ImportOptions } from '../services/photoIntake';

export const ZIP_MAX_BYTES = 4 * 1024 ** 3;
const CHUNK_BYTES = 4 * 1024 ** 2;
const DATABASE = 'marianas-photo-zip-intake-v1';
export interface SavedZip {
  id: string;
  key: string;
  eventId: number;
  file: File;
  options: ImportOptions;
  checksum?: string;
  prepared?: DirectUploadPreparation;
  uploaded?: boolean;
}

async function zipStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  if (!globalThis.indexedDB) throw new Error('This browser cannot save ZIP uploads. Use a browser with IndexedDB enabled.');
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const open = indexedDB.open(DATABASE, 1);
    let blocked = false;
    open.onupgradeneeded = () => open.result.createObjectStore('uploads', { keyPath: 'key' });
    open.onsuccess = () => { if (blocked) open.result.close(); else resolve(open.result); };
    open.onerror = () => reject(open.error);
    open.onblocked = () => { blocked = true; reject(new Error('Close older Photos tabs and try again.')); };
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction('uploads', mode);
      const request = operation(transaction.objectStore('uploads'));
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error || request.error || new Error('Could not save ZIP upload.'));
      transaction.onerror = () => reject(transaction.error || request.error);
    });
  } finally { db.close(); }
}

export const zipQueue = {
  load: (key: string) => zipStore<SavedZip | undefined>('readonly', store => store.get(key)),
  save: async (record: SavedZip) => {
    try { await zipStore('readwrite', store => store.put(record)); }
    catch { throw new Error('Could not save this ZIP on this device. Free browser storage or use a computer with more space, then try again. The upload has not advanced.'); }
  },
  remove: (key: string) => zipStore('readwrite', store => store.delete(key)),
};

export async function withZipIntakeLock<T>(key: string, operation: () => Promise<T>): Promise<T> {
  if (!navigator.locks) throw new Error('ZIP resume requires a browser with Web Locks. Use a current browser.');
  return navigator.locks.request(`mo-zip:${key}`, { ifAvailable: true }, async lock => {
    if (!lock) throw new Error('This ZIP is active in another tab. Return to that tab or close it, then retry.');
    return operation();
  });
}

export function enqueueZip(record: SavedZip) {
  return withZipIntakeLock(record.key, async () => {
    if (await zipQueue.load(record.key)) throw new Error('A saved ZIP already exists for this event. Resume or remove it before choosing another.');
    await zipQueue.save(record);
  });
}

export function removeSavedZip(record: SavedZip) {
  return withZipIntakeLock(record.key, async () => {
    const current = await zipQueue.load(record.key);
    if (current && current.id !== record.id) throw new Error('Another ZIP was saved in another tab. Reload Photos before changing it.');
    await zipQueue.remove(record.key);
  });
}

function checkAbort(signal: AbortSignal) { if (signal.aborted) throw new DOMException('Upload paused', 'AbortError'); }
function readChunk(blob: Blob): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => reader.result instanceof ArrayBuffer ? resolve(reader.result) : reject(new Error('Could not read ZIP.'));
    reader.onerror = () => reject(reader.error || new Error('Could not read ZIP.'));
    reader.readAsArrayBuffer(blob);
  });
}

/** Incremental MD5: a 4GB archive never becomes a 4GB ArrayBuffer. */
export async function zipChecksum(file: Blob, progress: (percent: number) => void, signal: AbortSignal) {
  const hash = new SparkMD5.ArrayBuffer();
  try {
    for (let offset = 0; offset < file.size; offset += CHUNK_BYTES) {
      checkAbort(signal);
      hash.append(await readChunk(file.slice(offset, offset + CHUNK_BYTES)));
      progress(Math.round(Math.min(file.size, offset + CHUNK_BYTES) / file.size * 100));
    }
    checkAbort(signal);
    return btoa(hash.end(true));
  } finally { hash.destroy(); }
}

export function uploadZipBytes(file: File, prepared: DirectUploadPreparation, progress: (percent: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    checkAbort(signal);
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const clean = () => signal.removeEventListener('abort', abort);
    xhr.open('PUT', prepared.direct_upload.url);
    xhr.timeout = 6 * 60 * 60 * 1000;
    Object.entries(prepared.direct_upload.headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = event => { if (event.lengthComputable) progress(Math.round(event.loaded / event.total * 100)); };
    xhr.onload = () => {
      clean();
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed (${xhr.status}). Retry to send the saved ZIP again.`));
    };
    xhr.onerror = xhr.ontimeout = () => { clean(); reject(new Error('ZIP transfer interrupted. Retry when your connection is ready.')); };
    xhr.onabort = () => { clean(); reject(new DOMException('Upload paused', 'AbortError')); };
    signal.addEventListener('abort', abort, { once: true });
    xhr.send(file);
  });
}

export async function sendSavedZip(record: SavedZip, progress: (stage: string, percent: number) => void, signal: AbortSignal) {
  const scope = { signal, isCurrent: () => !signal.aborted };
  if (!record.checksum) {
    record.checksum = await zipChecksum(record.file, percent => progress('Checking ZIP', percent), signal);
    await zipQueue.save(record);
  }
  checkAbort(signal);
  if (!record.uploaded) {
    // Presigned PUT URLs expire; unfinished transfers start again with a fresh one.
    progress('Preparing storage', 0);
    record.prepared = await photoIntake.prepareZip(record.eventId, { filename: record.file.name, byte_size: record.file.size, checksum: record.checksum }, scope);
    await zipQueue.save(record);
    checkAbort(signal);
    await uploadZipBytes(record.file, record.prepared, percent => progress('Sending ZIP', percent), signal);
    record.uploaded = true;
    await zipQueue.save(record);
  }
  checkAbort(signal);
  if (!record.prepared) throw new Error('Saved ZIP checkpoint is missing. Remove it and choose the ZIP again.');
  progress('Starting import', 100);
  const result = await photoIntake.completeZip(record.eventId, record.prepared.signed_id, record.options, scope);
  await zipQueue.remove(record.key);
  return result.import;
}
