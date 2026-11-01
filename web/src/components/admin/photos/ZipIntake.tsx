import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Archive, RotateCw, X } from 'lucide-react';
import { sendSavedZip, ZIP_MAX_BYTES, zipQueue, type SavedZip } from '../../../utils/zipIntake';
import type { ImportOptions, PhotoImport } from '../../../services/photoIntake';
import { photoButton, photoInput } from './styles';

interface Props { eventId: number; options: ImportOptions; onImported: () => void; imports: PhotoImport[] }
export default function ZipIntake({ eventId, options, onImported, imports }: Props) {
  const { userId } = useAuth();
  const key = userId ? `${userId}:${eventId}` : '';
  const [saved, setSaved] = useState<SavedZip | null>(null);
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const onImportedRef = useRef(onImported);
  useEffect(() => { onImportedRef.current = onImported; }, [onImported]);

  const send = useCallback(async (record: SavedZip) => {
    if (running.current) return;
    running.current = true;
    setBusy(true); setError('');
    const abort = new AbortController();
    controller.current = abort;
    try {
      if (!navigator.locks) throw new Error('ZIP resume requires a browser with Web Locks. Use current Safari, Chrome, Edge, or Firefox.');
      await navigator.locks.request(`mo-zip:${record.key}`, { ifAvailable: true }, async lock => {
        if (!lock) throw new Error('This ZIP is uploading in another tab. Return to that tab or close it, then retry.');
        const latest = await zipQueue.load(record.key);
        if (!latest) return;
        await sendSavedZip(latest, (label, percent) => { setStage(label); setProgress(percent); }, abort.signal);
        if (abort.signal.aborted) return;
        setSaved(null); setStage('ZIP received. The worker is importing your photos.');
        onImportedRef.current();
      });
    } catch (cause) {
      if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not send ZIP. Retry below.');
    } finally { running.current = false; if (!abort.signal.aborted) setBusy(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!key) return;
    zipQueue.load(key).then(record => {
      if (cancelled) return;
      setReady(true);
      if (record) { setSaved(record); void send(record); }
    }).catch(cause => { if (!cancelled) { setError(cause instanceof Error ? cause.message : 'Could not restore ZIP.'); setReady(true); } });
    return () => { cancelled = true; controller.current?.abort(); };
  }, [key, send]);

  async function choose(file: File) {
    if (!key) return;
    setError('');
    if (!file.name.toLowerCase().endsWith('.zip') || file.size <= 0 || file.size > ZIP_MAX_BYTES) { setError('Choose a non-empty .zip file up to 4 GB.'); return; }
    const record: SavedZip = { key, eventId, file, options };
    setBusy(true);
    try {
      await navigator.storage?.persist?.().catch(() => false);
      await zipQueue.save(record);
      setSaved(record); setBusy(false);
      await send(record);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save ZIP on this device.'); setBusy(false); }
  }

  return <div className="space-y-3 border-t border-white/10 pt-4">
    <h3 className="flex items-center gap-2 font-medium"><Archive size={18} className="text-gold" />Have a ZIP from the team?</h3>
    <p className="text-sm text-text-secondary">Download the gigafile ZIP to your device, then choose it here. Up to 4 GB. Photos are imported one at a time; folders and non-images are skipped.</p>
    <label className="block text-sm font-medium">ZIP file<input className={`${photoInput} mt-1 file:mr-3 file:rounded file:border-0 file:bg-surface-light file:px-3 file:py-2 file:text-text-primary`} type="file" accept=".zip,application/zip" disabled={!key || !ready || busy || !!saved || !options.album_type.trim()} onChange={event => { const file = event.target.files?.[0]; if (file) void choose(file); event.target.value = ''; }} /></label>
    {!options.album_type.trim() && <p className="text-sm text-amber-200">Enter a custom album type above before choosing a ZIP.</p>}
    <p className="text-xs leading-5 text-text-muted">Keep this page open while sending. A locked phone can pause a transfer. Reopen Photos to resume; an interrupted ZIP transfer starts again, then continues from its saved completion checkpoint. Browser storage must have room for the ZIP.</p>
    {saved && <div className="rounded-lg border border-white/15 p-3">
      <p className="break-all text-sm font-medium">{saved.file.name}</p>
      <p className="mt-1 text-xs text-text-secondary">Saved on this device · Album: {saved.options.category || 'Uncategorized'} · {saved.options.timezone}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {!busy && <button className={photoButton} onClick={() => void send(saved)}><RotateCw size={16} />Retry saved ZIP</button>}
        {!busy && <button className={photoButton} onClick={async () => { if (!window.confirm('Remove this saved ZIP from this device? Imported photos will remain.')) return; try { await zipQueue.remove(saved.key); setSaved(null); setError(''); setStage(''); } catch { setError('Could not remove the saved ZIP. Try again.'); } }}><X size={16} />Remove saved ZIP</button>}
      </div>
    </div>}
    {stage && <div role="status" className="text-sm text-text-secondary">{stage}{busy ? ` · ${progress}%` : ''}{busy && <progress className="mt-2 block h-2 w-full accent-gold" max={100} value={progress} aria-label={stage} />}</div>}
    {error && <p role="alert" className="break-words text-sm text-red-300">{error}</p>}
    {imports.length > 0 && <div className="space-y-2">
      <h3 className="text-sm font-medium">Recent ZIP imports</h3>
      {imports.map(item => <div key={item.id} className="rounded-lg border border-white/10 p-3 text-sm">
        <div className="flex flex-wrap justify-between gap-1"><span className="min-w-0 break-all font-medium">{item.filename}</span><span className="capitalize text-gold">{item.status.replaceAll('_', ' ')}</span></div>
        <p className="mt-1 text-text-secondary">{item.imported_count} imported · {item.skipped_count} skipped · {item.processed_entries} / {item.total_entries || '?'} entries checked</p>
        {['queued', 'processing', 'pending', 'importing'].includes(item.status) && <progress className="mt-2 h-2 w-full accent-gold" max={Math.max(1, item.total_entries)} value={item.processed_entries} aria-label={`Import progress for ${item.filename}`} />}
        {!!item.errors?.length && <details className="mt-2 break-words text-red-300"><summary className="min-h-11 cursor-pointer py-2">{item.errors.length} import notes</summary><ul className="list-disc space-y-1 pl-5">{item.errors.map((note, index) => <li key={index}>{typeof note === 'string' ? note : `${note.entry}: ${note.message}`}</li>)}</ul></details>}
      </div>)}
    </div>}
  </div>;
}
