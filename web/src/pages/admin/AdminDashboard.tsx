import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Handshake, Users, Plus, ArrowRight, Loader2, CircleAlert, CalendarRange, Activity } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../../services/api'
import type { AuditLog, Event, Season } from '../../services/api'
import { formatDate } from '../../utils/dates'

interface Stats {
  totalEvents: number
  upcomingEvents: number
  totalSponsors: number
  totalUsers: number | null
  draftsNeedingWork: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalEvents: 0, upcomingEvents: 0, totalSponsors: 0, totalUsers: null, draftsNeedingWork: 0 })
  const [recentEvents, setRecentEvents] = useState<Event[]>([])
  const [currentSeason, setCurrentSeason] = useState<Season | null>(null)
  const [activity, setActivity] = useState<AuditLog[]>([])
  const [canViewAudit, setCanViewAudit] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const meRes = await api.getCurrentUser()
        const [eventsRes, sponsorsRes, seasonsRes] = await Promise.all([
          api.admin.getEvents(),
          api.admin.getSponsors(),
          api.admin.getSeasons(),
        ])
        const canReadAudit = meRes.user.is_staff
        const auditRes = canReadAudit ? await api.admin.getAuditLogs(8) : { audit_logs: [] }

        let totalUsers: number | null = null
        if (meRes.user.is_admin) {
          try {
            const usersRes = await api.getUsers()
            totalUsers = usersRes.users.length
          } catch {
            totalUsers = null
          }
        }

        const events = eventsRes.events
        const now = new Date().toISOString().split('T')[0]
        setStats({
          totalEvents: events.length,
          upcomingEvents: events.filter((e: Event) => Boolean(e.date && e.date >= now)).length,
          totalSponsors: sponsorsRes.sponsors.length,
          totalUsers,
          draftsNeedingWork: events.filter((e: Event) => e.status === 'draft' && !e.readiness?.publishable).length,
        })
        setRecentEvents(events.slice(0, 5))
        setCurrentSeason(seasonsRes.seasons.find((season) => season.current) || seasonsRes.seasons[0] || null)
        setActivity(auditRes.audit_logs)
        setCanViewAudit(canReadAudit)
      } catch (err) {
        console.error('Failed to load dashboard:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const cards = [
    { label: 'Total Events', value: stats.totalEvents, icon: CalendarDays, to: '/admin/events' },
    { label: 'Upcoming', value: stats.upcomingEvents, icon: CalendarDays, to: '/admin/events' },
    { label: 'Sponsors', value: stats.totalSponsors, icon: Handshake, to: '/admin/sponsors' },
    { label: 'Drafts needing work', value: stats.draftsNeedingWork, icon: CircleAlert, to: '/admin/events' },
    ...(stats.totalUsers !== null
      ? [{ label: 'Users', value: stats.totalUsers, icon: Users, to: '/admin/users' }]
      : []),
  ] as const

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <LayoutDashboard className="w-6 h-6 text-gold" />
        <h1 className="font-heading text-2xl font-bold text-text-primary">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={card.to}
              className="block bg-surface border border-white/5 p-4 sm:p-5 hover:border-white/10 transition-colors group"
            >
              <div className="flex items-center justify-between mb-3">
                <card.icon className="w-4 h-4 text-text-muted" />
                <ArrowRight className="w-3 h-3 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="text-2xl font-heading font-bold text-text-primary">{card.value}</div>
              <div className="text-xs text-text-muted mt-1">{card.label}</div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 sm:mb-8">
        <Link
          to="/admin/events"
          className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 sm:py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
        <Link
          to="/admin/sponsors"
          className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 sm:py-2.5 bg-white/5 text-text-secondary text-sm font-medium hover:bg-white/8 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sponsor
        </Link>
        <Link to="/admin/seasons" className="flex items-center justify-center sm:justify-start gap-2 px-4 py-3 sm:py-2.5 bg-white/5 text-text-secondary text-sm font-medium hover:bg-white/8 transition-colors"><CalendarRange className="w-4 h-4" />Prepare next season</Link>
      </div>

      {currentSeason && (
        <div className="mb-6 border border-gold/20 bg-gold/[0.06] p-4 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="text-xs font-bold uppercase tracking-wider text-gold">Current season</div><div className="mt-1 font-heading text-lg font-bold">{currentSeason.name}</div><div className="mt-1 text-xs text-text-muted">{currentSeason.ready_events_count} of {currentSeason.events_count} events pass publishing readiness</div></div><Link to="/admin/seasons" className="text-sm font-medium text-gold hover:text-gold/80">Manage season →</Link></div>
        </div>
      )}

      {/* Recent Events */}
      <div className="bg-surface border border-white/5">
        <div className="px-5 py-4 border-b border-white/5">
          <h2 className="font-heading text-sm font-semibold text-text-primary">Recent Events</h2>
        </div>
        {recentEvents.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No events yet</div>
        ) : (
          <div className="divide-y divide-white/5">
            {recentEvents.map((event) => (
              <div key={event.id} className="px-4 sm:px-5 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm text-text-primary font-medium">{event.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {event.city}, {event.country} — {formatDate(event.date)}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 self-start sm:self-auto ${
                  event.status === 'upcoming' ? 'bg-gold/10 text-gold' :
                  event.status === 'live' ? 'bg-red-500/10 text-red-400 animate-pulse' :
                  event.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                  event.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                  'bg-white/5 text-text-muted'
                }`}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-surface border border-white/5">
        <div className="flex items-center gap-2 border-b border-white/5 px-5 py-4"><Activity className="h-4 w-4 text-text-muted" /><h2 className="font-heading text-sm font-semibold text-text-primary">Recent admin activity</h2></div>
        {!canViewAudit ? <div className="p-6 text-sm text-text-muted">Activity history is available to staff and administrators.</div> : activity.length === 0 ? <div className="p-6 text-sm text-text-muted">Activity will appear here after the next admin change.</div> : <div className="divide-y divide-white/5">{activity.map((log) => <div key={log.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm"><div><span className="font-medium text-text-primary">{log.actor?.first_name || log.actor?.email || 'System'}</span><span className="text-text-muted"> {log.action.replaceAll('_', ' ')} </span><span className="text-text-secondary">{log.auditable_label}</span></div><time className="shrink-0 text-xs text-text-muted">{new Date(log.created_at).toLocaleString()}</time></div>)}</div>}
      </div>
    </div>
  )
}
