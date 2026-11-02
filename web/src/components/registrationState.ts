import type { RegistrationUrlFields } from '../utils/registrationLinks';
import { eventPhase } from '../utils/events';
export type RegistrationEvent = RegistrationUrlFields & {
  registration_opens_on?: string | null;
  registration_not_open?: boolean;
  date?: string;
  end_date?: string | null;
  status?: string;
};
/** ISO opening dates use the same Guam calendar-day boundary as the public season helpers. */
export function registrationState(event: RegistrationEvent | null | undefined, now = new Date()): 'open' | 'scheduled' | 'pending' | 'closed' {
  if (!event) return 'closed';
  if (event.status === 'completed' || event.status === 'cancelled'
    || (event.date && ['completed', 'cancelled'].includes(eventPhase({ date: event.date, end_date: event.end_date || null, status: event.status || 'upcoming' }, now)))) return 'closed';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Guam', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  if (event.registration_opens_on && event.registration_opens_on > today) return 'scheduled';
  return event.registration_not_open ? 'pending' : 'open';
}
