import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Image as ImageIcon, RefreshCw } from 'lucide-react';
import { api, type Event } from '../../services/api';
import { photoIntake, type IntakePhoto, type PhotoAlbum, type PhotoImport, type PhotoSettings } from '../../services/photoIntake';
import { useGalleryUploads } from '../../contexts/GalleryUploadContext';
import AlbumManager from '../../components/admin/photos/AlbumManager';
import PhotoUpload from '../../components/admin/photos/PhotoUpload';
import PhotoGrid from '../../components/admin/photos/PhotoGrid';
import { photoButton, photoPanel } from '../../components/admin/photos/styles';

export default function PhotosAdmin() {
  const { eventId } = useParams();
  const [events, setEvents] = useState<Event[] | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    api.admin.getEvents().then(result => { if (!cancelled) { setEvents(result.events); setError(''); } })
      .catch(cause => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load events.'); });
    return () => { cancelled = true; };
  }, [revision]);

  if (error) return <div className={photoPanel}><p role="alert" className="text-sm text-red-300">{error}</p><button className={`${photoButton} mt-3`} onClick={() => setRevision(value => value + 1)}>Retry events</button></div>;
  if (!events) return <p role="status" className="text-text-secondary">Loading events…</p>;
  if (eventId) {
    const event = events.find(candidate => String(candidate.id) === eventId);
    return event ? <EventPhotos key={event.id} event={event} /> : <div className={photoPanel}><h1 className="text-xl font-semibold">Event not found</h1><Link className={`${photoButton} mt-4`} to="/admin/photos">Choose another event</Link></div>;
  }
  return <div className="mx-auto max-w-6xl space-y-6">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-gold">Event media</p><h1 className="mt-1 font-heading text-3xl font-bold">Photos</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Albums, uploads and photo review in one place. Choose the event you’re working on.</p></div>
    {!events.length && <p className={photoPanel}>No events yet. Create an event in Events & Results first.</p>}
    <div className="grid gap-3 sm:grid-cols-2">{events.map(event => <Link key={event.id} to={`/admin/photos/${event.id}`} className={`${photoPanel} flex min-h-28 items-center gap-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold`}>
      <ImageIcon className="h-7 w-7 shrink-0 text-gold" /><div className="min-w-0 flex-1"><h2 className="break-words font-semibold">{event.name}</h2><p className="mt-1 text-sm text-text-secondary">{event.date} · {event.gallery_images_count || 0} public photos</p></div><ArrowRight className="h-5 w-5 shrink-0 text-text-muted" />
    </Link>)}</div>
  </div>;
}

function EventPhotos({ event }: { event: Event }) {
  const [params, setParams] = useSearchParams();
  const category = params.get('album') || '';
  const q = params.get('q') || '';
  const view = params.get('view') || '';
  const requestedPage = Number(params.get('page') || '1');
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [settings, setSettings] = useState<PhotoSettings | null>(null);
  const [photos, setPhotos] = useState<IntakePhoto[]>([]);
  const [imports, setImports] = useState<PhotoImport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loadedFilter, setLoadedFilter] = useState('');
  const filterKey = JSON.stringify([category, q, view, page]);
  const generation = useRef(0);
  const { tasks } = useGalleryUploads();
  const taskVersion = tasks.filter(task => task.eventId === event.id && task.status === 'complete').length;

  const load = useCallback(async () => {
    const currentGeneration = ++generation.current;
    try {
      const filters: Record<string, string | number> = { page, per_page: 48 };
      if (category) filters.category = category;
      if (q) filters.q = q;
      if (view === 'hidden') filters.hidden = 1;
      if (view === 'review') filters.needs_review = 1;
      const [albumResult, photoResult, importResult] = await Promise.all([
        photoIntake.albums(event.id), photoIntake.photos(event.id, filters), photoIntake.imports(event.id),
      ]);
      if (generation.current !== currentGeneration) return;
      setAlbums(albumResult.albums); setSettings(albumResult.settings); setPhotos(photoResult.gallery_images);
      setTotal(photoResult.total); setImports(importResult.imports); setError('');
      setLoadedFilter(filterKey);
    } catch (cause) {
      if (generation.current === currentGeneration) setError(cause instanceof Error ? cause.message : 'Could not load photos. Try again.');
    } finally { if (generation.current === currentGeneration) setLoading(false); }
  }, [event.id, page, category, q, view, filterKey]);

  useEffect(() => { void load(); return () => { generation.current++; }; }, [load, taskVersion]);
  const processing = imports.some(item => ['pending', 'queued', 'processing', 'importing'].includes(item.status)) || photos.some(photo => ['pending', 'uploaded', 'processing'].includes(photo.status));
  useEffect(() => {
    if (!processing) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, 6000);
    const resume = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', resume);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', resume); };
  }, [load, processing]);

  async function mutate(operation: () => Promise<unknown>, success: string) {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await operation(); setMessage(success); await load(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save. Your selection is still available; try again.'); }
    finally { setBusy(false); }
  }
  function filters(patch: Record<string, string>) {
    const next = new URLSearchParams(params);
    if (!('page' in patch)) next.delete('page');
    Object.entries(patch).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    setParams(next);
    setMessage('');
  }

  return <div className="mx-auto max-w-[1500px] space-y-5 pb-24">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0"><Link className="inline-flex min-h-11 items-center gap-2 text-sm text-text-secondary" to="/admin/photos"><ArrowLeft size={16} />All events</Link><h1 className="break-words font-heading text-2xl font-bold sm:text-3xl">{event.name}<span className="mt-1 block text-lg font-normal text-text-secondary">Photos</span></h1></div>
      <div className="flex flex-wrap gap-2"><a className={photoButton} href="#event-photo-library">Photo library</a><button className={photoButton} disabled={busy || loading} onClick={() => void load()}><RefreshCw size={16} />Refresh</button></div>
    </div>
    {error && <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 p-4 text-sm text-red-200"><p className="break-words">{error}</p><button className={`${photoButton} mt-2`} onClick={() => void load()} disabled={busy}>Retry loading photos</button></div>}
    {message && <p role="status" className="rounded-lg border border-green-400/20 bg-green-400/5 p-3 text-sm text-green-200">{message}</p>}
    {!settings ? loading && <p role="status" className="text-sm text-text-secondary">Loading albums and photos…</p> : <>
      <div className="grid items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AlbumManager eventId={event.id} albums={albums} selected={category} select={album => filters({ album })} busy={busy} mutate={mutate} />
        <div className="min-w-0 space-y-5"><PhotoUpload key={`${event.id}:${settings.timezone}`} event={event} albums={albums} settings={settings} selectedAlbum={category} imports={imports} busy={busy} refresh={() => void load()} mutate={mutate} />
          <PhotoGrid key={`${category}:${q}:${view}:${page}`} eventId={event.id} photos={loadedFilter === filterKey ? photos : []} albums={albums} total={loadedFilter === filterKey ? total : 0} page={page} q={q} view={view} busy={busy} loading={loading || (loadedFilter !== filterKey && !error)} filters={filters} mutate={mutate} />
        </div>
      </div>
    </>}
  </div>;
}
