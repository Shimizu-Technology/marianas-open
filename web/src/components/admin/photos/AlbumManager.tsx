import { useState } from 'react';
import { ArrowDown, ArrowUp, FolderOpen, Pencil, Plus } from 'lucide-react';
import { photoIntake, type PhotoAlbum } from '../../../services/photoIntake';
import { resolveMediaUrl } from '../../../utils/images';
import { photoButton, photoInput, photoPanel } from './styles';

interface Props {
  eventId: number;
  albums: PhotoAlbum[];
  selected: string;
  busy: boolean;
  select: (name: string) => void;
  mutate: (operation: () => Promise<unknown>, message: string) => Promise<void>;
}

export default function AlbumManager({ eventId, albums, selected, busy, select, mutate }: Props) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [rename, setRename] = useState('');
  const [mobileExpanded, setMobileExpanded] = useState(false);

  return <section className={photoPanel} aria-labelledby="photo-albums">
    <div className="flex items-center justify-between gap-3">
      <h2 id="photo-albums" className="font-heading text-lg font-semibold">Albums <span className="text-sm text-text-muted">{albums.length}</span></h2>
      <FolderOpen className="hidden h-5 w-5 text-gold lg:block" aria-hidden="true" />
      <button className={`${photoButton} lg:hidden`} aria-expanded={mobileExpanded} aria-controls="photo-album-controls" onClick={() => setMobileExpanded(value => !value)}>{mobileExpanded ? 'Close albums' : 'Manage albums'}</button>
    </div>
    <div id="photo-album-controls" className={`${mobileExpanded ? 'block' : 'hidden'} lg:block`}>
    <p className="mt-1 text-sm text-text-secondary">Pick an album to see its photos. Arrows set the public album order.</p>
    <div className="mt-3 space-y-2">
      <button className={`${photoButton} w-full justify-start ${selected === '' ? 'border-gold text-gold' : ''}`} onClick={() => select('')} aria-pressed={selected === ''}>All photos</button>
      <button className={`${photoButton} w-full justify-start ${selected === '__uncategorized__' ? 'border-gold text-gold' : ''}`} onClick={() => select('__uncategorized__')} aria-pressed={selected === '__uncategorized__'}>Uncategorized</button>
      {albums.map((album, index) => <div key={album.id} className={`rounded-lg border ${selected === album.name ? 'border-gold/70 bg-gold/5' : 'border-white/10'}`}>
        <div className="flex min-w-0 items-center gap-2 p-2">
          <button onClick={() => select(album.name)} aria-pressed={selected === album.name} className="flex min-h-11 min-w-0 flex-1 touch-manipulation items-center gap-2 rounded text-left focus-visible:outline-2 focus-visible:outline-gold">
            {album.cover_url ? <img src={resolveMediaUrl(album.cover_url) || undefined} alt="" className="h-11 w-11 shrink-0 rounded object-cover" loading="lazy" /> : <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-white/5"><FolderOpen className="h-5 w-5 text-text-muted" /></span>}
            <span className="min-w-0 flex-1 break-words text-sm font-medium">{album.name}<span className="block text-xs font-normal text-text-muted">{album.count.toLocaleString()} photos</span></span>
          </button>
          <button className={`${photoButton} shrink-0 px-2`} disabled={busy} aria-label={`Rename ${album.name}`} onClick={() => { setEditing(album.id); setRename(album.name); }}><Pencil size={16} /></button>
        </div>
        {editing === album.id && <form className="space-y-2 px-2 pb-2" onSubmit={event => {
          event.preventDefault();
          void mutate(async () => {
            await photoIntake.updateAlbum(eventId, album.id, { name: rename.trim() });
            if (selected === album.name) select(rename.trim());
            setEditing(null);
          }, 'Album renamed.');
        }}>
          <label className="block text-sm">Album name<input autoFocus className={`${photoInput} mt-1`} value={rename} maxLength={80} required onChange={event => setRename(event.target.value)} /></label>
          <div className="flex gap-2"><button className={photoButton} disabled={busy || !rename.trim()}>Save name</button><button type="button" className={photoButton} onClick={() => setEditing(null)}>Cancel</button></div>
        </form>}
        <div className="flex justify-end gap-1 border-t border-white/5 px-2 py-1">
          <button className={`${photoButton} border-transparent bg-transparent px-2`} aria-label={`Move ${album.name} up`} disabled={busy || index === 0} onClick={() => void mutate(() => photoIntake.updateAlbum(eventId, album.id, { sort_order: index - 1 }), 'Album order saved.')}><ArrowUp size={16} /></button>
          <button className={`${photoButton} border-transparent bg-transparent px-2`} aria-label={`Move ${album.name} down`} disabled={busy || index === albums.length - 1} onClick={() => void mutate(() => photoIntake.updateAlbum(eventId, album.id, { sort_order: index + 1 }), 'Album order saved.')}><ArrowDown size={16} /></button>
        </div>
      </div>)}
    </div>
    <form className="mt-4 space-y-2 border-t border-white/10 pt-4" onSubmit={event => {
      event.preventDefault();
      void mutate(async () => {
        await photoIntake.createAlbum(eventId, newName.trim());
        setNewName('');
      }, 'Album created. Choose it above or in the upload album menu.');
    }}>
      <label className="block text-sm font-medium" htmlFor="new-photo-album">New album</label>
      <input id="new-photo-album" className={photoInput} placeholder="e.g. Podium Day 1" maxLength={80} required value={newName} onChange={event => setNewName(event.target.value)} />
      <button className={`${photoButton} w-full`} disabled={busy || !newName.trim()}><Plus size={16} />Create album</button>
    </form>
    </div>
  </section>;
}
