/// <reference types="node" />
import 'fake-indexeddb/auto';
import { File as NodeFile } from 'node:buffer';
import SparkMD5 from 'spark-md5';
import { afterEach, expect, it, vi } from 'vitest';
import { photoIntake, type PhotoImport } from '../services/photoIntake';
import { enqueueZip, removeSavedZip, sendSavedZip, withZipIntakeLock, zipChecksum, zipQueue, type SavedZip } from './zipIntake';

const options = { album_type: 'Podium', category: 'Podium', timezone: 'Pacific/Guam', hold_flagged: false };
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

it('hashes a multi-chunk archive incrementally with a storage-compatible checksum', async () => {
  const bytes = new Uint8Array(9 * 1024 * 1024 + 2).fill(37);
  const file = new File([bytes], 'photos.zip');
  const updates: number[] = [];
  expect(await zipChecksum(file, progress => updates.push(progress), new AbortController().signal)).toBe(btoa(SparkMD5.ArrayBuffer.hash(bytes.buffer, true)));
  expect(updates).toHaveLength(3);
  expect(updates.at(-1)).toBe(100);
});

it('stops checksum work when the page pauses it', async () => {
  const abort = new AbortController(); abort.abort();
  await expect(zipChecksum(new File(['zip'], 'photos.zip'), () => {}, abort.signal)).rejects.toHaveProperty('name', 'AbortError');
});

it('persists original file bytes and checkpoints across a new IndexedDB connection, isolated by user/event', async () => {
  const record: SavedZip = { id: 'zip-7', key: 'staff-a:7', eventId: 7, file: new NodeFile(['archive bytes'], 'photos.zip', { type: 'application/zip' }) as unknown as File, options, checksum: 'saved-hash', prepared: { signed_id: 'signed-7', direct_upload: { url: 'https://storage.example/upload', headers: {} } }, uploaded: true };
  await zipQueue.save(record);
  const restored = await zipQueue.load(record.key);
  expect(await restored?.file.text()).toBe('archive bytes');
  expect(restored?.prepared?.signed_id).toBe('signed-7');
  expect(restored?.options).toEqual(options);
  expect(await zipQueue.load('staff-b:7')).toBeUndefined();
  expect(await zipQueue.load('staff-a:8')).toBeUndefined();
  await zipQueue.remove(record.key);
  expect(await zipQueue.load(record.key)).toBeUndefined();
});

it('retries saved completion without hashing or sending uploaded ZIP bytes again', async () => {
  const record: SavedZip = { id: 'zip-8', key: 'staff-a:8', eventId: 8, file: new NodeFile(['archive bytes'], 'photos.zip') as unknown as File, options, checksum: 'saved-hash', prepared: { signed_id: 'signed-8', direct_upload: { url: 'https://storage.example/upload', headers: {} } }, uploaded: true };
  await zipQueue.save(record);
  const complete = vi.spyOn(photoIntake, 'completeZip').mockRejectedValueOnce(new Error('Network down')).mockResolvedValue({ import: { id: 42, status: 'queued' } as PhotoImport });
  const prepare = vi.spyOn(photoIntake, 'prepareZip');
  await expect(sendSavedZip(record, () => {}, new AbortController().signal)).rejects.toThrow('Network down');
  expect((await zipQueue.load(record.key))?.uploaded).toBe(true);
  const restored = (await zipQueue.load(record.key))!;
  expect(await sendSavedZip(restored, () => {}, new AbortController().signal)).toMatchObject({ id: 42 });
  expect(complete).toHaveBeenLastCalledWith(8, 'signed-8', options);
  expect(prepare).not.toHaveBeenCalled();
  expect(await zipQueue.load(record.key)).toBeUndefined();
});

it('reports storage failures before advancing the upload', async () => {
  vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(() => { throw new DOMException('Storage full', 'QuotaExceededError'); });
  await expect(zipQueue.save({ id: 'zip-full', key: 'full:7', eventId: 7, file: new NodeFile(['zip'], 'photos.zip') as unknown as File, options })).rejects.toThrow('Free browser storage');
});

function mockLocks() {
  const held = new Set<string>();
  vi.stubGlobal('navigator', { locks: { request: async (name: string, _options: unknown, callback: (lock: Lock | null) => Promise<unknown>) => {
    if (held.has(name)) return callback(null);
    held.add(name);
    try { return await callback({ name } as Lock); } finally { held.delete(name); }
  } } });
}

it('serializes enqueue with transfers and refuses replacement of another saved ZIP', async () => {
  mockLocks();
  const first: SavedZip = { id: 'first', key: 'tabs:7', eventId: 7, file: new NodeFile(['one'], 'one.zip') as unknown as File, options };
  const second: SavedZip = { ...first, id: 'second', file: new NodeFile(['two'], 'two.zip') as unknown as File };
  const attempts = await Promise.allSettled([enqueueZip(first), enqueueZip(second)]);
  expect(attempts.filter(result => result.status === 'fulfilled')).toHaveLength(1);
  expect((await zipQueue.load(first.key))?.id).toBe('first');
  await expect(enqueueZip(second)).rejects.toThrow('already exists');
  await withZipIntakeLock(first.key, async () => {
    await expect(removeSavedZip(first)).rejects.toThrow('active in another tab');
    expect((await zipQueue.load(first.key))?.id).toBe('first');
  });
  await removeSavedZip(first);
  await enqueueZip(second);
  await expect(removeSavedZip(first)).rejects.toThrow('Another ZIP was saved');
  expect((await zipQueue.load(first.key))?.id).toBe('second');
  await removeSavedZip(second);
});
