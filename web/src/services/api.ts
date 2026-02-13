const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

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
  id: number;
  time: string;
  description: string;
  sort_order: number;
}

export interface PrizeCategory {
  id: number;
  name: string;
  amount: string;
  sort_order: number;
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

async function fetchApi<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_URL}${endpoint}`);
  if (!response.ok) throw new Error(`API error: ${response.status}`);
  return response.json();
}

export const api = {
  getOrganization: () => fetchApi<Organization>('/api/v1/organization'),
  getEvents: () => fetchApi<Event[]>('/api/v1/events'),
  getEvent: (slug: string) => fetchApi<Event>(`/api/v1/events/${slug}`),
  getSponsors: () => fetchApi<Sponsor[]>('/api/v1/sponsors'),
};
