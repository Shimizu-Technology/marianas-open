const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface CompetitorProfileResult {
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
  academy?: string;
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
}

export interface PrizeCategory {
  id?: number;
  name: string;
  amount: string;
  sort_order: number;
  _destroy?: boolean;
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
  prize_pool: string | null;
  status: string;
  hero_image_url: string | null;
  event_schedule_items: EventScheduleItem[];
  prize_categories: PrizeCategory[];
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
  placement: 'hero' | 'gallery' | 'about' | 'event_default' | 'sponsor_default';
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
  registration_url: string;
  status: string;
  latitude: string;
  longitude: string;
  event_schedule_items_attributes: EventScheduleItem[];
  prize_categories_attributes: PrizeCategory[];
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
  bio: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  wins: number;
  losses: number;
  draws: number;
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
  photo_url: string | null;
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
  gold_medals: number;
  silver_medals: number;
  bronze_medals: number;
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
  section: string;
  label: string;
  sort_order: number;
}

export type SiteContentMap = Record<string, { en: string | null; ja: string | null; ko: string | null; tl: string | null; zh: string | null }>;
export type SiteContentGrouped = Record<string, SiteContentEntry[]>;

export interface EventResult {
  id: number;
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
  getCompetitors: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<Competitor[]>(`/api/v1/competitors${query}`);
  },
  getCompetitor: (id: number) => fetchApi<Competitor>(`/api/v1/competitors/${id}`),
  getVideos: (params?: Record<string, string>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return fetchApi<Video[]>(`/api/v1/videos${query}`);
  },
  getVideo: (id: number) => fetchApi<Video>(`/api/v1/videos/${id}`),
  getSiteImages: (placement?: string) => {
    const query = placement ? `?placement=${encodeURIComponent(placement)}` : '';
    return fetchApi<{ site_images: SiteImage[] }>(`/api/v1/site-images${query}`);
  },

  // Auth
  getCurrentUser: (email?: string) => {
    const params = email ? `?email=${encodeURIComponent(email)}` : '';
    return fetchApi<{ user: UserProfile }>(`/api/v1/me${params}`, {}, true);
  },

  // Admin - Users
  getUsers: () => fetchApi<{ users: UserProfile[] }>('/api/v1/admin/users', {}, true),
  createUser: (data: { email: string; role: string; first_name?: string; last_name?: string }) =>
    fetchApi<{ user: UserProfile }>('/api/v1/admin/users', {
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
    uploadEventImage: (id: number, file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      return fetchApiUpload<{ event: Event }>(`/api/v1/admin/events/${id}/upload_image`, formData);
    },

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
    getCompetitors: () => fetchApi<{ competitors: Competitor[] }>('/api/v1/admin/competitors', {}, true),
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
