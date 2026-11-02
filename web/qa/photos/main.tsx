import { DEFAULT_GALLERY_IMAGE_POLICY } from '../../src/utils/galleryImagePolicy';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import '../../src/index.css';
import PhotosAdmin from '../../src/pages/admin/PhotosAdmin';
import AdminLayout from '../../src/layouts/AdminLayout';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { api, type Event } from '../../src/services/api';
import { photoIntake, type DayProposal, type IntakePhoto, type PhotoAlbum, type PhotoSettings } from '../../src/services/photoIntake';

if (!import.meta.env.DEV) throw new Error('The fixture harness is development only.');
const event = { id: 7, name: 'Marianas Open 2027', slug: 'marianas-open-2027', date: '2027-10-23', end_date: '2027-10-24', gallery_images_count: 884 } as Event;
const media = (path: string) => new URL(path, location.href).href;
let albums: PhotoAlbum[] = [
  { id: 1, name: 'Podium Day 1', count: 150, sort_order: 0, cover_url: '/images/podium-1.webp' },
  { id: 2, name: 'Tournament Day 1', count: 706, sort_order: 1, cover_url: '/images/action-match-4.webp' },
  { id: 3, name: 'Opening Ceremony', count: 28, sort_order: 2, cover_url: '/images/venue-mats.webp' },
];
albums = albums.map(album => ({ ...album, cover_url: media(album.cover_url!) }));
let settings: PhotoSettings = { timezone: 'Pacific/Guam', hold_flagged: false };
let photos: IntakePhoto[] = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1, event_id: 7, original_filename: `DSC_${4301 + index}.jpg`, category: index < 5 ? 'Podium Day 1' : 'Tournament Day 1',
  title: null, caption: null, alt_text: null, sort_order: index, active: index !== 2, status: 'ready',
  thumbnail_url: media(['/images/podium-1.webp', '/images/action-match-4.webp', '/images/venue-mats.webp'][index % 3]), large_url: null, image_url: null,
  content_type: 'image/jpeg', byte_size: 2000000, width: 1800, height: 1200, processed_at: null, processing_error: null,
  review_flags: index === 2 ? ['low_sharpness', 'dark'] : index === 4 ? ['near_duplicate'] : [], reviewed_at: null,
  captured_at: '2027-10-23T02:00:00Z', capture_source: 'exif',
}));
api.admin.getGalleryUploadPolicy = async () => ({ upload_policy: location.search.includes('heif=1') ? {
  content_types: [...DEFAULT_GALLERY_IMAGE_POLICY.content_types, 'image/heic', 'image/heif', 'image/avif'],
  extensions: [...DEFAULT_GALLERY_IMAGE_POLICY.extensions, '.heic', '.heif', '.avif'],
  type_label: 'JPEG, PNG, WebP, GIF, TIFF, HEIC, HEIF, AVIF',
} : DEFAULT_GALLERY_IMAGE_POLICY });
api.admin.getEvents = async () => ({ events: [event] });
api.getCurrentUser = async () => ({ user: { is_admin: true } } as Awaited<ReturnType<typeof api.getCurrentUser>>);
photoIntake.albums = async () => ({ albums: [...albums].sort((a, b) => a.sort_order - b.sort_order), settings });
photoIntake.photos = async (_id, filters) => {
  const matches = photos.filter(photo => (!filters.category || photo.category === filters.category) && (!filters.q || photo.original_filename?.includes(String(filters.q))) && (!filters.hidden || !photo.active) && (!filters.needs_review || (photo.review_flags.length && !photo.reviewed_at)));
  return { gallery_images: matches, categories: [], total: matches.length, page: 1, per_page: 48 };
};
photoIntake.imports = async () => ({ imports: [{ id: 5, filename: 'MO-2027-tournament-day-1.zip', status: 'completed', imported_count: 706, skipped_count: 3, total_entries: 709, processed_entries: 709, errors: [{ entry: 'README.txt', message: 'Not an image; skipped.' }], album_type: 'Tournament', timezone: 'Pacific/Guam' }] });
photoIntake.createAlbum = async (_id, name) => { const album = { id: Date.now(), name, count: 0, sort_order: albums.length, cover_url: null }; albums.push(album); return { album }; };
photoIntake.updateAlbum = async (_id, id, data) => {
  const album = albums.find(candidate => candidate.id === id)!;
  if (data.name) photos = photos.map(photo => photo.category === album.name ? { ...photo, category: data.name! } : photo);
  if (data.sort_order !== undefined) {
    const ordered = [...albums].sort((a, b) => a.sort_order - b.sort_order).filter(candidate => candidate.id !== id);
    ordered.splice(data.sort_order, 0, album); albums = ordered.map((candidate, index) => ({ ...candidate, sort_order: index }));
  }
  Object.assign(albums.find(candidate => candidate.id === id)!, data);
  return { album: { ...album, ...data } };
};
photoIntake.settings = async (_id, next) => { settings = next; return { settings }; };
photoIntake.bulkUpdate = async (_id, ids, data) => { photos = photos.map(photo => ids.includes(photo.id) ? { ...photo, ...data, ...(data.approve_review ? { reviewed_at: new Date().toISOString() } : {}) } : photo); return { updated: ids.length }; };
photoIntake.bulkDelete = async (_id, ids) => { photos = photos.filter(photo => !ids.includes(photo.id)); return { deleted: ids.length }; };
photoIntake.proposals = async (_id, type) => ({ proposals: [{ category: `${type} Day 1`, image_ids: photos.map(photo => photo.id), date: '2027-10-23' }], unassigned_count: 3 });
photoIntake.applyProposals = async (_id, _type, proposals: DayProposal[]) => { proposals.forEach(proposal => { photos = photos.map(photo => proposal.image_ids.includes(photo.id) ? { ...photo, category: proposal.category } : photo); }); return { updated: proposals.reduce((total, proposal) => total + proposal.image_ids.length, 0) }; };
// No network upload endpoint is mocked: file-transfer evidence is in queue/API tests.
createRoot(document.getElementById('root')!).render(<AuthProvider value={{ isClerkEnabled: true, isSignedIn: true, isLoading: false, userId: 'd4-synthetic-staff' }}><MemoryRouter initialEntries={['/admin/photos/7']}><Routes><Route path="/admin" element={<AdminLayout />}><Route path="photos" element={<PhotosAdmin />} /><Route path="photos/:eventId" element={<PhotosAdmin />} /></Route></Routes><p className="pointer-events-none fixed bottom-1 left-1 z-[100] rounded bg-navy-900/90 px-2 py-1 text-[10px] text-text-muted">Synthetic QA fixtures · local only</p></MemoryRouter></AuthProvider>);
