const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export type TranslationsBlob = Record<string, Record<string, unknown>>;
export type TranslationStatus = 'untranslated' | 'pending' | 'translated' | 'failed';

export interface CompetitorProfileResult {
  event_id: number;
  event_name: string;
  event_slug: string;
  event_date: string;
  division: string;
  placement: number;
  belt_rank: string;
  points_earned: number;
}

export interface CompetitorProfile {
  competitor_name: string;
  academy: string;
  country_code: string;
  total_points: number;
  gold: number;
  silver: number;
  bronze: number;
  events_competed: number;
  results: CompetitorProfileResult[];
}

export interface RankingEntry {
  competitor_name?: string;
  competitor_id?: number;
  academy?: string;
  academy_id?: number;
  country_code?: string;
  total_points: number;
  gold: number;
  silver: number;
  bronze: number;
  events_competed?: number;
  results_count?: number;
  athletes?: number;
  academies?: number;
}

export interface RankingsResponse {
  rankings: RankingEntry[];
  meta: {
    type: string;
    formula: string;
    note: string;
    filters: Record<string, string>;
    total: number;
  };
}

// Auth token getter
let getAuthToken: (() => Promise<string | null>) | null = null;

export function setAuthTokenGetter(getter: () => Promise<string | null>) {
  getAuthToken = getter;
}

export interface Organization {
  id: number;
  name: string;
  slug: string;
  description: string;
  primary_color: string;
  secondary_color: string;
  contact_email: string;
  phone: string;
  website_url: string;
  instagram_url: string;
  facebook_url: string;
  founded_year: number;
  logo_url: string | null;
  banner_url: string | null;
}

export interface EventScheduleItem {
  id?: number;
  time: string;
  description: string;
  sort_order: number;
  _destroy?: boolean;
  translations?: TranslationsBlob;
  translation_status?: TranslationStatus;
}

export interface PrizeCategory {
  id?: number;
  name: string;
  amount: string;
  sort_order: number;
  _destroy?: boolean;
  translations?: TranslationsBlob;
  translation_status?: TranslationStatus;
}

export interface EventGalleryImage {
  id: number;
  event_id: number;
  title: string | null;
  alt_text: string | null;
  caption: string | null;
  sort_order: number;
  active: boolean;
  image_url: string | null;
}

export interface EventGalleryImageFormData {
  title: string;
  alt_text: string;
  caption: string;
  sort_order: number;
  active: boolean;
}

export interface EventVenueHighlight {
  title: string;
  description: string;
}

export interface EventRegistrationStep {
  title: string;
  description: string;
  url?: string | null;
  link_label?: string | null;
}

export interface EventRegistrationFeeRow {
  deadline: string;
  fee: string;
  option: string;
}

export interface EventRegistrationFeeSection {
  title: string;
  rows: EventRegistrationFeeRow[];
}

export interface EventRegistrationInfoItem {
  label: string;
  value: string;
}

export interface EventTravelItem {
  title: string;
  description: string;
  value?: string | null;
  url?: string | null;
  link_label?: string | null;
}

export interface EventVisaItem {
  title: string;
  description: string;
}

export interface Event {
  id: number;
  name: string;
  slug: string;
  description: string;
  date: string;
  end_date: string | null;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  asjjf_stars: number;
  is_main_event: boolean;
  registration_url: string | null;
  registration_url_gi: string | null;
  registration_url_nogi: string | null;
  prize_pool: string | null;
  prize_title: string | null;
  prize_description: string | null;
  status: string;
  hero_image_url: string | null;
  poster_image_url: string | null;
  live_stream_url: string | null;
  live_stream_active: boolean;
  tagline: string | null;
  schedule_note: string | null;
  asjjf_event_ids: number[];
  asjjf_source_urls: string[];
  results_imported_at: string | null;
  venue_highlights: EventVenueHighlight[];
  registration_steps: EventRegistrationStep[];
  registration_fee_sections: EventRegistrationFeeSection[];
  registration_info_items: EventRegistrationInfoItem[];
  travel_description: string | null;
  travel_items: EventTravelItem[];
  visa_description: string | null;
  visa_items: EventVisaItem[];
  event_schedule_items: EventScheduleItem[];
  prize_categories: PrizeCategory[];
  event_accommodations: EventAccommodation[];
  event_gallery_images: EventGalleryImage[];
  translations?: TranslationsBlob;
  translation_status?: TranslationStatus;
}

export interface EventAccommodation {
  id: number;
  event_id: number;
  hotel_name: string;
  description: string | null;
  room_types: string | null;
  rate_info: string | null;
  inclusions: string | null;
  check_in_date: string | null;
  check_out_date: string | null;
  booking_url: string | null;
  booking_code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  sort_order: number;
  active: boolean;
  image_url: string | null;
  translations?: TranslationsBlob;
  translation_status?: TranslationStatus;
}

export interface EventAccommodationFormData {
  hotel_name: string;
  description: string;
  room_types: string;
  rate_info: string;
  inclusions: string;
  check_in_date: string;
  check_out_date: string;
  booking_url: string;
  booking_code: string;
  contact_email: string;
  contact_phone: string;
  sort_order: number;
  active: boolean;
}

export interface Sponsor {
  id: number;
  name: string;
  tier: string;
  website_url: string | null;
  sort_order: number;
  logo_url: string | null;
}

export interface UserProfile {
  id: number;
  clerk_id?: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'staff' | 'viewer';
  is_admin: boolean;
  is_staff: boolean;
  invitation_status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invitation_pending: boolean;
  invited_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Video {
  id: number;
  event_id: number | null;
  title: string;
  youtube_url: string;
  youtube_video_id: string | null;
  competitor_1_name: string | null;
  competitor_2_name: string | null;
  weight_class: string | null;
  belt_rank: string | null;
  round: string | null;
  result: string | null;
  duration_seconds: number | null;
  category: string | null;
  sort_order: number;
  featured: boolean;
  status: string;
  event_name: string | null;
}

export interface VideoFormData {
  title: string;
  youtube_url: string;
  competitor_1_name: string;
  competitor_2_name: string;
  weight_class: string;
  belt_rank: string;
  round: string;
  result: string;
  duration_seconds: number | null;
  category: string;
  sort_order: number;
  featured: boolean;
  status: string;
  event_id: number | null;
}

export interface SiteImage {
  id: number;
  title: string | null;
  alt_text: string | null;
  placement: 'hero' | 'featured' | 'about' | 'event_default';
  sort_order: number;
  active: boolean;
  caption: string | null;
  image_url: string | null;
}

export interface EventFormData {
  name: string;
  slug: string;
  description: string;
  date: string;
  end_date: string;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  country_code: string;
  asjjf_stars: number;
  is_main_event: boolean;
  prize_pool: string;
  prize_title: string;
  prize_description: string;
  registration_url: string;
  registration_url_gi: string;
  registration_url_nogi: string;
  status: string;
  latitude: string;
  longitude: string;
  live_stream_url: string;
  live_stream_active: boolean;
  tagline: string;
  schedule_note: string;
  asjjf_event_ids: number[];
  venue_highlights: EventVenueHighlight[];
  registration_steps: EventRegistrationStep[];
  registration_fee_sections: EventRegistrationFeeSection[];
  registration_info_items: EventRegistrationInfoItem[];
  travel_description: string;
  travel_items: EventTravelItem[];
  visa_description: string;
  visa_items: EventVisaItem[];
  event_schedule_items_attributes: EventScheduleItem[];
  prize_categories_attributes: PrizeCategory[];
  translation_status?: TranslationStatus;
}

export interface SponsorFormData {
  name: string;
  tier: string;
  website_url: string;
  sort_order: number;
}

export interface Competitor {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  nickname: string | null;
  country_code: string | null;
  belt_rank: string | null;
  weight_class: string | null;
  academy: string | null;
  academy_id: number | null;
  bio: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  wins: number;
  losses: number;
  draws: number;
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
  total_points: number;
  events_competed: number;
  results_count: number;
  photo_url: string | null;
}

export interface CompetitorsResponse {
  competitors: Competitor[];
  total: number;
  page: number;
  per_page: number;
  available_countries?: string[];
}

export interface CompetitorDetail extends Competitor {
  results: CompetitorProfileResult[];
  academy_slug: string | null;
}

export interface CompetitorFormData {
  first_name: string;
  last_name: string;
  nickname: string;
  country_code: string;
  belt_rank: string;
  weight_class: string;
  academy: string;
  bio: string;
  instagram_url: string;
  youtube_url: string;
  wins: number;
  losses: number;
  draws: number;
}

export interface Academy {
  id: number;
  name: string;
  slug: string;
  country_code: string | null;
  location: string | null;
  website_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  description: string | null;
  aliases: string[];
  logo_url: string | null;
  total_points: number;
  gold: number;
  silver: number;
  bronze: number;
  athletes: number;
  events_competed: number;
  results_count: number;
}

export interface AcademyDetail extends Omit<Academy, 'athletes'> {
  athletes: { id: number; first_name: string; last_name: string; full_name: string; belt_rank: string | null; country_code: string | null; photo_url: string | null; total_points: number; gold: number; silver: number; bronze: number }[];
}

export interface AcademiesResponse {
  academies: Academy[];
  total: number;
  page: number;
  per_page: number;
}

export interface AcademyFormData {
  name: string;
  country_code: string;
  location: string;
  website_url: string;
  instagram_url: string;
  facebook_url: string;
  description: string;
  aliases: string[];
}

export interface Announcement {
  id: number;
  title: string;
  body: string | null;
  link_url: string | null;
  link_text: string | null;
  announcement_type: 'info' | 'event' | 'promo' | 'urgent';
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  image_url: string | null;
}

export interface AnnouncementFormData {
  title: string;
  body: string;
  link_url: string;
  link_text: string;
  announcement_type: string;
  active: boolean;
  starts_at: string;
  ends_at: string;
}

export interface SiteContentEntry {
  id: number;
  key: string;
  content_type: string;
  value_en: string | null;
  value_ja: string | null;
  value_ko: string | null;
  value_tl: string | null;
  value_zh: string | null;
  value_pt: string | null;
  section: string;
  label: string;
  sort_order: number;
  translation_status: 'translated' | 'pending' | 'failed';
}

export type SiteContentMap = Record<string, { en: string | null; ja: string | null; ko: string | null; tl: string | null; zh: string | null; pt: string | null }>;
export type SiteContentGrouped = Record<string, SiteContentEntry[]>;

export interface EventResult {
  id: number;
  event_id: number;
  division: string;
  gender: string;
  belt_rank: string;
  age_category: string;
  weight_class: string;
  placement: number;
  competitor_name: string;
  academy: string | null;
  country_code: string;
  competitor_id: number | null;
  linked_academy_id: number | null;
  submission_method: string | null;
  notes: string | null;
}

export interface EventResultFormData {
  division: string;
  gender: string;
  belt_rank: string;
  age_category: string;
  weight_class: string;
  placement: number;
  competitor_name: string;
  academy: string;
  country_code: string;
}

export interface ImportPreview {
  event: { id: number; name: string; slug: string };
  existing_results_count: number;
  preview: { total: number; countries: number; academies: number; by_belt?: Record<string, number> };
  sample: { division: string; placement: number; competitor_name: string; academy: string; country_code: string }[];
}

export interface ImportResult {
  message: string;
  imported: number;
  summary: Record<string, unknown>;
}

export interface EventResultDivision {
  division: string;
  results: EventResult[];
}

export interface EventResultsSummary {
  total_results: number;
  gold_medals: number;
  divisions: number;
  countries: number;
  academies: number;
  belt_breakdown: Record<string, number>;
  top_academies: { name: string; gold: number; silver: number; bronze: number; total: number }[];
}

export interface ImpactMetric {
  id: number;
  label: string;
  value: string;
  description: string | null;
  category: string;
  icon: string | null;
  sort_order: number;
  active: boolean;
  highlight: boolean;
  created_at: string;
}

export interface ImpactMetricFormData {
  label: string;
  value: string;
  description: string;
  category: string;
  icon: string;
  sort_order: number;
  active: boolean;
  highlight: boolean;
}

export interface FundAllocation {
  id: number;
  category: string;
  amount: number;
  description: string | null;
  color: string | null;
  sort_order: number;
  active: boolean;
  percentage?: number;
  created_at: string;
}

export interface FundAllocationFormData {
  category: string;
  amount: number;
  description: string;
  color: string;
  sort_order: number;
  active: boolean;
}

export interface ImpactData {
  impact_metrics: ImpactMetric[];
  fund_allocations: (FundAllocation & { percentage: number })[];
  total_amount: number;
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}, requireAuth = false): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (requireAuth && getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    const message = (body as Record<string, unknown>).error || (body as Record<string, unknown>).errors || `API error: ${response.status}`;
    throw new Error(typeof message === 'string' ? message : JSON.stringify(message));
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

async function fetchApiUpload<T>(endpoint: string, formData: FormData): Promise<T> {
  const headers: Record<string, string> = {};

  if (getAuthToken) {
    const token = await getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error((body as Record<string, unknown>).error as string || `Upload error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  // Public
  getSiteContents: () => fetchApi<SiteContentMap>('/api/v1/site-contents'),
  getOrganization: () => fetchApi<Organization>('/api/v1/organization'),
  getEvents: () => fetchApi<Event[]>('/api/v1/events'),
  getEvent: (slug: string) => fetchApi<Event>(`/api/v1/events/${slug}`),
  getEventResults: (slug: string, params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<EventResultDivision[]>(`/api/v1/events/${slug}/results${query}`);
  },
  getEventResultsSummary: (slug: string) =>
    fetchApi<EventResultsSummary>(`/api/v1/events/${slug}/results/summary`),
  getSponsors: () => fetchApi<Sponsor[]>('/api/v1/sponsors'),
  getAnnouncements: () => fetchApi<{ announcements: Announcement[] }>('/api/v1/announcements'),
  getCompetitors: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<CompetitorsResponse>(`/api/v1/competitors${query}`);
  },
  getCompetitor: (id: number) => fetchApi<CompetitorDetail>(`/api/v1/competitors/${id}`),
  getAcademies: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<AcademiesResponse>(`/api/v1/academies${query}`);
  },
  getAcademy: (slug: string) => fetchApi<AcademyDetail>(`/api/v1/academies/${slug}`),
  getVideos: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<Video[]>(`/api/v1/videos${query}`);
  },
  getVideo: (id: number) => fetchApi<Video>(`/api/v1/videos/${id}`),
  getSiteImages: (placement?: string) => {
    const query = placement ? `?placement=${encodeURIComponent(placement)}` : '';
    return fetchApi<{ site_images: SiteImage[] }>(`/api/v1/site-images${query}`);
  },
  getImpactData: () => fetchApi<ImpactData>('/api/v1/impact'),

  // Auth
  getCurrentUser: () => {
    return fetchApi<{ user: UserProfile }>(`/api/v1/me`, {}, true);
  },

  // Admin - Users
  getUsers: () => fetchApi<{ users: UserProfile[] }>('/api/v1/admin/users', {}, true),
  createUser: (data: { email: string; role: string }) =>
    fetchApi<{ user: UserProfile; invitation_sent: boolean; invitation_error?: string }>('/api/v1/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }, true),
  updateUser: (id: number, data: Partial<UserProfile>) =>
    fetchApi<{ user: UserProfile }>(`/api/v1/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }, true),
  deleteUser: (id: number) =>
    fetchApi<void>(`/api/v1/admin/users/${id}`, { method: 'DELETE' }, true),
  resendInvitation: (id: number) =>
    fetchApi<{ user: UserProfile; invitation_sent: boolean; invitation_error?: string }>(`/api/v1/admin/users/${id}/resend_invitation`, {
      method: 'POST',
    }, true),

  // Admin - Events
  admin: {
    getEvents: () => fetchApi<{ events: Event[] }>('/api/v1/admin/events', {}, true),
    getEvent: (id: number) => fetchApi<{ event: Event }>(`/api/v1/admin/events/${id}`, {}, true),
    createEvent: (data: Partial<EventFormData>) =>
      fetchApi<{ event: Event }>('/api/v1/admin/events', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateEvent: (id: number, data: Partial<EventFormData>) =>
      fetchApi<{ event: Event }>(`/api/v1/admin/events/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteEvent: (id: number) =>
      fetchApi<void>(`/api/v1/admin/events/${id}`, { method: 'DELETE' }, true),
    cloneEvent: (id: number) =>
      fetchApi<{ event: Event }>(`/api/v1/admin/events/${id}/clone`, { method: 'POST' }, true),
    uploadEventImage: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return fetchApiUpload<{ event: Event }>(`/api/v1/admin/events/${id}/upload_image`, formData);
    },
    uploadEventPoster: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return fetchApiUpload<{ event: Event }>(`/api/v1/admin/events/${id}/upload_poster`, formData);
    },
    removeEventPoster: (id: number) =>
      fetchApi<{ event: Event }>(`/api/v1/admin/events/${id}/remove_poster`, { method: 'DELETE' }, true),

    // Event Results
    getEventResults: (eventId: number, params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi<{ results: EventResult[]; total: number; page: number; per_page: number }>(`/api/v1/admin/events/${eventId}/results${query}`, {}, true);
    },
    createEventResult: (eventId: number, data: EventResultFormData) =>
      fetchApi<EventResult>(`/api/v1/admin/events/${eventId}/results`, {
        method: 'POST',
        body: JSON.stringify({ event_result: data }),
      }, true),
    bulkCreateEventResults: (eventId: number, results: EventResultFormData[]) =>
      fetchApi<{ created: number; errors: { index: number; errors: string[] }[] }>(
        `/api/v1/admin/events/${eventId}/results/bulk_create`, {
          method: 'POST',
          body: JSON.stringify({ results }),
        }, true),
    updateEventResult: (eventId: number, resultId: number, data: Partial<EventResultFormData>) =>
      fetchApi<EventResult>(`/api/v1/admin/events/${eventId}/results/${resultId}`, {
        method: 'PATCH',
        body: JSON.stringify({ event_result: data }),
      }, true),
    deleteEventResult: (eventId: number, resultId: number) =>
      fetchApi<void>(`/api/v1/admin/events/${eventId}/results/${resultId}`, { method: 'DELETE' }, true),
    deleteAllEventResults: (eventId: number) =>
      fetchApi<{ deleted: number }>(`/api/v1/admin/events/${eventId}/results/destroy_all`, { method: 'DELETE' }, true),
    importResultsPreview: (eventId: number) =>
      fetchApi<ImportPreview>(`/api/v1/admin/events/${eventId}/import_results_preview`, {}, true),
    importResults: (eventId: number) =>
      fetchApi<ImportResult>(`/api/v1/admin/events/${eventId}/import_results`, { method: 'POST' }, true),

    retranslateEvent: (eventId: number) =>
      fetchApi<{ message: string; event: Event }>(`/api/v1/admin/events/${eventId}/retranslate`, { method: 'POST' }, true),

    // Event Accommodations
    getAccommodations: (eventId: number) =>
      fetchApi<{ accommodations: EventAccommodation[] }>(`/api/v1/admin/events/${eventId}/accommodations`, {}, true),
    createAccommodation: (eventId: number, data: Partial<EventAccommodationFormData>) =>
      fetchApi<{ accommodation: EventAccommodation }>(`/api/v1/admin/events/${eventId}/accommodations`, {
        method: 'POST',
        body: JSON.stringify({ accommodation: data }),
      }, true),
    updateAccommodation: (eventId: number, id: number, data: Partial<EventAccommodationFormData>) =>
      fetchApi<{ accommodation: EventAccommodation }>(`/api/v1/admin/events/${eventId}/accommodations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ accommodation: data }),
      }, true),
    deleteAccommodation: (eventId: number, id: number) =>
      fetchApi<void>(`/api/v1/admin/events/${eventId}/accommodations/${id}`, { method: 'DELETE' }, true),
    uploadAccommodationImage: (eventId: number, id: number, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return fetchApiUpload<{ accommodation: EventAccommodation }>(`/api/v1/admin/events/${eventId}/accommodations/${id}/upload`, formData);
    },

    // Event Gallery Images
    getEventGalleryImages: (eventId: number) =>
      fetchApi<{ gallery_images: EventGalleryImage[] }>(`/api/v1/admin/events/${eventId}/gallery-images`, {}, true),
    createEventGalleryImage: (eventId: number, data: FormData) =>
      fetchApiUpload<{ gallery_image: EventGalleryImage }>(`/api/v1/admin/events/${eventId}/gallery-images`, data),
    updateEventGalleryImage: (eventId: number, id: number, data: Partial<EventGalleryImageFormData>) =>
      fetchApi<{ gallery_image: EventGalleryImage }>(`/api/v1/admin/events/${eventId}/gallery-images/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    uploadEventGalleryImage: (eventId: number, id: number, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return fetchApiUpload<{ gallery_image: EventGalleryImage }>(`/api/v1/admin/events/${eventId}/gallery-images/${id}/upload`, formData);
    },
    deleteEventGalleryImage: (eventId: number, id: number) =>
      fetchApi<void>(`/api/v1/admin/events/${eventId}/gallery-images/${id}`, { method: 'DELETE' }, true),

    // Sponsors
    getSponsors: () => fetchApi<{ sponsors: Sponsor[] }>('/api/v1/admin/sponsors', {}, true),
    createSponsor: (data: SponsorFormData) =>
      fetchApi<{ sponsor: Sponsor }>('/api/v1/admin/sponsors', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateSponsor: (id: number, data: Partial<SponsorFormData>) =>
      fetchApi<{ sponsor: Sponsor }>(`/api/v1/admin/sponsors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteSponsor: (id: number) =>
      fetchApi<void>(`/api/v1/admin/sponsors/${id}`, { method: 'DELETE' }, true),
    uploadSponsorLogo: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return fetchApiUpload<{ sponsor: Sponsor }>(`/api/v1/admin/sponsors/${id}/upload_logo`, formData);
    },

    // Competitors
    getCompetitors: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi<{ competitors: Competitor[]; total: number; page: number; per_page: number }>(`/api/v1/admin/competitors${query}`, {}, true);
    },
    getCompetitor: (id: number) => fetchApi<{ competitor: CompetitorDetail }>(`/api/v1/admin/competitors/${id}`, {}, true),
    createCompetitor: (data: Partial<CompetitorFormData>) =>
      fetchApi<{ competitor: Competitor }>('/api/v1/admin/competitors', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateCompetitor: (id: number, data: Partial<CompetitorFormData>) =>
      fetchApi<{ competitor: Competitor }>(`/api/v1/admin/competitors/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteCompetitor: (id: number) =>
      fetchApi<void>(`/api/v1/admin/competitors/${id}`, { method: 'DELETE' }, true),
    uploadCompetitorPhoto: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      return fetchApiUpload<{ competitor: Competitor }>(`/api/v1/admin/competitors/${id}/upload_photo`, formData);
    },

    // Academies
    getAcademies: (params?: Record<string, string>) => {
      const query = params ? '?' + new URLSearchParams(params).toString() : '';
      return fetchApi<{ academies: Academy[]; total: number; page: number; per_page: number }>(`/api/v1/admin/academies${query}`, {}, true);
    },
    getAcademy: (id: number) => fetchApi<{ academy: AcademyDetail }>(`/api/v1/admin/academies/${id}`, {}, true),
    updateAcademy: (id: number, data: Partial<AcademyFormData>) =>
      fetchApi<{ academy: Academy }>(`/api/v1/admin/academies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteAcademy: (id: number) =>
      fetchApi<void>(`/api/v1/admin/academies/${id}`, { method: 'DELETE' }, true),
    uploadAcademyLogo: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return fetchApiUpload<{ academy: Academy }>(`/api/v1/admin/academies/${id}/upload_logo`, formData);
    },

    // Videos
    getVideos: () => fetchApi<{ videos: Video[] }>('/api/v1/admin/videos', {}, true),
    createVideo: (data: Partial<VideoFormData>) =>
      fetchApi<{ video: Video }>('/api/v1/admin/videos', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateVideo: (id: number, data: Partial<VideoFormData>) =>
      fetchApi<{ video: Video }>(`/api/v1/admin/videos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteVideo: (id: number) =>
      fetchApi<void>(`/api/v1/admin/videos/${id}`, { method: 'DELETE' }, true),

    // Site Images
    getSiteImages: () =>
      fetchApi<{ site_images: SiteImage[] }>('/api/v1/admin/site-images', {}, true),
    createSiteImage: (data: FormData) =>
      fetchApiUpload<{ site_image: SiteImage }>('/api/v1/admin/site-images', data),
    updateSiteImage: (id: number, data: Partial<SiteImage>) =>
      fetchApi<{ site_image: SiteImage }>(`/api/v1/admin/site-images/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    uploadSiteImage: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return fetchApiUpload<{ site_image: SiteImage }>(`/api/v1/admin/site-images/${id}/upload`, formData);
    },
    deleteSiteImage: (id: number) =>
      fetchApi<void>(`/api/v1/admin/site-images/${id}`, { method: 'DELETE' }, true),

    // Site Contents
    getSiteContents: () => fetchApi<{ site_contents: SiteContentGrouped }>('/api/v1/admin/site-contents', {}, true),
    createSiteContent: (data: Partial<SiteContentEntry>) =>
      fetchApi<{ site_content: SiteContentEntry }>('/api/v1/admin/site-contents', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateSiteContent: (id: number, data: Partial<SiteContentEntry>) =>
      fetchApi<{ site_content: SiteContentEntry }>(`/api/v1/admin/site-contents/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }, true),
    deleteSiteContent: (id: number) =>
      fetchApi<void>(`/api/v1/admin/site-contents/${id}`, { method: 'DELETE' }, true),
    retranslateSiteContent: (id: number) =>
      fetchApi<{ site_content: SiteContentEntry }>(`/api/v1/admin/site-contents/${id}/retranslate`, { method: 'POST' }, true),

    // Announcements
    getAnnouncements: () => fetchApi<{ announcements: Announcement[] }>('/api/v1/admin/announcements', {}, true),
    createAnnouncement: (data: Partial<AnnouncementFormData>) =>
      fetchApi<{ announcement: Announcement }>('/api/v1/admin/announcements', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateAnnouncement: (id: number, data: Partial<AnnouncementFormData>) =>
      fetchApi<{ announcement: Announcement }>(`/api/v1/admin/announcements/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteAnnouncement: (id: number) =>
      fetchApi<void>(`/api/v1/admin/announcements/${id}`, { method: 'DELETE' }, true),
    uploadAnnouncementImage: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return fetchApiUpload<{ announcement: Announcement }>(`/api/v1/admin/announcements/${id}/upload_image`, formData);
    },
    removeAnnouncementImage: (id: number) =>
      fetchApi<{ announcement: Announcement }>(`/api/v1/admin/announcements/${id}/remove_image`, { method: 'DELETE' }, true),

    // Impact Metrics
    getImpactMetrics: () =>
      fetchApi<{ impact_metrics: ImpactMetric[] }>('/api/v1/admin/impact-metrics', {}, true),
    createImpactMetric: (data: Partial<ImpactMetricFormData>) =>
      fetchApi<{ impact_metric: ImpactMetric }>('/api/v1/admin/impact-metrics', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateImpactMetric: (id: number, data: Partial<ImpactMetricFormData>) =>
      fetchApi<{ impact_metric: ImpactMetric }>(`/api/v1/admin/impact-metrics/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteImpactMetric: (id: number) =>
      fetchApi<void>(`/api/v1/admin/impact-metrics/${id}`, { method: 'DELETE' }, true),
    reorderImpactMetrics: (ids: number[]) =>
      fetchApi<void>('/api/v1/admin/impact-metrics/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }, true),

    // Fund Allocations
    getFundAllocations: () =>
      fetchApi<{ fund_allocations: FundAllocation[]; total_amount: number }>('/api/v1/admin/fund-allocations', {}, true),
    createFundAllocation: (data: Partial<FundAllocationFormData>) =>
      fetchApi<{ fund_allocation: FundAllocation }>('/api/v1/admin/fund-allocations', {
        method: 'POST',
        body: JSON.stringify(data),
      }, true),
    updateFundAllocation: (id: number, data: Partial<FundAllocationFormData>) =>
      fetchApi<{ fund_allocation: FundAllocation }>(`/api/v1/admin/fund-allocations/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    deleteFundAllocation: (id: number) =>
      fetchApi<void>(`/api/v1/admin/fund-allocations/${id}`, { method: 'DELETE' }, true),
    reorderFundAllocations: (ids: number[]) =>
      fetchApi<void>('/api/v1/admin/fund-allocations/reorder', {
        method: 'POST',
        body: JSON.stringify({ ids }),
      }, true),

    // Organization
    getOrganization: () => fetchApi<Organization>('/api/v1/admin/organization', {}, true),
    updateOrganization: (data: Partial<Organization>) =>
      fetchApi<Organization>('/api/v1/admin/organization', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }, true),
    uploadOrgLogo: (file: File) => {
      const formData = new FormData();
      formData.append('logo', file);
      return fetchApiUpload<Organization>('/api/v1/admin/organization/upload_logo', formData);
    },
    uploadOrgBanner: (file: File) => {
      const formData = new FormData();
      formData.append('banner', file);
      return fetchApiUpload<Organization>('/api/v1/admin/organization/upload_banner', formData);
    },
  },

  // Rankings
  getRankings: (params: {
    type?: 'individual' | 'team' | 'country';
    belt?: string;
    gi_nogi?: string;
    gender?: string;
    limit?: number;
  } = {}) => {
    const searchParams = new URLSearchParams();
    if (params.type) searchParams.set('type', params.type);
    if (params.belt) searchParams.set('belt', params.belt);
    if (params.gi_nogi) searchParams.set('gi_nogi', params.gi_nogi);
    if (params.gender) searchParams.set('gender', params.gender);
    if (params.limit) searchParams.set('limit', String(params.limit));
    const qs = searchParams.toString();
    return fetchApi<RankingsResponse>(`/api/v1/rankings${qs ? `?${qs}` : ''}`);
  },
  getCompetitorProfile: (name: string) =>
    fetchApi<CompetitorProfile>(`/api/v1/rankings/competitor?name=${encodeURIComponent(name)}`),
};
