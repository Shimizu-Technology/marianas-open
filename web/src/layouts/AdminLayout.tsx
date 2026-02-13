import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Handshake, Settings, Users, LayoutDashboard, ArrowLeft, Play, Image, FileText } from 'lucide-react'
import { motion } from 'framer-motion'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/events', icon: CalendarDays, label: 'Events' },
  { to: '/admin/sponsors', icon: Handshake, label: 'Sponsors' },
  { to: '/admin/videos', icon: Play, label: 'Videos' },
  { to: '/admin/images', icon: Image, label: 'Images' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-navy-900 flex">
      {/* Sidebar */}
      <aside className="w-56 border-r border-white/5 bg-surface flex flex-col shrink-0">
        <div className="p-5 border-b border-white/5">
          <h2 className="font-heading text-sm font-semibold text-text-primary tracking-wide uppercase">
            Admin
          </h2>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? 'text-gold bg-white/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/3'
                }`
              }
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-white/5">
          <NavLink
            to="/"
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to site
          </NavLink>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="p-8"
        >
          <Outlet />
        </motion.div>
      </main>
    </div>
  )
}
