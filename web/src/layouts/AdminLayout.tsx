import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { CalendarDays, Handshake, Settings, Users, LayoutDashboard, ArrowLeft, Play, Image, FileText, Swords, Menu, X, Building2, Megaphone, BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { GalleryUploadProvider, GalleryUploadStatusPanel } from '../contexts/GalleryUploadContext'

const navItems = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/events', icon: CalendarDays, label: 'Events' },
  { to: '/admin/sponsors', icon: Handshake, label: 'Sponsors' },
  { to: '/admin/competitors', icon: Swords, label: 'Competitors' },
  { to: '/admin/academies', icon: Building2, label: 'Academies' },
  { to: '/admin/videos', icon: Play, label: 'Videos' },
  { to: '/admin/images', icon: Image, label: 'Images' },
  { to: '/admin/content', icon: FileText, label: 'Content' },
  { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/admin/impact', icon: BarChart3, label: 'Impact' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/settings', icon: Settings, label: 'Settings' },
]

export default function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    api.getCurrentUser()
      .then(({ user }) => {
        if (!cancelled) setIsAdmin(user.is_admin)
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const visibleNavItems = isAdmin
    ? navItems
    : navItems.filter(item => item.to !== '/admin/users' && item.to !== '/admin/settings')

  return (
    <GalleryUploadProvider>
    <div className="min-h-screen bg-navy-900 lg:flex">
      <div className="lg:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/5 bg-surface/95 backdrop-blur px-4 py-3">
        <div>
          <div className="font-heading text-sm font-semibold text-text-primary tracking-wide uppercase">
            Admin
          </div>
        </div>
        <button
          onClick={() => setMobileNavOpen(true)}
          className="inline-flex items-center justify-center p-2 text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
          aria-label="Open admin navigation"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {mobileNavOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] border-r border-white/5 bg-surface flex flex-col shrink-0 transform transition-transform duration-200 lg:static lg:z-auto lg:w-56 lg:max-w-none lg:translate-x-0 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-heading text-sm font-semibold text-text-primary tracking-wide uppercase">
              Admin
            </h2>
            <button
              onClick={() => setMobileNavOpen(false)}
              className="lg:hidden inline-flex items-center justify-center p-1.5 text-text-muted hover:text-text-primary"
              aria-label="Close admin navigation"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {visibleNavItems.map((item) => (
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
              onClick={() => setMobileNavOpen(false)}
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
            onClick={() => setMobileNavOpen(false)}
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
          className="p-4 sm:p-6 lg:p-8"
        >
          <Outlet />
        </motion.div>
      </main>
      <GalleryUploadStatusPanel />
    </div>
    </GalleryUploadProvider>
  )
}
