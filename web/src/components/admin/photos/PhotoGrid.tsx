import { useState } from 'react';
import { Check, Eye, EyeOff, Image as ImageIcon, Search, Trash2 } from 'lucide-react';
import { photoIntake, type IntakePhoto, type PhotoAlbum } from '../../../services/photoIntake';
import { resolveMediaUrl } from '../../../utils/images';
import { photoButton, photoInput, photoPanel } from './styles';

interface Props {
  eventId: number; photos: IntakePhoto[]; albums: PhotoAlbum[]; total: number; page: number;
  q: string; view: string; busy: boolean; loading: boolean;
  filters: (patch: Record<string, string>) => void;
  mutate: (operation: () => Promise<unknown>, message: string) => Promise<void>;
}
const labels: Record<string, string> = { low_sharpness: 'Possible blur', blurry: 'Possible blur', very_dark: 'Very dark', dark: 'Very dark', overexposed: 'Overexposed', exact_duplicate: 'Exact duplicate', near_duplicate: 'Similar photo' };

export default function PhotoGrid({ eventId, photos, albums, total, page, q, view, busy, loading, filters, mutate }: Props) {
  const [selected, setSelected] = useState<number[]>([]);
  const [moveAlbum, setMoveAlbum] = useState('');
  const visibleSelection = selected.filter(id => photos.some(photo => photo.id === id));
  const allSelected = photos.length > 0 && visibleSelection.length === photos.length;
  const toggle = (id: number) => setSelected(current => current.includes(id) ? current.filter(candidate => candidate !== id) : [...current, id]);

  async function action(data: { active?: boolean; category?: string; approve_review?: boolean }, message: string) {
    await mutate(async () => { await photoIntake.bulkUpdate(eventId, visibleSelection, data); setSelected([]); }, message);
  }

  return <section className={photoPanel} aria-labelledby="event-photo-library" aria-busy={loading}>
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 id="event-photo-library" className="scroll-mt-24 font-heading text-lg font-semibold">Photo library <span className="text-sm text-text-muted">{total.toLocaleString()}</span></h2><span className="text-xs text-text-muted">Page {page} · 48 per page</span></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_200px]">
      <form className="flex min-w-0 gap-2" key={q} onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); filters({ q: String(data.get('q') || '').trim() }); }}>
        <label className="min-w-0 flex-1"><span className="sr-only">Search by filename</span><input name="q" type="search" className={photoInput} placeholder="Search by filename" defaultValue={q} /></label>
        <button className={photoButton} aria-label="Search photos" disabled={busy}><Search size={18} /></button>
      </form>
      <label><span className="sr-only">Photo visibility filter</span><select className={photoInput} value={view} onChange={event => filters({ view: event.target.value })}><option value="">All visibility</option><option value="review">Needs review</option><option value="hidden">Hidden photos</option></select></label>
    </div>
    {view === 'review' && <p className="mt-3 text-sm text-text-secondary">These are suggestions for a person to check. Approving clears review and releases photos held by the review setting. Manually hidden photos stay hidden.</p>}
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-gold" checked={allSelected} disabled={busy || loading || !photos.length} onChange={() => setSelected(allSelected ? [] : photos.map(photo => photo.id))} />Select this page</label>
      <span className="text-sm text-text-muted">{visibleSelection.length} selected</span>
      {!!visibleSelection.length && <button className={photoButton} onClick={() => setSelected([])}>Clear selection</button>}
    </div>
    {!!visibleSelection.length && <div className="mt-2 space-y-3 rounded-lg border border-gold/30 bg-gold/5 p-3" aria-label="Bulk photo actions">
      <div className="flex flex-wrap gap-2">
        <button className={photoButton} disabled={busy} onClick={() => void action({ approve_review: true }, `${visibleSelection.length} photos approved.`)}><Check size={16} />Approve review</button>
        <button className={photoButton} disabled={busy} onClick={() => void action({ active: true }, `${visibleSelection.length} photos shown.`)}><Eye size={16} />Show</button>
        <button className={photoButton} disabled={busy} onClick={() => { if (window.confirm(`Hide ${visibleSelection.length} photos from the public gallery? You can show them again.`)) void action({ active: false }, `${visibleSelection.length} photos hidden.`); }}><EyeOff size={16} />Hide</button>
        <button className={`${photoButton} text-red-300`} disabled={busy} onClick={() => { if (window.confirm(`Permanently delete ${visibleSelection.length} photos? This cannot be undone.`)) void mutate(async () => { await photoIntake.bulkDelete(eventId, visibleSelection); setSelected([]); }, `${visibleSelection.length} photos deleted.`); }}><Trash2 size={16} />Delete</button>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row"><label className="min-w-0 flex-1"><span className="sr-only">Move selected photos to album</span><select className={photoInput} value={moveAlbum} onChange={event => setMoveAlbum(event.target.value)}><option value="">Uncategorized</option>{albums.map(album => <option key={album.id}>{album.name}</option>)}</select></label><button className={photoButton} disabled={busy} onClick={() => { if (window.confirm(`Move ${visibleSelection.length} photos to ${moveAlbum || 'Uncategorized'}?`)) void action({ category: moveAlbum }, `${visibleSelection.length} photos moved to ${moveAlbum || 'Uncategorized'}.`); }}>Move selected</button></div>
    </div>}
    {loading && <p role="status" className="mt-4 text-sm text-text-secondary">Loading photos…</p>}
    {!photos.length && !loading && <div className="py-12 text-center"><ImageIcon className="mx-auto h-8 w-8 text-text-muted" /><p className="mt-3 text-sm text-text-secondary">{q || view ? 'No photos match these filters.' : 'No photos in this album yet. Add photos above.'}</p>{(q || view) && <button className={`${photoButton} mt-3`} onClick={() => filters({ q: '', view: '' })}>Clear search and visibility filter</button>}</div>}
    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {photos.map((photo, index) => {
        const url = resolveMediaUrl(photo.thumbnail_url || photo.large_url);
        const checked = visibleSelection.includes(photo.id);
        const name = photo.original_filename || `Photo ${photo.id}`;
        return <article key={photo.id} className={`min-w-0 overflow-hidden rounded-lg border ${checked ? 'border-gold' : 'border-white/10'} bg-navy-900`}>
          <label className="relative block cursor-pointer">
            <div className="aspect-[4/3] overflow-hidden bg-white/5">{url ? <img src={url} alt="" loading={index < 8 ? 'eager' : 'lazy'} className="h-full w-full object-cover" /> : <span className="flex h-full items-center justify-center gap-1 text-xs text-text-muted"><ImageIcon size={18} />{photo.status === 'failed' ? 'Processing failed' : 'Processing'}</span>}</div>
            <span className="absolute left-0 top-0 flex min-h-11 min-w-11 items-center justify-center rounded-br-lg bg-black/70"><input aria-label={`Select ${name}`} type="checkbox" className="h-5 w-5 accent-gold" checked={checked} disabled={busy || loading} onChange={() => toggle(photo.id)} /></span>
            {!photo.active && <span className="absolute bottom-2 right-2 rounded bg-black/85 px-2 py-1 text-xs text-white">Hidden</span>}
          </label>
          <div className="space-y-1 p-2.5 text-xs"><p className="break-all font-medium" title={name}>{name}</p><p className="break-words text-text-muted">{photo.category || 'Uncategorized'}</p>
            {photo.status !== 'ready' && <p className={photo.status === 'failed' ? 'text-red-300' : 'text-text-muted'}>{photo.status === 'failed' ? photo.processing_error || 'Image processing failed' : 'Preparing gallery sizes…'}</p>}
            {!photo.reviewed_at && photo.review_flags?.map(flag => <span key={flag} className="mr-1 inline-block rounded border border-amber-400/30 bg-amber-400/10 px-1.5 py-1 text-amber-200">{labels[flag] || flag.replaceAll('_', ' ')}</span>)}
          </div>
        </article>;
      })}
    </div>
    <div className="mt-5 flex items-center justify-between gap-3"><button className={photoButton} disabled={page <= 1 || busy || loading} onClick={() => filters({ page: String(page - 1) })}>Previous</button><span className="text-sm text-text-muted">{total ? (page - 1) * 48 + 1 : 0}–{Math.min(page * 48, total)} of {total}</span><button className={photoButton} disabled={page * 48 >= total || busy || loading} onClick={() => filters({ page: String(page + 1) })}>Next</button></div>
  </section>;
}
