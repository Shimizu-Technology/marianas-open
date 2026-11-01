import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import PhotosAdmin from './PhotosAdmin';
import { api, type Event } from '../../services/api';
import { photoIntake, type IntakePhoto } from '../../services/photoIntake';

const { startUpload } = vi.hoisted(() => ({ startUpload: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@clerk/clerk-react', () => ({ useAuth: () => ({ userId: 'staff-fixture' }) }));
vi.mock('../../contexts/GalleryUploadContext', () => ({
  useGalleryUploads: () => ({ tasks: [], startUpload }),
  GALLERY_IMAGE_ACCEPT: 'image/jpeg',
  isSupportedGalleryImage: (file: File) => file.type === 'image/jpeg' && file.size > 0,
}));
vi.mock('../../utils/zipIntake', () => ({ ZIP_MAX_BYTES: 4 * 1024 ** 3, zipQueue: { load: vi.fn().mockResolvedValue(undefined), save: vi.fn(), remove: vi.fn() }, sendSavedZip: vi.fn() }));

const event = { id: 7, name: 'Marianas Open 2027', slug: 'mo-2027', date: '2027-10-23', end_date: '2027-10-24', gallery_images_count: 884 } as Event;
const photo = { id: 21, event_id: 7, original_filename: 'DSC_1234.jpg', category: 'Podium', active: true, status: 'ready', thumbnail_url: '/photo.jpg', review_flags: ['low_sharpness'], reviewed_at: null } as IntakePhoto;
const albums = [{ id: 1, name: 'Podium', sort_order: 0, count: 884, cover_url: '/photo.jpg' }, { id: 2, name: 'Tournament', sort_order: 1, count: 0, cover_url: null }];
const settings = { timezone: 'Pacific/Guam', hold_flagged: false };
beforeEach(() => {
  startUpload.mockClear();
  vi.spyOn(api.admin, 'getEvents').mockResolvedValue({ events: [event] });
  vi.spyOn(photoIntake, 'albums').mockResolvedValue({ albums, settings });
  vi.spyOn(photoIntake, 'photos').mockResolvedValue({ gallery_images: [photo], categories: [], total: 1, page: 1, per_page: 48 });
  vi.spyOn(photoIntake, 'imports').mockResolvedValue({ imports: [] });
  vi.spyOn(photoIntake, 'createAlbum').mockResolvedValue({ album: albums[1] });
  vi.spyOn(photoIntake, 'updateAlbum').mockResolvedValue({ album: albums[1] });
  vi.spyOn(photoIntake, 'bulkUpdate').mockResolvedValue({ updated: 1 });
  vi.spyOn(photoIntake, 'bulkDelete').mockResolvedValue({ deleted: 1 });
  vi.spyOn(photoIntake, 'settings').mockResolvedValue({ settings: { ...settings, hold_flagged: true } });
  vi.spyOn(photoIntake, 'proposals').mockResolvedValue({ proposals: [{ category: 'Podium Day 2', date: '2027-10-24', image_ids: [21] }], unassigned_count: 3 });
  vi.spyOn(photoIntake, 'applyProposals').mockResolvedValue({ updated: 1 });
});
afterEach(cleanup);

function mount(path = '/admin/photos/7') {
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/admin/photos" element={<PhotosAdmin />} /><Route path="/admin/photos/:eventId" element={<PhotosAdmin />} /></Routes></MemoryRouter>);
}
async function loaded() { await screen.findByRole('heading', { name: 'Photo library 1' }); }

it('has a dedicated event chooser and a visible album dropdown with the publish default', async () => {
  mount('/admin/photos');
  fireEvent.click(await screen.findByRole('link', { name: /Marianas Open 2027/ }));
  await loaded();
  expect(screen.getByRole('combobox', { name: /Upload to album/ })).toBeTruthy();
  expect(screen.getByText('Default: flagged photos publish.')).toBeTruthy();
  expect(screen.getByLabelText(/Hold flagged photos/)).toHaveProperty('checked', false);
  expect(screen.getByText('884 photos')).toBeTruthy();
});

it('creates, renames and reorders an album through saved API actions', async () => {
  mount(); await loaded();
  fireEvent.change(screen.getByLabelText('New album'), { target: { value: 'Opening Ceremony' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create album' }));
  await waitFor(() => expect(photoIntake.createAlbum).toHaveBeenCalledWith(7, 'Opening Ceremony'));
  await screen.findByText('Album created. Choose it above or in the upload album menu.');
  fireEvent.click(screen.getByRole('button', { name: 'Rename Podium' }));
  fireEvent.change(screen.getByLabelText('Album name'), { target: { value: 'Podium Day 1' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
  await screen.findByText('Album renamed.');
  expect(photoIntake.updateAlbum).toHaveBeenCalledWith(7, 1, { name: 'Podium Day 1' });
  fireEvent.click(screen.getByRole('button', { name: 'Move Tournament up' }));
  await waitFor(() => expect(photoIntake.updateAlbum).toHaveBeenCalledWith(7, 2, { sort_order: 0 }));
});

it('searches filenames and combines album, hidden and review URL filters', async () => {
  mount('/admin/photos/7?album=Podium&q=DSC&view=hidden'); await loaded();
  expect(photoIntake.photos).toHaveBeenLastCalledWith(7, { category: 'Podium', q: 'DSC', hidden: 1, page: 1, per_page: 48 });
  fireEvent.change(screen.getByRole('combobox', { name: 'Photo visibility filter' }), { target: { value: 'review' } });
  await waitFor(() => expect(photoIntake.photos).toHaveBeenLastCalledWith(7, { category: 'Podium', q: 'DSC', needs_review: 1, page: 1, per_page: 48 }));
});

it('requires hide/delete confirmation, preserves selection on failure and supports bulk move/approval', async () => {
  mount(); await loaded();
  fireEvent.click(screen.getByLabelText('Select DSC_1234.jpg'));
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
  fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(photoIntake.bulkDelete).not.toHaveBeenCalled();
  confirm.mockReturnValue(true);
  vi.mocked(photoIntake.bulkUpdate).mockRejectedValueOnce(new Error('Save interrupted'));
  fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
  expect(await screen.findByText('Save interrupted')).toBeTruthy();
  expect(screen.getByText('1 selected')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
  await screen.findByText('1 photos hidden.');
  expect(photoIntake.bulkUpdate).toHaveBeenCalledWith(7, [21], { active: false });
  fireEvent.click(screen.getByLabelText('Select DSC_1234.jpg'));
  fireEvent.change(screen.getByRole('combobox', { name: 'Move selected photos to album' }), { target: { value: 'Tournament' } });
  fireEvent.click(screen.getByRole('button', { name: 'Move selected' }));
  await screen.findByText('1 photos moved to Tournament.');
  expect(photoIntake.bulkUpdate).toHaveBeenCalledWith(7, [21], { category: 'Tournament' });
  fireEvent.click(screen.getByLabelText('Select DSC_1234.jpg'));
  fireEvent.click(screen.getByRole('button', { name: 'Approve review' }));
  await waitFor(() => expect(photoIntake.bulkUpdate).toHaveBeenCalledWith(7, [21], { approve_review: true }));
});

it('queues more than 100 selected files into the chosen album and reports unsupported files', async () => {
  mount(); await loaded();
  fireEvent.change(screen.getByRole('combobox', { name: /Upload to album/ }), { target: { value: 'Podium' } });
  const files = Array.from({ length: 151 }, (_, index) => new File(['photo'], `${index}.jpg`, { type: 'image/jpeg' }));
  fireEvent.change(screen.getByLabelText('Choose photos'), { target: { files: [...files, new File(['text'], 'notes.txt')] } });
  await screen.findByText(/151 photos added to the upload queue for Podium/);
  expect(startUpload).toHaveBeenCalledWith(expect.objectContaining({ eventId: 7, files, category: 'Podium', caption: '' }));
  expect(screen.getByText(/1 unsupported, empty or over-50 MB/)).toBeTruthy();
});

it('previews actual day dates and applies only after explicit confirmation', async () => {
  mount(); await loaded();
  fireEvent.click(screen.getByRole('button', { name: 'Preview day albums' }));
  expect(await screen.findByText('2027-10-24 · 1 photos')).toBeTruthy();
  expect(screen.getByText('3 photos without an eligible date. No dates are invented.')).toBeTruthy();
  expect(photoIntake.applyProposals).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Confirm 1 photo assignments' }));
  await screen.findByText('Day albums applied to the confirmed photos.');
  expect(photoIntake.applyProposals).toHaveBeenCalledWith(7, 'Podium', [{ category: 'Podium Day 2', date: '2027-10-24', image_ids: [21] }]);
});

it('recovers a failed initial load and handles an empty album without losing controls', async () => {
  vi.mocked(photoIntake.albums).mockRejectedValueOnce(new Error('Gallery unavailable'));
  mount();
  expect(await screen.findByText('Gallery unavailable')).toBeTruthy();
  vi.mocked(photoIntake.photos).mockResolvedValue({ gallery_images: [], categories: [], total: 0, page: 1, per_page: 48 });
  fireEvent.click(screen.getByRole('button', { name: 'Retry loading photos' }));
  expect(await screen.findByText('No photos in this album yet. Add photos above.')).toBeTruthy();
  expect(screen.getByLabelText('Choose photos')).toBeTruthy();
});

it('saves explicit review hold and permits a custom day album type', async () => {
  mount(); await loaded();
  fireEvent.click(screen.getByLabelText(/Hold flagged photos/));
  await waitFor(() => expect(photoIntake.settings).toHaveBeenCalledWith(7, { timezone: 'Pacific/Guam', hold_flagged: true }));
  await screen.findByText('Review setting saved.');
  fireEvent.change(screen.getByLabelText('Album type for day suggestions'), { target: { value: '__custom__' } });
  fireEvent.change(screen.getByLabelText('Custom album type'), { target: { value: 'Awards' } });
  fireEvent.click(screen.getByRole('button', { name: 'Preview day albums' }));
  await waitFor(() => expect(photoIntake.proposals).toHaveBeenCalledWith(7, 'Awards'));
});

it('refreshes the current filters when an older bulk action finishes after navigation', async () => {
  let finish!: (value: { updated: number }) => void;
  vi.mocked(photoIntake.bulkUpdate).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  mount(); await loaded();
  fireEvent.click(screen.getByLabelText('Select DSC_1234.jpg'));
  fireEvent.click(screen.getByRole('button', { name: 'Hide' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Photo visibility filter' }), { target: { value: 'hidden' } });
  await waitFor(() => expect(photoIntake.photos).toHaveBeenLastCalledWith(7, { hidden: 1, page: 1, per_page: 48 }));
  finish({ updated: 1 });
  await screen.findByText('1 photos hidden.');
  await waitFor(() => {
    expect(photoIntake.photos).toHaveBeenLastCalledWith(7, { hidden: 1, page: 1, per_page: 48 });
    expect(screen.queryByText('Loading photos…')).toBeNull();
    expect(screen.getByRole('combobox', { name: 'Photo visibility filter' })).toHaveProperty('value', 'hidden');
  });
});
