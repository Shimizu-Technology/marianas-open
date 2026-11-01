import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import SparkMD5 from 'spark-md5';
import imageCompression from 'browser-image-compression';
import imageCompressionWorkerUrl from 'browser-image-compression/dist/browser-image-compression.js?url';
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { EventGalleryImage } from '../services/api';
import { isBrowserPreviewableImage } from '../utils/images';
import { useAuthContext } from './AuthContext';
import { GalleryUploadQueueStore, GALLERY_QUEUE_BATCH_SIZE, drainGalleryUploadQueue, withGalleryUploadLock } from '../utils/galleryUploadQueue';
import type { DurableGalleryUpload } from '../utils/galleryUploadQueue';

type UploadStatus = 'queued' | 'optimizing' | 'hashing' | 'preparing' | 'uploading' | 'saving' | 'complete' | 'failed';
type UploadMode = 'direct' | 'server';
type DirectUploadTarget = 's3' | 'local' | 'storage';

export interface GalleryUploadTask {
  id: string;
  eventId: number;
  eventName: string;
  batchId: number;
  fileName: string;
  fileSize: number;
  originalFileSize: number;
  optimizedFileSize?: number;
  optimizationError?: string;
  previewUrl: string;
  browserPreviewable: boolean;
  progress: number;
  status: UploadStatus;
  bytesUploaded: number;
  createdAt: number;
  startedAt?: number;
  uploadStartedAt?: number;
  completedAt?: number;
  uploadMode?: UploadMode;
  directUploadTarget?: DirectUploadTarget;
  fallbackReason?: string;
  error?: string;
  galleryImage?: EventGalleryImage;
}

interface StartUploadOptions {
  eventId: number;
  eventName: string;
  files: File[];
  active: boolean;
  caption: string;
  category: string;
  startSortOrder: number;
}

interface GalleryUploadContextValue {
  tasks: GalleryUploadTask[];
  activeCount: number;
  failedCount: number;
  completedCount: number;
  concurrency: number;
  directStorageUnavailable: boolean;
  directStorageError?: string;
  startUpload: (options: StartUploadOptions) => Promise<void>;
  retryFailed: () => void;
  clearCompleted: () => void;
  queueError?: string;
  isRestoring: boolean;
}

const GalleryUploadContext = createContext<GalleryUploadContextValue | null>(null);
const CONCURRENCY = 4;
const COMPLETE_UPLOAD_TIMEOUT_MS = 60_000;
const OPTIMIZATION_MAX_SIZE_MB = 3.5;
const OPTIMIZATION_MAX_DIMENSION = 2880;
const OPTIMIZATION_INITIAL_QUALITY = 0.86;
const OPTIMIZATION_SIZE_THRESHOLD_BYTES = 4 * 1024 * 1024;
const ACTIVE_STATUSES: UploadStatus[] = ['queued', 'optimizing', 'hashing', 'preparing', 'uploading', 'saving'];
export const GALLERY_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
export const GALLERY_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'image/avif',
  'image/tiff',
];
export const GALLERY_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.heic', '.heif', '.avif', '.tif', '.tiff'];
export const GALLERY_IMAGE_ACCEPT = [...GALLERY_IMAGE_TYPES, ...GALLERY_IMAGE_EXTENSIONS].join(',');
export const GALLERY_IMAGE_TYPE_LABEL = 'JPEG, PNG, WebP, GIF, HEIC, HEIF, AVIF, or TIFF';

export function isSupportedGalleryImage(file: File) {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  const hasSupportedType = fileType ? GALLERY_IMAGE_TYPES.includes(fileType) : false;
  const hasSupportedExtension = GALLERY_IMAGE_EXTENSIONS.some(extension => fileName.endsWith(extension));
  return (hasSupportedType || hasSupportedExtension) && file.size > 0 && file.size <= GALLERY_IMAGE_MAX_BYTES;
}

function isBrowserPreviewableGalleryFile(file: File | undefined) {
  if (!file) return true;
  const fileName = file.name.toLowerCase();
  if (['.heic', '.heif', '.tif', '.tiff'].some(extension => fileName.endsWith(extension))) return false;
  return isBrowserPreviewableImage(file.type);
}

function checksum(file: File, signal: AbortSignal) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const hash = new SparkMD5.ArrayBuffer();
    const chunkSize = 2 * 1024 * 1024;
    let offset = 0;
    const fail = () => { hash.destroy(); reject(new Error('Could not read image data')); };
    const read = () => {
      if (signal.aborted) { hash.destroy(); reject(new DOMException('Upload session ended', 'AbortError')); return; }
      reader.readAsArrayBuffer(file.slice(offset, offset + chunkSize));
    };
    reader.onload = () => {
      if (!(reader.result instanceof ArrayBuffer)) { fail(); return; }
      hash.append(reader.result);
      offset += reader.result.byteLength;
      if (offset < file.size) { read(); return; }
      const md5 = window.btoa(hash.end(true));
      hash.destroy();
      resolve(md5);
    };
    reader.onerror = fail;
    read();
  });
}

function isJpegGalleryFile(file: File) {
  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();
  return fileType === 'image/jpeg' || fileName.endsWith('.jpg') || fileName.endsWith('.jpeg');
}

function shouldOptimizeGalleryFile(file: File, originalFileSize: number) {
  if (!isJpegGalleryFile(file)) return false;
  if (file.size < originalFileSize) return false;
  return file.size > OPTIMIZATION_SIZE_THRESHOLD_BYTES;
}

async function optimizeGalleryFile(file: File, originalFileSize: number, onProgress: (progress: number) => void) {
  if (!shouldOptimizeGalleryFile(file, originalFileSize)) {
    return { file, optimized: file.size < originalFileSize, error: undefined as string | undefined };
  }

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: OPTIMIZATION_MAX_SIZE_MB,
      maxWidthOrHeight: OPTIMIZATION_MAX_DIMENSION,
      initialQuality: OPTIMIZATION_INITIAL_QUALITY,
      fileType: 'image/jpeg',
      preserveExif: true,
      useWebWorker: true,
      libURL: imageCompressionWorkerUrl,
      onProgress: (progress: number) => onProgress(Math.max(0, Math.min(1, progress / 100))),
    });
    const optimizedFile = new File([compressed], file.name, {
      type: compressed.type || 'image/jpeg',
      lastModified: file.lastModified,
    });

    if (optimizedFile.size >= file.size * 0.95) {
      return { file, optimized: false, error: undefined as string | undefined };
    }

    return { file: optimizedFile, optimized: true, error: undefined as string | undefined };
  } catch (error) {
    return {
      file,
      optimized: false,
      error: error instanceof Error ? error.message : 'Image optimization failed',
    };
  }
}

function directUploadTargetFromUrl(url: string): DirectUploadTarget {
  try {
    const host = new URL(url, window.location.href).hostname.toLowerCase();
    if (host.includes('amazonaws.com') || host.includes('.s3.')) return 's3';
    if (host === window.location.hostname || host === 'localhost' || host === '127.0.0.1' || host === '::1') return 'local';
  } catch {
    // Fall through to the generic label.
  }
  return 'storage';
}

function directUploadLabel(task: Pick<GalleryUploadTask, 'directUploadTarget'>) {
  if (task.directUploadTarget === 's3') return 'Direct S3';
  if (task.directUploadTarget === 'local') return 'Direct local';
  return 'Direct storage';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) window.clearTimeout(timeoutId);
  });
}

function uploadToStorage(url: string, headers: Record<string, string>, file: File, onProgress: (progress: number) => void, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const abort = () => xhr.abort();
    const finish = (error?: Error) => {
      signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve();
    };
    if (signal.aborted) { reject(new DOMException('Upload session ended', 'AbortError')); return; }
    xhr.open('PUT', url);
    xhr.timeout = 120_000;
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(event.loaded / event.total); };
    xhr.onload = () => finish(xhr.status >= 200 && xhr.status < 300 ? undefined : new Error(`Storage upload failed (${xhr.status}). Retry to renew the upload link.`));
    xhr.onerror = () => finish(new Error('Storage upload failed. Check your connection and retry.'));
    xhr.ontimeout = () => finish(new Error('Storage upload timed out. Keep this page open and retry.'));
    xhr.onabort = () => finish(new DOMException('Upload session ended', 'AbortError'));
    signal.addEventListener('abort', abort, { once: true });
    xhr.send(file);
  });
}

function titleFromFilename(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, exponent);
  const precision = value >= 100 || exponent === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[exponent]}`;
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '—';
  const rounded = Math.max(1, Math.round(seconds));
  if (rounded < 60) return `${rounded}s`;
  const minutes = Math.floor(rounded / 60);
  const remainingSeconds = rounded % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

function statusLabel(task: GalleryUploadTask) {
  switch (task.status) {
    case 'queued':
      return 'Queued';
    case 'optimizing':
      return 'Optimizing for web';
    case 'hashing':
      return 'Hashing checksum';
    case 'preparing':
      return 'Preparing direct upload';
    case 'uploading':
      return task.uploadMode === 'server' ? 'Uploading through API' : `Uploading ${directUploadLabel(task).toLowerCase()}`;
    case 'saving':
      return 'Saving gallery record';
    case 'complete':
      return 'Complete';
    case 'failed':
      return 'Failed';
    default:
      return task.status;
  }
}

const queueStore = new GalleryUploadQueueStore();

export function GalleryUploadProvider({ children }: { children: ReactNode }) {
  const auth = useAuthContext();
  const owner = !auth.isLoading && auth.isSignedIn ? auth.userId : null;
  const ownerRef = useRef(owner);
  ownerRef.current = owner;
  const [state, setState] = useState<{ owner: string | null; tasks: GalleryUploadTask[] }>({ owner: null, tasks: [] });
  const [queueError, setQueueError] = useState<string>();
  const [isRestoring, setIsRestoring] = useState(true);
  const wakeRef = useRef<() => void>(() => undefined);
  const notifyRef = useRef<() => void>(() => undefined);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);
  const sessionRef = useRef<{ owner: string; signal: AbortSignal } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    const previews = new Map<string, string>();
    let refreshing: Promise<void> | undefined;
    let refreshAgain = false;
    let notifyTimer: number | undefined;
    let busy = false;
    const current = () => !signal.aborted && ownerRef.current === owner;
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('marianas-gallery-upload-queue') : undefined;
    const notify = () => {
      if (!channel || notifyTimer !== undefined) return;
      notifyTimer = window.setTimeout(() => { notifyTimer = undefined; if (current()) channel.postMessage({ owner }); }, 100);
    };
    const readAndRender = async () => {
      if (!owner || !current()) return;
      try {
        const records = await queueStore.list(owner);
        if (!current()) return;
        // Only the visible preview set needs file blobs in memory. All other bytes stay on disk.
        const visible = [...records].sort((a, b) => taskSortRank({ ...a.task, previewUrl: '' }) - taskSortRank({ ...b.task, previewUrl: '' }) || (a.task.startedAt || a.task.createdAt) - (b.task.startedAt || b.task.createdAt)).slice(0, 8);
        const previewIds = new Set(visible.map(record => record.id));
        for (const [id, url] of previews) {
          if (!previewIds.has(id)) { URL.revokeObjectURL(url); previews.delete(id); }
        }
        for (const record of visible) {
          if (!previews.has(record.id) && record.task.browserPreviewable) {
            const file = await queueStore.file(owner, record.id);
            if (!current()) return;
            if (file) previews.set(record.id, URL.createObjectURL(file));
          }
        }
        if (!current()) return;
        setState(previous => {
          const previousById = new Map(previous.owner === owner ? previous.tasks.map(task => [task.id, task]) : []);
          return {
            owner,
            tasks: records.map(record => {
              const old = previousById.get(record.id);
              const liveProgress = old?.status === record.task.status && ['uploading', 'optimizing'].includes(old.status) && old.progress > record.task.progress;
              return { ...record.task, previewUrl: previews.get(record.id) || '', ...(liveProgress ? { progress: old.progress, bytesUploaded: old.bytesUploaded } : {}) };
            }),
          };
        });
      } catch (error) {
        if (current()) setQueueError(error instanceof Error ? error.message : 'Could not restore saved uploads');
      } finally { if (current()) setIsRestoring(false); }
    };
    const refresh = async () => {
      if (!owner || !current()) return;
      if (refreshing) { refreshAgain = true; return refreshing; }
      refreshing = (async () => {
        do { refreshAgain = false; await readAndRender(); } while (refreshAgain && current());
      })().finally(() => { refreshing = undefined; });
      return refreshing;
    };
    const updateProgress = (id: string, update: Partial<GalleryUploadTask>) => {
      if (current()) setState(previous => previous.owner === owner ? { ...previous, tasks: previous.tasks.map(task => task.id === id ? { ...task, ...update } : task) } : previous);
    };
    const wake = () => {
      if (!owner || !current() || busy || !navigator.onLine) return;
      busy = true;
      void withGalleryUploadLock(owner, signal, async () => {
        if (!current()) return;
        await refresh();
        await drainGalleryUploadQueue(queueStore, owner, {
          batch: async records => {
            if (!current()) throw new DOMException('Upload session ended', 'AbortError');
            const first = records[0].task;
            const { batch } = await api.admin.createGalleryUploadBatch(first.eventId, {
              title: `${first.eventName} photo upload`, total_files: records.length,
              total_bytes: records.reduce((sum, record) => sum + record.task.fileSize, 0),
            });
            return batch.id;
          },
          optimize: optimizeGalleryFile,
          prepare: async (record, file) => {
            updateProgress(record.id, { status: 'hashing', progress: 20 });
            const md5 = await checksum(file, signal);
            if (!current()) throw new DOMException('Upload session ended', 'AbortError');
            const prepared = await api.admin.prepareEventGalleryDirectUpload(record.task.eventId, {
              filename: file.name, byte_size: file.size, checksum: md5, content_type: file.type || 'application/octet-stream',
            });
            return { ...prepared, target: directUploadTargetFromUrl(prepared.direct_upload.url) };
          },
          put: (prepared, file, progress, uploadSignal) => uploadToStorage(prepared.direct_upload.url, prepared.direct_upload.headers, file, progress, uploadSignal),
          complete: async record => {
            if (!current()) throw new DOMException('Upload session ended', 'AbortError');
            const title = titleFromFilename(record.task.fileName);
            const completed = await withTimeout(api.admin.completeEventGalleryDirectUpload(record.task.eventId, {
              signed_id: record.prepared!.signed_id, batch_id: record.task.batchId, title, alt_text: title,
              caption: record.meta.caption, category: record.meta.category, sort_order: record.meta.sortOrder, active: record.meta.active,
            }), COMPLETE_UPLOAD_TIMEOUT_MS, 'Saving gallery record timed out. Retry to confirm the uploaded file.');
            return completed.gallery_image;
          },
        }, signal, () => { void refresh(); notify(); }, updateProgress);
      }).catch(error => {
        if (current()) setQueueError(error instanceof Error ? error.message : 'Could not resume saved uploads');
      }).finally(() => { busy = false; });
    };
    sessionRef.current = owner ? { owner, signal } : null;
    refreshRef.current = refresh;
    wakeRef.current = wake;
    notifyRef.current = notify;
    setQueueError(undefined);
    setIsRestoring(Boolean(owner));
    void refresh();
    wake();
    const interval = window.setInterval(() => { void refresh(); wake(); }, 3000);
    const resume = () => { void refresh(); wake(); };
    window.addEventListener('online', resume);
    window.addEventListener('pageshow', resume);
    document.addEventListener('visibilitychange', resume);
    if (channel) channel.onmessage = event => { if (event.data?.owner === owner) resume(); };
    return () => {
      controller.abort();
      window.clearInterval(interval);
      window.removeEventListener('online', resume);
      window.removeEventListener('pageshow', resume);
      document.removeEventListener('visibilitychange', resume);
      if (notifyTimer !== undefined) window.clearTimeout(notifyTimer);
      channel?.close();
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [owner]);

  const startUpload = useCallback(async ({ eventId, eventName, files, active, caption, category, startSortOrder }: StartUploadOptions) => {
    const session = sessionRef.current;
    if (!owner || !session || session.owner !== owner || session.signal.aborted) throw new Error('Sign in before starting a resumable upload.');
    if (!navigator.locks) throw new Error('Resumable uploads require a browser with Web Locks support. Update your browser and try again.');
    const imageFiles = files.filter(isSupportedGalleryImage);
    if (!imageFiles.length) return;
    const records: { record: DurableGalleryUpload; file: File }[] = [];
    const createdAt = Date.now();
    for (let offset = 0; offset < imageFiles.length; offset += GALLERY_QUEUE_BATCH_SIZE) {
      const groupId = crypto.randomUUID();
      imageFiles.slice(offset, offset + GALLERY_QUEUE_BATCH_SIZE).forEach((file, index) => {
        const id = crypto.randomUUID();
        records.push({ file, record: {
          owner, id, groupId, lastModified: file.lastModified,
          meta: { active, caption, category, sortOrder: startSortOrder + offset + index },
          task: { id, eventId, eventName, batchId: 0, fileName: file.name, fileSize: file.size, originalFileSize: file.size,
            browserPreviewable: isBrowserPreviewableGalleryFile(file), progress: 0, bytesUploaded: 0, createdAt, status: 'queued' },
        } });
      });
    }
    try { await queueStore.enqueue(records); } catch (error) {
      if (ownerRef.current === owner) setQueueError(error instanceof Error ? error.message : 'Could not save files on this device');
      throw error;
    }
    if (session.signal.aborted || ownerRef.current !== owner) return;
    setQueueError(undefined);
    await refreshRef.current();
    notifyRef.current();
    wakeRef.current();
  }, [owner]);

  const retryFailed = useCallback(() => {
    if (!owner) return;
    const session = sessionRef.current;
    void withGalleryUploadLock(owner, session?.signal || AbortSignal.abort(), async () => {
      if (ownerRef.current !== owner) return;
      await queueStore.retryFailed(owner);
    }).then(async () => {
      if (session?.signal.aborted || ownerRef.current !== owner) return;
      setQueueError(undefined);
      await refreshRef.current(); notifyRef.current(); wakeRef.current();
    }).catch(error => { if (ownerRef.current === owner) setQueueError(error.message); });
  }, [owner]);

  const clearCompleted = useCallback(() => {
    if (!owner) return;
    void queueStore.clearCompleted(owner).then(async () => {
      if (ownerRef.current !== owner) return;
      await refreshRef.current(); notifyRef.current();
    }).catch(error => { if (ownerRef.current === owner) setQueueError(error.message); });
  }, [owner]);

  const tasks = useMemo(() => state.owner === owner ? state.tasks : [], [state, owner]);
  const value = useMemo(() => ({
    tasks, activeCount: tasks.filter(task => ACTIVE_STATUSES.includes(task.status)).length,
    failedCount: tasks.filter(task => task.status === 'failed').length,
    completedCount: tasks.filter(task => task.status === 'complete').length,
    concurrency: CONCURRENCY, directStorageUnavailable: false, directStorageError: undefined,
    queueError, isRestoring, startUpload, retryFailed, clearCompleted,
  }), [tasks, queueError, isRestoring, startUpload, retryFailed, clearCompleted]);

  return <GalleryUploadContext.Provider value={value}>{children}</GalleryUploadContext.Provider>;
}

export function useGalleryUploads() {
  const context = useContext(GalleryUploadContext);
  if (!context) throw new Error('useGalleryUploads must be used inside GalleryUploadProvider');
  return context;
}

function taskSortRank(task: GalleryUploadTask) {
  if (task.status === 'uploading') return 0;
  if (task.status === 'saving') return 1;
  if (task.status === 'optimizing' || task.status === 'hashing' || task.status === 'preparing') return 2;
  if (task.status === 'queued') return 3;
  if (task.status === 'failed') return 4;
  return 5;
}

function taskOptimizedSize(task: GalleryUploadTask) {
  const originalSize = task.originalFileSize || task.fileSize;
  if (task.optimizedFileSize) return task.optimizedFileSize;
  if (task.fileSize < originalSize) return task.fileSize;
  return undefined;
}

function taskCanBeOptimized(task: GalleryUploadTask) {
  const fileName = task.fileName.toLowerCase();
  return (fileName.endsWith('.jpg') || fileName.endsWith('.jpeg')) && (task.originalFileSize || task.fileSize) > OPTIMIZATION_SIZE_THRESHOLD_BYTES;
}

function estimatedUploadSize(task: GalleryUploadTask, averageOptimizedRatio: number) {
  const originalSize = task.originalFileSize || task.fileSize;
  const optimizedSize = taskOptimizedSize(task);
  if (optimizedSize) return optimizedSize;
  if (averageOptimizedRatio > 0 && taskCanBeOptimized(task)) {
    return Math.max(1, Math.min(task.fileSize, Math.round(originalSize * averageOptimizedRatio)));
  }
  return task.fileSize;
}

export function GalleryUploadStatusPanel() {
  const { tasks, activeCount, failedCount, completedCount, retryFailed, clearCompleted, concurrency, directStorageUnavailable, directStorageError, queueError } = useGalleryUploads();
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (activeCount === 0) return undefined;
    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(interval);
  }, [activeCount]);

  if (tasks.length === 0 && !queueError) return null;

  const activeBatchIds = new Set(tasks.filter(task => ACTIVE_STATUSES.includes(task.status)).map(task => task.batchId));
  const metricTasks = activeBatchIds.size > 0 ? tasks.filter(task => activeBatchIds.has(task.batchId)) : tasks;
  const metricCompletedCount = metricTasks.filter(task => task.status === 'complete').length;
  const optimizedSizes = metricTasks.map(taskOptimizedSize).filter((size): size is number => size !== undefined);
  const optimizedOriginalBytes = metricTasks.reduce((sum, task) => taskOptimizedSize(task) ? sum + (task.originalFileSize || task.fileSize) : sum, 0);
  const optimizedBytes = optimizedSizes.reduce((sum, size) => sum + size, 0);
  const averageOptimizedRatio = optimizedOriginalBytes > 0 ? optimizedBytes / optimizedOriginalBytes : 0;
  const totalBytes = metricTasks.reduce((sum, task) => sum + estimatedUploadSize(task, averageOptimizedRatio), 0);
  const optimizedSavedBytes = metricTasks.reduce((sum, task) => {
    const optimizedSize = taskOptimizedSize(task);
    return optimizedSize ? sum + Math.max(0, (task.originalFileSize || task.fileSize) - optimizedSize) : sum;
  }, 0);
  const uploadedBytes = Math.min(totalBytes, metricTasks.reduce((sum, task) => {
    if (task.status === 'complete') return sum + task.fileSize;
    return sum + Math.min(task.fileSize, task.bytesUploaded || 0);
  }, 0));
  const rawOverall = totalBytes > 0 ? Math.round((uploadedBytes / totalBytes) * 100) : Math.round(metricTasks.reduce((sum, task) => sum + task.progress, 0) / metricTasks.length);
  const overall = metricTasks.length === 0 ? 0 : metricCompletedCount < metricTasks.length ? Math.min(99, rawOverall) : 100;
  const firstUploadStartedAt = metricTasks.reduce<number | null>((earliest, task) => {
    const timestamp = task.uploadStartedAt;
    if (!timestamp) return earliest;
    return earliest === null ? timestamp : Math.min(earliest, timestamp);
  }, null);
  const currentTimestamp = now || firstUploadStartedAt || 0;
  const elapsedSeconds = firstUploadStartedAt && currentTimestamp > firstUploadStartedAt ? Math.max(1, (currentTimestamp - firstUploadStartedAt) / 1000) : 0;
  const averageBytesPerSecond = elapsedSeconds > 0 ? uploadedBytes / elapsedSeconds : 0;
  const remainingBytes = Math.max(0, totalBytes - uploadedBytes);
  const etaSeconds = averageBytesPerSecond > 0 && remainingBytes > 0 ? remainingBytes / averageBytesPerSecond : 0;
  const activeTasks = tasks.filter(task => ACTIVE_STATUSES.includes(task.status));
  const directTasks = activeTasks.filter(task => task.uploadMode === 'direct');
  const modeLabel = directStorageUnavailable
    ? 'Server fallback'
    : activeTasks.some(task => task.uploadMode === 'server')
      ? 'Mixed mode'
      : directTasks.some(task => task.directUploadTarget === 's3')
        ? 'Direct S3'
        : directTasks.some(task => task.directUploadTarget === 'local')
          ? 'Direct local'
          : directTasks.length > 0
            ? 'Direct storage'
            : 'Preparing';
  const visibleTasks = [...tasks]
    .sort((a, b) => taskSortRank(a) - taskSortRank(b) || (a.startedAt || a.createdAt) - (b.startedAt || b.createdAt))
    .slice(0, 8);

  return (
    <div className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-50 max-h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain w-[min(460px,calc(100vw-2rem))] border border-white/10 bg-surface shadow-2xl">
      <div className="p-3 border-b border-white/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
            {activeCount > 0 ? <Loader2 className="w-4 h-4 text-gold animate-spin" /> : <UploadCloud className="w-4 h-4 text-gold" />}
            Gallery uploads
          </div>
          <div className="text-xs text-text-muted">{overall}%</div>
        </div>
        <div className="mt-2 h-1.5 bg-white/5 overflow-hidden">
          <div className="h-full bg-gold transition-all" style={{ width: `${overall}%` }} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
          <span>{activeCount} active</span>
          <span>{completedCount} complete</span>
          <span>{failedCount} failed</span>
          <span>{concurrency} at a time</span>
          {optimizedSavedBytes > 0 && <span>{formatBytes(optimizedSavedBytes)} saved</span>}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-text-muted sm:grid-cols-4">
          <div className="border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <div className="uppercase tracking-wide text-text-muted/80">Transferred</div>
            <div className="mt-0.5 text-text-primary">{formatBytes(uploadedBytes)} / {formatBytes(totalBytes)}</div>
          </div>
          <div className="border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <div className="uppercase tracking-wide text-text-muted/80">Average</div>
            <div className="mt-0.5 text-text-primary">{averageBytesPerSecond > 0 ? `${formatBytes(averageBytesPerSecond)}/s` : '—'}</div>
          </div>
          <div className="border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <div className="uppercase tracking-wide text-text-muted/80">ETA</div>
            <div className="mt-0.5 text-text-primary">{etaSeconds > 0 ? formatDuration(etaSeconds) : '—'}</div>
          </div>
          <div className="border border-white/5 bg-white/[0.02] px-2 py-1.5">
            <div className="uppercase tracking-wide text-text-muted/80">Mode</div>
            <div className={directStorageUnavailable ? 'mt-0.5 text-amber-300' : 'mt-0.5 text-text-primary'}>{modeLabel}</div>
          </div>
        </div>
        <p className="mt-2 text-xs leading-5 text-text-muted">Files are saved on this device. Locking your phone or switching apps may pause uploads. Reopen this page and sign in to the same account to resume; uploads are not guaranteed to run in the background. If a transfer fails, tap Retry failed.</p>
        {queueError && <p role="alert" className="mt-2 text-xs leading-5 text-red-400">{queueError}</p>}
        {directStorageUnavailable && (
          <div className="mt-2 border border-amber-400/20 bg-amber-400/10 px-2.5 py-2 text-[11px] leading-4 text-amber-200">
            Direct storage upload failed{directStorageError ? `: ${directStorageError}` : ''}. Remaining files are uploading through the API, which is usually slower.
          </div>
        )}
      </div>
      <div className="max-h-72 overflow-auto">
        {visibleTasks.map(task => {
          const transferredForTask = task.status === 'complete' ? task.fileSize : Math.min(task.fileSize, task.bytesUploaded || 0);
          return (
            <div key={task.id} className="flex items-center gap-3 p-3 border-b border-white/5">
              {task.browserPreviewable && task.previewUrl ? (
                <img src={task.previewUrl} alt="" className="w-10 h-10 object-cover bg-white/5" />
              ) : (
                <div className="w-10 h-10 flex items-center justify-center bg-white/5 text-text-muted">
                  <UploadCloud className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-text-primary">{task.fileName}</div>
                <div className="mt-1 h-1 bg-white/5 overflow-hidden">
                  <div className={`h-full ${task.status === 'failed' ? 'bg-red-400' : 'bg-gold'}`} style={{ width: `${task.progress}%` }} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-text-muted">
                  <span>{statusLabel(task)}</span>
                  <span>{formatBytes(transferredForTask)} / {formatBytes(task.fileSize)}</span>
                  {task.uploadMode && <span>{task.uploadMode === 'direct' ? directUploadLabel(task) : 'API fallback'}</span>}
                  {task.optimizedFileSize && <span>{formatBytes(task.originalFileSize)} → {formatBytes(task.optimizedFileSize)}</span>}
                </div>
                {task.fallbackReason && task.status !== 'failed' && (
                  <div className="mt-1 truncate text-[11px] text-amber-300">Direct storage failed: {task.fallbackReason}; using API fallback</div>
                )}
                {task.optimizationError && <div className="mt-1 truncate text-[11px] text-amber-300">Optimization skipped: {task.optimizationError}; uploading original</div>}
                {task.error && <div className="mt-1 break-words text-[11px] text-red-400">{task.error}</div>}
              </div>
              {task.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
              {task.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
            </div>
          );
        })}
      </div>
      {(failedCount > 0 || completedCount > 0) && (
        <div className="flex items-center justify-end gap-2 p-3">
          {failedCount > 0 && (
            <button onClick={retryFailed} className="px-3 py-1.5 text-xs text-gold bg-gold/10 hover:bg-gold/15">Retry failed</button>
          )}
          {completedCount > 0 && (
            <button onClick={clearCompleted} className="px-3 py-1.5 text-xs text-text-muted hover:text-text-primary">Clear complete</button>
          )}
        </div>
      )}
    </div>
  );
}
