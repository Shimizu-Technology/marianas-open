/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import SparkMD5 from 'spark-md5';
import { CheckCircle2, Loader2, UploadCloud, XCircle } from 'lucide-react';
import { api } from '../services/api';
import type { EventGalleryImage } from '../services/api';

type UploadStatus = 'queued' | 'hashing' | 'uploading' | 'saving' | 'complete' | 'failed';

export interface GalleryUploadTask {
  id: string;
  eventId: number;
  eventName: string;
  batchId: number;
  fileName: string;
  fileSize: number;
  previewUrl: string;
  progress: number;
  status: UploadStatus;
  error?: string;
  galleryImage?: EventGalleryImage;
}

interface StartUploadOptions {
  eventId: number;
  eventName: string;
  files: File[];
  active: boolean;
  caption: string;
  startSortOrder: number;
}

interface GalleryUploadContextValue {
  tasks: GalleryUploadTask[];
  activeCount: number;
  failedCount: number;
  completedCount: number;
  startUpload: (options: StartUploadOptions) => Promise<void>;
  retryFailed: () => void;
  clearCompleted: () => void;
}

const GalleryUploadContext = createContext<GalleryUploadContextValue | null>(null);
const CONCURRENCY = 4;
export const GALLERY_IMAGE_MAX_BYTES = 50 * 1024 * 1024;
export const GALLERY_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];
export const GALLERY_IMAGE_ACCEPT = GALLERY_IMAGE_TYPES.join(',');

export function isSupportedGalleryImage(file: File) {
  return GALLERY_IMAGE_TYPES.includes(file.type) && file.size > 0 && file.size <= GALLERY_IMAGE_MAX_BYTES;
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
    xhr.onerror = () => reject(new Error('Storage upload failed'));
    xhr.send(file);
  });
}

function titleFromFilename(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
}

export function GalleryUploadProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState<GalleryUploadTask[]>([]);
  const tasksRef = useRef<GalleryUploadTask[]>([]);
  const fileMapRef = useRef(new Map<string, File>());
  const metaMapRef = useRef(new Map<string, { active: boolean; caption: string; sortOrder: number }>());
  const runningRef = useRef(0);
  const processQueueRef = useRef<() => void>(() => undefined);

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

    return () => {
      tasksRef.current.forEach(task => URL.revokeObjectURL(task.previewUrl));
      files.clear();
      metas.clear();
    };
  }, []);

  const updateTask = useCallback((id: string, updates: Partial<GalleryUploadTask>) => {
    setTasksSynced(current => current.map(task => task.id === id ? { ...task, ...updates } : task));
  }, [setTasksSynced]);

  const processTask = useCallback(async (task: GalleryUploadTask) => {
    try {
      const file = fileMapRef.current.get(task.id);
      const meta = metaMapRef.current.get(task.id);
      if (!file || !meta) throw new Error('Upload task is missing its file data');

      const md5 = await checksum(file);

      const prepared = await api.admin.prepareEventGalleryDirectUpload(task.eventId, {
        filename: file.name,
        byte_size: file.size,
        checksum: md5,
        content_type: file.type || 'application/octet-stream',
      });

      updateTask(task.id, { status: 'uploading', progress: 10 });
      await uploadToStorage(prepared.direct_upload.url, prepared.direct_upload.headers, file, (progress) => {
        updateTask(task.id, { progress: Math.max(10, Math.round(10 + progress * 75)) });
      });

      updateTask(task.id, { status: 'saving', progress: 90 });
      const completed = await api.admin.completeEventGalleryDirectUpload(task.eventId, {
        signed_id: prepared.signed_id,
        batch_id: task.batchId,
        title: titleFromFilename(file.name),
        alt_text: titleFromFilename(file.name),
        caption: meta.caption,
        sort_order: meta.sortOrder,
        active: meta.active,
      });

      updateTask(task.id, { status: 'complete', progress: 100, galleryImage: completed.gallery_image });
    } catch (error) {
      updateTask(task.id, {
        status: 'failed',
        progress: 0,
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    } finally {
      runningRef.current -= 1;
      processQueueRef.current();
    }
  }, [updateTask]);

  const processQueue = useCallback(() => {
    const available = Math.max(0, CONCURRENCY - runningRef.current);
    if (available === 0) return;

    const next = tasksRef.current
      .filter(task => task.status === 'queued')
      .slice(0, available);
    if (next.length === 0) return;

    const claimedIds = new Set(next.map(task => task.id));
    runningRef.current += next.length;
    setTasksSynced(current => current.map(task => (
      claimedIds.has(task.id)
        ? { ...task, status: 'hashing', progress: 2, error: undefined }
        : task
    )));

    next.forEach(task => {
      void processTask({ ...task, status: 'hashing', progress: 2, error: undefined });
    });
  }, [processTask, setTasksSynced]);
  processQueueRef.current = processQueue;

  const startUpload = useCallback(async ({ eventId, eventName, files, active, caption, startSortOrder }: StartUploadOptions) => {
    const imageFiles = files.filter(isSupportedGalleryImage);
    if (imageFiles.length === 0) return;

    const totalBytes = imageFiles.reduce((sum, file) => sum + file.size, 0);
    const { batch } = await api.admin.createGalleryUploadBatch(eventId, {
      title: `${eventName} photo upload`,
      total_files: imageFiles.length,
      total_bytes: totalBytes,
    });

    const createdAt = Date.now();
    const newTasks = imageFiles.map((file, index) => {
      const id = `${batch.id}-${createdAt}-${index}-${crypto.randomUUID()}`;
      fileMapRef.current.set(id, file);
      metaMapRef.current.set(id, { active, caption, sortOrder: startSortOrder + index });
      return {
        id,
        eventId,
        eventName,
        batchId: batch.id,
        fileName: file.name,
        fileSize: file.size,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        status: 'queued' as UploadStatus,
      };
    });

    setTasksSynced(current => [...newTasks, ...current]);
    window.setTimeout(processQueue, 0);
  }, [processQueue, setTasksSynced]);

  const retryFailed = useCallback(() => {
    setTasksSynced(current => current.map(task => task.status === 'failed' ? { ...task, status: 'queued', progress: 0, error: undefined } : task));
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
    const activeCount = tasks.filter(task => ['queued', 'hashing', 'uploading', 'saving'].includes(task.status)).length;
    const failedCount = tasks.filter(task => task.status === 'failed').length;
    const completedCount = tasks.filter(task => task.status === 'complete').length;
    return { tasks, activeCount, failedCount, completedCount, startUpload, retryFailed, clearCompleted };
  }, [tasks, startUpload, retryFailed, clearCompleted]);

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

export function GalleryUploadStatusPanel() {
  const { tasks, activeCount, failedCount, completedCount, retryFailed, clearCompleted } = useGalleryUploads();
  if (tasks.length === 0) return null;

  const overall = tasks.length > 0
    ? Math.round(tasks.reduce((sum, task) => sum + task.progress, 0) / tasks.length)
    : 0;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] border border-white/10 bg-surface shadow-2xl">
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
        <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
          <span>{activeCount} active</span>
          <span>{completedCount} complete</span>
          <span>{failedCount} failed</span>
        </div>
      </div>
      <div className="max-h-64 overflow-auto">
        {tasks.slice(0, 8).map(task => (
          <div key={task.id} className="flex items-center gap-3 p-3 border-b border-white/5">
            <img src={task.previewUrl} alt="" className="w-10 h-10 object-cover bg-white/5" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs text-text-primary">{task.fileName}</div>
              <div className="mt-1 h-1 bg-white/5 overflow-hidden">
                <div className={`h-full ${task.status === 'failed' ? 'bg-red-400' : 'bg-gold'}`} style={{ width: `${task.progress}%` }} />
              </div>
              {task.error && <div className="mt-1 truncate text-[11px] text-red-400">{task.error}</div>}
            </div>
            {task.status === 'complete' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
            {task.status === 'failed' && <XCircle className="w-4 h-4 text-red-400" />}
          </div>
        ))}
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
