import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, CalendarDays, Handshake, Users, Plus, ArrowRight, Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../../services/api'
import type { Event } from '../../services/api'

interface Stats {
  totalEvents: number
  upcomingEvents: number
  totalSponsors: number
  totalUsers: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({ totalEvents: 0, upcomingEvents: 0, totalSponsors: 0, totalUsers: 0 })
  const [recentEvents, setRecentEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [eventsRes, sponsorsRes, usersRes] = await Promise.all([
          api.admin.getEvents(),
          api.admin.getSponsors(),
          api.getUsers(),
        ])
        const events = eventsRes.events
        const now = new Date().toISOString().split('T')[0]
        setStats({
          totalEvents: events.length,
          upcomingEvents: events.filter((e: Event) => e.date >= now).length,
          totalSponsors: sponsorsRes.sponsors.length,
          totalUsers: usersRes.users.length,
        })
        setRecentEvents(events.slice(0, 5))
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
    { label: 'Users', value: stats.totalUsers, icon: Users, to: '/admin/users' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-gold animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <LayoutDashboard className="w-6 h-6 text-gold" />
        <h1 className="font-heading text-2xl font-bold text-text-primary">Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Link
              to={card.to}
              className="block bg-surface border border-white/5 p-5 hover:border-white/10 transition-colors group"
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
      <div className="flex gap-3 mb-8">
        <Link
          to="/admin/events"
          className="flex items-center gap-2 px-4 py-2.5 bg-gold/10 text-gold text-sm font-medium hover:bg-gold/15 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Event
        </Link>
        <Link
          to="/admin/sponsors"
          className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-text-secondary text-sm font-medium hover:bg-white/8 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Sponsor
        </Link>
      </div>

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
              <div key={event.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="text-sm text-text-primary font-medium">{event.name}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {event.city}, {event.country} — {event.date}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 ${
                  event.status === 'published' ? 'bg-green-500/10 text-green-400' :
                  event.status === 'draft' ? 'bg-white/5 text-text-muted' :
                  'bg-gold/10 text-gold'
                }`}>
                  {event.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
