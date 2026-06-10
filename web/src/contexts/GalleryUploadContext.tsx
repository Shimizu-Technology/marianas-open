import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import SparkMD5 from 'spark-md5';
import imageCompression from 'browser-image-compression';
import imageCompressionWorkerUrl from 'browser-image-compression/dist/browser-image-compression.js?url';
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { EventGalleryImage } from '../services/api';
import { isBrowserPreviewableImage } from '../utils/images';

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

function checksum(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const buffer = reader.result;
      if (!(buffer instanceof ArrayBuffer)) {
        reject(new Error('Could not read image data'));
        return;
      }
      resolve(window.btoa(SparkMD5.ArrayBuffer.hash(buffer, true)));
    };
    reader.onerror = () => reject(new Error('Could not read image data'));
    reader.readAsArrayBuffer(file);
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

function uploadToStorage(url: string, headers: Record<string, string>, file: File, onProgress: (progress: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', url);
    Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Storage upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error('Storage upload failed before reaching the bucket'));
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

async function uploadThroughServer(
  task: GalleryUploadTask,
  file: File,
  meta: { active: boolean; caption: string; category: string; sortOrder: number },
  onProgress?: (progress: number) => void
) {
  const title = titleFromFilename(file.name);
  const formData = new FormData();
  formData.append('image', file);
  formData.append('batch_id', String(task.batchId));
  formData.append('title', title);
  formData.append('alt_text', title);
  formData.append('caption', meta.caption);
  formData.append('category', meta.category);
  formData.append('sort_order', String(meta.sortOrder));
  formData.append('active', String(meta.active));
  return api.admin.createEventGalleryImage(task.eventId, formData, onProgress);
}

export function GalleryUploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<GalleryUploadTask[]>([]);
  const [directStorageUnavailable, setDirectStorageUnavailable] = useState(false);
  const [directStorageError, setDirectStorageError] = useState<string | undefined>(undefined);
  const tasksRef = useRef<GalleryUploadTask[]>([]);
  const fileMapRef = useRef(new Map<string, File>());
  const metaMapRef = useRef(new Map<string, { active: boolean; caption: string; category: string; sortOrder: number }>());
  const runningRef = useRef(0);
  const directStorageUnavailableRef = useRef(false);
  const directStorageErrorRef = useRef<string | undefined>(undefined);
  const processQueueRef = useRef<() => void>(() => undefined);
  const batchTotalUpdateTimersRef = useRef(new Map<number, number>());
  const lastBatchTotalBytesRef = useRef(new Map<number, number>());

  const setTasksSynced = useCallback((updater: (current: GalleryUploadTask[]) => GalleryUploadTask[]) => {
    const next = updater(tasksRef.current);
    tasksRef.current = next;
    setTasks(next);
  }, []);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  useEffect(() => {
    const files = fileMapRef.current;
    const metas = metaMapRef.current;
    const batchTotalTimers = batchTotalUpdateTimersRef.current;
    const lastBatchTotalBytes = lastBatchTotalBytesRef.current;

    return () => {
      tasksRef.current.forEach(task => URL.revokeObjectURL(task.previewUrl));
      batchTotalTimers.forEach(timer => window.clearTimeout(timer));
      batchTotalTimers.clear();
      lastBatchTotalBytes.clear();
      files.clear();
      metas.clear();
    };
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<GalleryUploadTask>) => {
    setTasksSynced(current => current.map(task => task.id === id ? { ...task, ...updates } : task));
  }, [setTasksSynced]);

  const markDirectStorageUnavailable = useCallback((reason: string) => {
    directStorageUnavailableRef.current = true;
    directStorageErrorRef.current = reason;
    setDirectStorageUnavailable(true);
    setDirectStorageError(reason);
  }, []);

  const scheduleBatchTotalBytesUpdate = useCallback((eventId: number, batchId: number) => {
    const existingTimer = batchTotalUpdateTimersRef.current.get(batchId);
    if (existingTimer) window.clearTimeout(existingTimer);

    const timer = window.setTimeout(async () => {
      batchTotalUpdateTimersRef.current.delete(batchId);
      const totalBytes = tasksRef.current
        .filter(task => task.batchId === batchId)
        .reduce((sum, task) => sum + task.fileSize, 0);
      if (totalBytes <= 0 || lastBatchTotalBytesRef.current.get(batchId) === totalBytes) return;

      lastBatchTotalBytesRef.current.set(batchId, totalBytes);
      try {
        await api.admin.updateGalleryUploadBatch(eventId, batchId, { total_bytes: totalBytes });
      } catch (error) {
        console.warn('[GalleryUpload] Failed to update optimized batch byte total', error);
      }
    }, 1000);

    batchTotalUpdateTimersRef.current.set(batchId, timer);
  }, []);

  const updateUploadProgress = useCallback((taskId: string, fileSize: number, progress: number, progressStart: number, progressSpan: number) => {
    const normalizedProgress = Math.max(0, Math.min(1, progress));
    updateTask(taskId, {
      bytesUploaded: Math.round(fileSize * normalizedProgress),
      progress: Math.max(progressStart, Math.round(progressStart + normalizedProgress * progressSpan)),
    });
  }, [updateTask]);

  const processTask = useCallback(async (task: GalleryUploadTask) => {
    try {
      const file = fileMapRef.current.get(task.id);
      const meta = metaMapRef.current.get(task.id);
      if (!file || !meta) throw new Error('Upload task is missing its file data');

      const originalFileSize = task.originalFileSize || file.size;
      let uploadFile = file;

      updateTask(task.id, { status: 'optimizing', progress: 2, bytesUploaded: 0, optimizationError: undefined, error: undefined });
      const optimized = await optimizeGalleryFile(file, originalFileSize, progress => {
        updateTask(task.id, { progress: Math.max(2, Math.round(2 + progress * 16)) });
      });
      uploadFile = optimized.file;
      fileMapRef.current.set(task.id, uploadFile);
      const optimizedFileSize = uploadFile.size < originalFileSize ? uploadFile.size : undefined;
      updateTask(task.id, {
        fileSize: uploadFile.size,
        optimizedFileSize,
        optimizationError: optimized.error,
        progress: 18,
      });
      if (optimizedFileSize) scheduleBatchTotalBytesUpdate(task.eventId, task.batchId);

      if (directStorageUnavailableRef.current) {
        const fallbackReason = directStorageErrorRef.current;
        updateTask(task.id, {
          status: 'uploading',
          uploadMode: 'server',
          directUploadTarget: undefined,
          progress: 20,
          bytesUploaded: 0,
          uploadStartedAt: Date.now(),
          fallbackReason,
          error: undefined,
        });
        const completed = await uploadThroughServer(task, uploadFile, meta, progress => updateUploadProgress(task.id, uploadFile.size, progress, 20, 65));
        updateTask(task.id, {
          status: 'complete',
          progress: 100,
          bytesUploaded: uploadFile.size,
          completedAt: Date.now(),
          galleryImage: completed.gallery_image,
          error: undefined,
        });
        return;
      }

      updateTask(task.id, { status: 'hashing', progress: 20, bytesUploaded: 0, error: undefined });
      const md5 = await checksum(uploadFile);

      updateTask(task.id, { status: 'preparing', uploadMode: 'direct', directUploadTarget: undefined, progress: 24 });
      const prepared = await api.admin.prepareEventGalleryDirectUpload(task.eventId, {
        filename: uploadFile.name,
        byte_size: uploadFile.size,
        checksum: md5,
        content_type: uploadFile.type || 'application/octet-stream',
      });

      let completed: { gallery_image: EventGalleryImage };
      const directUploadTarget = directUploadTargetFromUrl(prepared.direct_upload.url);
      updateTask(task.id, { status: 'uploading', uploadMode: 'direct', directUploadTarget, progress: 30, bytesUploaded: 0, uploadStartedAt: Date.now() });
      try {
        await uploadToStorage(prepared.direct_upload.url, prepared.direct_upload.headers, uploadFile, progress => updateUploadProgress(task.id, uploadFile.size, progress, 30, 55));
      } catch (storageError) {
        const fallbackReason = storageError instanceof Error ? storageError.message : 'Storage upload failed';
        markDirectStorageUnavailable(fallbackReason);
        updateTask(task.id, {
          status: 'uploading',
          uploadMode: 'server',
          directUploadTarget: undefined,
          progress: 20,
          bytesUploaded: 0,
          uploadStartedAt: Date.now(),
          fallbackReason,
          error: undefined,
        });
        completed = await uploadThroughServer(task, uploadFile, meta, progress => updateUploadProgress(task.id, uploadFile.size, progress, 20, 65));
        updateTask(task.id, {
          status: 'complete',
          progress: 100,
          bytesUploaded: uploadFile.size,
          completedAt: Date.now(),
          galleryImage: completed.gallery_image,
          error: undefined,
        });
        return;
      }

      updateTask(task.id, { status: 'saving', progress: 90, bytesUploaded: uploadFile.size, error: undefined });
      completed = await withTimeout(api.admin.completeEventGalleryDirectUpload(task.eventId, {
        signed_id: prepared.signed_id,
        batch_id: task.batchId,
        title: titleFromFilename(uploadFile.name),
        alt_text: titleFromFilename(uploadFile.name),
        caption: meta.caption,
        category: meta.category,
        sort_order: meta.sortOrder,
        active: meta.active,
      }), COMPLETE_UPLOAD_TIMEOUT_MS, 'Saving gallery record timed out. Retry to confirm the uploaded file.');
      updateTask(task.id, {
        status: 'complete',
        progress: 100,
        bytesUploaded: uploadFile.size,
        completedAt: Date.now(),
        galleryImage: completed.gallery_image,
        error: undefined,
      });
    } catch (error) {
      updateTask(task.id, {
        status: 'failed',
        progress: 0,
        bytesUploaded: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      runningRef.current -= 1;
      processQueueRef.current();
    }
  }, [markDirectStorageUnavailable, scheduleBatchTotalBytesUpdate, updateTask, updateUploadProgress]);

  const processQueue = useCallback(() => {
    const available = Math.max(0, CONCURRENCY - runningRef.current);
    if (available === 0) return;

    const next = tasksRef.current
      .filter(task => task.status === 'queued')
      .slice(0, available);
    if (next.length === 0) return;

    const claimedIds = new Set(next.map(task => task.id));
    const startedAt = Date.now();
    runningRef.current += next.length;
    setTasksSynced(current => current.map(task => (
      claimedIds.has(task.id)
        ? {
            ...task,
            status: 'optimizing',
            progress: 2,
            bytesUploaded: 0,
            startedAt,
            completedAt: undefined,
            uploadMode: undefined,
            directUploadTarget: undefined,
            uploadStartedAt: undefined,
            fallbackReason: undefined,
            error: undefined,
          }
        : task
    )));

    next.forEach(task => {
      void processTask({ ...task, status: 'optimizing', progress: 2, bytesUploaded: 0, startedAt });
    });
  }, [processTask, setTasksSynced]);
  processQueueRef.current = processQueue;

  const startUpload = useCallback(async ({ eventId, eventName, files, active, caption, category, startSortOrder }: StartUploadOptions) => {
    const imageFiles = files.filter(isSupportedGalleryImage);
    if (imageFiles.length === 0) return;

    const totalBytes = imageFiles.reduce((sum, file) => sum + file.size, 0);
    const { batch } = await api.admin.createGalleryUploadBatch(eventId, {
      title: `${eventName} photo upload`,
      total_files: imageFiles.length,
      total_bytes: totalBytes,
    });

    lastBatchTotalBytesRef.current.set(batch.id, totalBytes);

    const createdAt = Date.now();
    const newTasks = imageFiles.map((file, index) => {
      const id = `${batch.id}-${createdAt}-${index}-${crypto.randomUUID()}`;
      fileMapRef.current.set(id, file);
      metaMapRef.current.set(id, { active, caption, category, sortOrder: startSortOrder + index });
      return {
        id,
        eventId,
        eventName,
        batchId: batch.id,
        fileName: file.name,
        fileSize: file.size,
        originalFileSize: file.size,
        previewUrl: URL.createObjectURL(file),
        browserPreviewable: isBrowserPreviewableGalleryFile(file),
        progress: 0,
        bytesUploaded: 0,
        createdAt,
        status: 'queued' as UploadStatus,
      };
    });

    setTasksSynced(current => [...newTasks, ...current]);
    window.setTimeout(processQueue, 0);
  }, [processQueue, setTasksSynced]);

  const retryFailed = useCallback(() => {
    setTasksSynced(current => current.map(task => task.status === 'failed'
      ? {
          ...task,
          status: 'queued',
          progress: 0,
          bytesUploaded: 0,
          uploadMode: undefined,
          directUploadTarget: undefined,
          optimizedFileSize: task.fileSize < task.originalFileSize ? task.fileSize : undefined,
          optimizationError: undefined,
          uploadStartedAt: undefined,
          startedAt: undefined,
          completedAt: undefined,
          fallbackReason: undefined,
          error: undefined,
        }
      : task));
    window.setTimeout(processQueue, 0);
  }, [processQueue, setTasksSynced]);

  const clearCompleted = useCallback(() => {
    setTasksSynced(current => {
      current.filter(task => task.status === 'complete').forEach(task => {
        URL.revokeObjectURL(task.previewUrl);
        fileMapRef.current.delete(task.id);
        metaMapRef.current.delete(task.id);
      });
      return current.filter(task => task.status !== 'complete');
    });
  }, [setTasksSynced]);

  const value = useMemo(() => {
    const activeCount = tasks.filter(task => ACTIVE_STATUSES.includes(task.status)).length;
    const failedCount = tasks.filter(task => task.status === 'failed').length;
    const completedCount = tasks.filter(task => task.status === 'complete').length;
    return {
      tasks,
      activeCount,
      failedCount,
      completedCount,
      concurrency: CONCURRENCY,
      directStorageUnavailable,
      directStorageError,
      startUpload,
      retryFailed,
      clearCompleted,
    };
  }, [tasks, directStorageUnavailable, directStorageError, startUpload, retryFailed, clearCompleted]);

  return (
    <GalleryUploadContext.Provider value={value}>
      {children}
    </GalleryUploadContext.Provider>
  );
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
  const { tasks, activeCount, failedCount, completedCount, retryFailed, clearCompleted, concurrency, directStorageUnavailable, directStorageError } = useGalleryUploads();
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (activeCount === 0) return undefined;
    const updateNow = () => setNow(Date.now());
    updateNow();
    const interval = window.setInterval(updateNow, 1000);
    return () => window.clearInterval(interval);
  }, [activeCount]);

  if (tasks.length === 0) return null;

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
  const overall = activeCount > 0 && metricCompletedCount < metricTasks.length ? Math.min(99, rawOverall) : rawOverall;
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
    <div className="fixed bottom-4 right-4 z-50 w-[min(460px,calc(100vw-2rem))] border border-white/10 bg-surface shadow-2xl">
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
              {task.browserPreviewable ? (
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
                {task.error && <div className="mt-1 truncate text-[11px] text-red-400">{task.error}</div>}
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
