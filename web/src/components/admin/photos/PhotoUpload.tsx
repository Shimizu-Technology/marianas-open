import { useState } from 'react';
import { Upload } from 'lucide-react';
import { GALLERY_IMAGE_ACCEPT, isSupportedGalleryImage, useGalleryUploads } from '../../../contexts/GalleryUploadContext';
import { photoIntake, type PhotoAlbum, type PhotoImport, type PhotoSettings } from '../../../services/photoIntake';
import { type Event } from '../../../services/api';
import ZipIntake from './ZipIntake';
import DayAlbums from './DayAlbums';
import { photoButton, photoInput, photoPanel } from './styles';

interface Props {
  event: Event;
  albums: PhotoAlbum[];
  settings: PhotoSettings;
  selectedAlbum: string;
  imports: PhotoImport[];
  busy: boolean;
  refresh: () => void;
  mutate: (operation: () => Promise<unknown>, message: string) => Promise<void>;
}

export default function PhotoUpload({ event, albums, settings, selectedAlbum, imports, busy, refresh, mutate }: Props) {
  const { startUpload } = useGalleryUploads();
  const [uploadAlbumId, setUploadAlbumId] = useState<number | null | undefined>(undefined);
  const [albumType, setAlbumType] = useState('Podium');
  const [customType, setCustomType] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [timezone, setTimezone] = useState(settings.timezone);
  const category = uploadAlbumId === undefined ? (selectedAlbum === '__uncategorized__' ? '' : selectedAlbum) : albums.find(album => album.id === uploadAlbumId)?.name || '';
  const resolvedType = albumType === '__custom__' ? customType.trim() : albumType;

  async function addImages(files: File[]) {
    if (uploading) return;
    setError(''); setNotice(''); setUploading(true);
    const accepted = files.filter(isSupportedGalleryImage);
    const skipped = files.length - accepted.length;
    try {
      if (!accepted.length) throw new Error('Choose supported images up to 50 MB each. JPEG, PNG, HEIC, WebP, GIF, AVIF and TIFF are supported.');
      await startUpload({ eventId: event.id, eventName: event.name, files: accepted, active: true, caption: caption.trim(), category, startSortOrder: event.gallery_images_count || 0 });
      setNotice(`${accepted.length} photos added to the upload queue${category ? ` for ${category}` : ' without an album'}.${skipped ? ` ${skipped} unsupported, empty or over-50 MB files were skipped.` : ''}`);
      refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not queue photos. Try again.'); }
    finally { setUploading(false); }
  }

  return <section className={photoPanel} aria-labelledby="add-event-photos">
    <div className="flex items-center gap-2"><Upload className="h-5 w-5 text-gold" /><h2 id="add-event-photos" className="font-heading text-lg font-semibold">Add photos</h2></div>
    <p className="mt-1 text-sm text-text-secondary">Choose an album first. Add as many photos as you need; they send in smaller groups automatically.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-medium">Upload to album<select className={`${photoInput} mt-1`} value={category} onChange={event => setUploadAlbumId(albums.find(album => album.name === event.target.value)?.id ?? null)}>
        <option value="">Uncategorized — organize later</option>
        {albums.map(album => <option key={album.id} value={album.name}>{album.name}</option>)}
        {category && !albums.some(album => album.name === category) && <option value={category}>{category}</option>}
      </select><span className="mt-1 block text-xs font-normal text-text-muted">Need another album? Use “Create album” in Albums.</span></label>
      <label className="block text-sm font-medium">Caption for this batch <span className="font-normal text-text-muted">(optional)</span><input className={`${photoInput} mt-1`} value={caption} onChange={event => setCaption(event.target.value)} placeholder="e.g. Celebrating the champions" maxLength={500} /><span className="mt-1 block text-xs font-normal text-text-muted">Shown publicly. Leave blank to show photos without a caption.</span></label>
    </div>
    <label className="mt-4 block text-sm font-medium">Choose photos<input aria-describedby="photo-upload-help" className={`${photoInput} mt-1 file:mr-3 file:rounded file:border-0 file:bg-gold file:px-3 file:py-2 file:text-navy-900`} type="file" accept={GALLERY_IMAGE_ACCEPT} multiple disabled={uploading || busy} onChange={event => { const files = Array.from(event.target.files || []); if (files.length) void addImages(files); event.target.value = ''; }} /></label>
    <p id="photo-upload-help" className="mt-2 text-xs leading-5 text-text-muted">No need to resize JPEGs first. Large JPEGs are optimized on your device. Up to 50 MB per original image. Saved uploads resume on this device when you return; keep browser storage available.</p>
    <p className="mt-3 rounded-lg border border-white/10 px-3 py-2 text-sm text-text-secondary">{settings.hold_flagged ? 'Review hold is on: newly flagged photos stay hidden until approved.' : 'Default: flagged photos publish and appear in Needs review.'}</p>
    {notice && <p role="status" className="mt-3 break-words text-sm text-green-300">{notice}</p>}
    {error && <p role="alert" className="mt-3 break-words text-sm text-red-300">{error}</p>}
    <details className="mt-4 border-t border-white/10 pt-3">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-medium">Review and date settings</summary>
      <div className="mt-2 space-y-4">
        <p className="text-sm text-text-secondary"><strong className="text-text-primary">Default: flagged photos publish.</strong> Possible blur, exposure problems and duplicates appear in Needs review for a person to check.</p>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-white/10 p-3 text-sm"><input className="mt-1 h-5 w-5 shrink-0 accent-gold" type="checkbox" checked={settings.hold_flagged} disabled={busy} onChange={change => { const checked = change.target.checked; void mutate(() => photoIntake.settings(event.id, { ...settings, hold_flagged: checked }), 'Review setting saved.'); }} />
          <span>Hold flagged photos until approved<span className="mt-1 block text-xs text-text-muted">Applies to newly processed photos. Hidden photos remain hidden until staff approve or show them.</span></span>
        </label>
        <form className="space-y-2" onSubmit={form => { form.preventDefault(); void mutate(() => photoIntake.settings(event.id, { ...settings, timezone: timezone.trim() }), 'Event timezone saved.'); }}>
          <label className="block text-sm font-medium">Event timezone<input className={`${photoInput} mt-1`} list="photo-timezones" value={timezone} onChange={event => setTimezone(event.target.value)} required maxLength={100} /><datalist id="photo-timezones"><option value="Pacific/Guam" /><option value="Asia/Tokyo" /><option value="Asia/Manila" /><option value="Asia/Taipei" /><option value="Asia/Hong_Kong" /></datalist></label>
          <p className="text-xs text-text-muted">Choose the venue’s IANA timezone explicitly. Current: {settings.timezone}. Camera times without an offset are treated as local to this timezone.</p>
          <button className={photoButton} disabled={busy || !timezone.trim()}>Save timezone</button>
        </form>
      </div>
    </details>
    <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
      <label className="block text-sm font-medium">Album type for day suggestions<select className={`${photoInput} mt-1`} value={albumType} onChange={event => setAlbumType(event.target.value)}><option>Podium</option><option>Tournament</option><option>Opening Ceremony</option><option value="__custom__">Custom type…</option></select></label>
      {albumType === '__custom__' && <label className="block text-sm">Custom album type<input className={`${photoInput} mt-1`} value={customType} onChange={event => setCustomType(event.target.value)} maxLength={65} placeholder="e.g. Awards" /></label>}
      <DayAlbums eventId={event.id} albumType={resolvedType} timezone={settings.timezone} busy={busy} mutate={mutate} />
      <ZipIntake eventId={event.id} options={{ album_type: resolvedType, category, timezone: settings.timezone, hold_flagged: settings.hold_flagged }} imports={imports} onImported={refresh} />
    </div>
  </section>;

}
