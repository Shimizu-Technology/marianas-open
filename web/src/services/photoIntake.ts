import { fetchApi, type DirectUploadPreparation, type EventGalleryImage, type GalleryImagesResponse } from './api';

export interface PhotoAlbum {
  id: number;
  name: string;
  sort_order: number;
  count: number;
  cover_url: string | null;
}
export interface PhotoSettings { timezone: string; hold_flagged: boolean }
export interface IntakePhoto extends EventGalleryImage {
  review_flags: string[];
  reviewed_at: string | null;
  captured_at: string | null;
  capture_source: string | null;
  proposed_category?: string | null;
}
export interface PhotoImport {
  id: number;
  status: string;
  filename: string;
  total_entries: number;
  processed_entries: number;
  imported_count: number;
  skipped_count: number;
  errors: (string | { entry: string; message: string })[];
  album_type: string;
  timezone: string;
}
export interface DayProposal { category: string; image_ids: number[]; date: string }
export interface ImportOptions { album_type: string; category: string; timezone: string; hold_flagged: boolean }

function request<T>(eventId: number, path: string, method = 'GET', data?: unknown) {
  return fetchApi<T>(`/api/v1/admin/events/${eventId}/${path}`, {
    method, ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  }, true);
}
export const photoIntake = {
  albums: (eventId: number) => request<{ albums: PhotoAlbum[]; settings: PhotoSettings }>(eventId, 'gallery-albums'),
  createAlbum: (eventId: number, name: string) => request<{ album: PhotoAlbum }>(eventId, 'gallery-albums', 'POST', { name }),
  updateAlbum: (eventId: number, id: number, data: { name?: string; sort_order?: number }) => request<{ album: PhotoAlbum }>(eventId, `gallery-albums/${id}`, 'PATCH', data),
  settings: (eventId: number, data: PhotoSettings) => request<{ settings: PhotoSettings }>(eventId, 'gallery-albums/settings', 'PATCH', data),
  photos: (eventId: number, filters: Record<string, string | number>) => request<Omit<GalleryImagesResponse, 'gallery_images'> & { gallery_images: IntakePhoto[] }>(eventId, `gallery-images?${new URLSearchParams(Object.entries(filters).map(([key, value]) => [key, String(value)]))}`),
  bulkUpdate: (eventId: number, ids: number[], data: { active?: boolean; category?: string; approve_review?: boolean }) => request<{ updated: number }>(eventId, 'gallery-images/bulk_update', 'PATCH', { ids, ...data }),
  bulkDelete: (eventId: number, ids: number[]) => request<{ deleted: number }>(eventId, 'gallery-images/bulk_destroy', 'DELETE', { ids }),
  imports: (eventId: number) => request<{ imports: PhotoImport[] }>(eventId, 'gallery-imports'),
  prepareZip: (eventId: number, data: { filename: string; byte_size: number; checksum: string }) => request<DirectUploadPreparation>(eventId, 'gallery-imports/prepare_direct_upload', 'POST', data),
  completeZip: (eventId: number, signed_id: string, options: ImportOptions) => request<{ import: PhotoImport }>(eventId, 'gallery-imports', 'POST', { signed_id, ...options }),
  proposals: (eventId: number, album_type: string) => request<{ proposals: DayProposal[]; unassigned_count: number }>(eventId, `gallery-day-proposals?${new URLSearchParams({ album_type })}`),
  applyProposals: (eventId: number, album_type: string, proposals: DayProposal[]) => request<{ updated: number }>(eventId, 'gallery-day-proposals', 'POST', { album_type, proposals }),
};
