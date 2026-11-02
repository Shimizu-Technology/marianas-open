import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes, Link } from 'react-router-dom'
import '../../src/index.css'
import AdminLayout from '../../src/layouts/AdminLayout'
import AdminDashboard from '../../src/pages/admin/AdminDashboard'
import AdminHelp from '../../src/pages/admin/AdminHelp'
import EventsAdmin from '../../src/pages/admin/EventsAdmin'
import { eventEditorFixture } from '../../src/components/admin/event-editor/eventEditorFixtures'
import { AuthProvider } from '../../src/contexts/AuthContext'
import { api, type AdminAttention, type UserProfile } from '../../src/services/api'

if (!import.meta.env.DEV) throw new Error('D5 fixture harness is development only.')
const params = new URLSearchParams(location.search)
const role = params.get('role') === 'viewer' ? 'viewer' : 'staff'
const mode = params.get('state') || 'items'
const event = eventEditorFixture()
api.getCurrentUser = async () => ({ user: { id: 5, role, is_staff: role === 'staff', is_admin: false, full_name: 'Synthetic D5 user' } as UserProfile })
api.admin.getEvents = async () => ({ events: [event] })
let attempts = 0
const groups: AdminAttention['groups'] = [
  { area: 'results', title: 'Results', items: [{ key: 'held', area: 'results', severity: 'warning', count: 1, title: 'Results need approval: Copa de Marianas 2027', explanation: 'An administrator needs to review the saved changes before they can go public.', href: '/admin/events/7/results' }] },
  { area: 'asjjf', title: 'ASJJF checks', items: [{ key: 'fetcher', area: 'asjjf', severity: 'error', count: 1, title: 'The nightly ASJJF fetcher has not reported', explanation: 'No heartbeat has arrived in over 36 hours. Ask Shimizu Technology to check the fetcher.', href: '/admin/asjjf' }] },
  { area: 'events', title: 'Events', items: [{ key: 'event', area: 'events', severity: 'warning', count: 1, title: `Review before publishing: ${'MarianasOpenVeryLongEventName'.repeat(5)}`, explanation: 'Confirm every copied schedule row. Confirm every copied prize row. Review copied descriptions, travel and hotel details.', href: '/admin/events?edit=7' }] },
  { area: 'photos', title: 'Photos', items: [{ key: 'photos', area: 'photos', severity: 'warning', count: 128, title: 'Photos need review: Marianas Open', explanation: 'Check flagged photos and approve the ones to keep. Held photos stay hidden until approved; other flagged photos may already be public.', href: '/admin/photos/7?view=review#event-photo-library' }] },
]
api.admin.getAttention = async () => {
  await new Promise(resolve => setTimeout(resolve, 150))
  if (mode === 'error' && attempts++ === 0) throw new Error('Synthetic offline response')
  return { checked_at: new Date().toISOString(), groups: mode === 'empty' ? [] : groups }
}
function Destination({ title }: { title: string }) { return <div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-3">Synthetic destination reached. API permissions are covered by integration tests.</p><Link className="mt-4 inline-flex min-h-11 items-center text-gold underline" to="/admin">Back to Needs attention</Link></div> }
createRoot(document.getElementById('root')!).render(<AuthProvider value={{ isClerkEnabled: true, isSignedIn: true, isLoading: false, userId: 'd5-synthetic' }}><MemoryRouter initialEntries={[params.get('page') === 'event' ? '/admin/events?edit=7' : '/admin']}><Routes><Route path="/admin" element={<AdminLayout />}><Route index element={<AdminDashboard />} /><Route path="help" element={<AdminHelp />} /><Route path="events" element={<EventsAdmin />} /><Route path="events/:eventId/results" element={<Destination title="Event results destination" />} /><Route path="asjjf" element={<Destination title="ASJJF status destination" />} /><Route path="photos/:eventId" element={<Destination title="Photo review destination" />} /></Route></Routes></MemoryRouter><p className="pointer-events-none fixed bottom-1 left-1 z-[100] bg-navy-900/90 px-2 py-1 text-[10px] text-text-muted">Synthetic QA · {role} · {mode} · local only</p></AuthProvider>)
