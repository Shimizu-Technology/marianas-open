import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, Outlet } from 'react-router-dom'
import {
  ArrowLeft,
  BarChart3,
  Building2,
  CalendarDays,
  FileText,
  Handshake,
  Image,
  LayoutDashboard,
  Megaphone,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Settings,
  ShieldCheck,
  Swords,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { api } from '../services/api'
import { GalleryUploadProvider, GalleryUploadStatusPanel } from '../contexts/GalleryUploadContext'

const sidebarStorageKey = 'marianas-open-admin-sidebar-collapsed'
const mobileAdminNavId = 'mobile-admin-nav'

type NavItem = {
  to: string
  icon: LucideIcon
  label: string
  end?: boolean
  adminOnly?: boolean
}

type NavSection = {
  label: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    label: 'Command',
    items: [
      { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'Tournament',
    items: [
      { to: '/admin/events', icon: CalendarDays, label: 'Events & Results' },
      { to: '/admin/competitors', icon: Swords, label: 'Competitors' },
      { to: '/admin/academies', icon: Building2, label: 'Academies' },
      { to: '/admin/sponsors', icon: Handshake, label: 'Sponsors' },
    ],
  },
  {
    label: 'Media & Content',
    items: [
      { to: '/admin/videos', icon: Play, label: 'Videos' },
      { to: '/admin/images', icon: Image, label: 'Images' },
      { to: '/admin/content', icon: FileText, label: 'Content' },
      { to: '/admin/announcements', icon: Megaphone, label: 'Announcements' },
      { to: '/admin/impact', icon: BarChart3, label: 'Impact' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/admin/users', icon: Users, label: 'Users', adminOnly: true },
      { to: '/admin/settings', icon: Settings, label: 'Settings', adminOnly: true },
    ],
  },
]

function readSidebarPreference() {
  if (typeof window === 'undefined') return false

  try {
    return window.localStorage.getItem(sidebarStorageKey) === 'true'
  } catch {
    return false
  }
}

function FloatingTooltip({ anchorRef, label, visible }: { anchorRef: RefObject<HTMLElement | null>; label: string; visible: boolean }) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!visible) return

    const updatePosition = () => {
      const anchor = anchorRef.current
      if (!anchor) return

      const rect = anchor.getBoundingClientRect()
      setPosition({
        top: rect.top + rect.height / 2,
        left: rect.right + 16,
      })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [anchorRef, visible])

  if (!visible || !position || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="pointer-events-none fixed z-[120] hidden -translate-y-1/2 items-center lg:flex"
      style={{ top: position.top, left: position.left }}
    >
      <span className="h-3 w-3 translate-x-[7px] rotate-45 rounded-[3px] bg-navy-900 shadow-lg shadow-black/40 ring-1 ring-white/10" />
      <span className="whitespace-nowrap rounded-xl border border-white/10 bg-navy-900 px-3.5 py-2 text-xs font-semibold text-text-primary shadow-2xl shadow-black/35">
        {label}
      </span>
    </div>,
    document.body
  )
}

function AdminNavLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate: () => void }) {
  const anchorRef = useRef<HTMLAnchorElement | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)
  const Icon = item.icon

  const showTooltip = () => {
    if (collapsed) setTooltipVisible(true)
  }

  const hideTooltip = () => setTooltipVisible(false)

  useEffect(() => {
    setTooltipVisible(false)
  }, [collapsed])

  return (
    <>
      <NavLink
        ref={anchorRef}
        to={item.to}
        end={item.end}
        onClick={() => {
          hideTooltip()
          onNavigate()
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-label={collapsed ? item.label : undefined}
        title={collapsed ? item.label : undefined}
        className={({ isActive }) =>
          `group relative flex min-h-11 items-center rounded-xl text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
            collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
          } ${
            isActive
              ? 'bg-gold/12 text-gold shadow-[0_16px_34px_-24px_rgba(212,168,67,0.9)] ring-1 ring-gold/25'
              : 'text-text-secondary hover:bg-white/[0.05] hover:text-text-primary'
          }`
        }
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className={collapsed ? 'sr-only' : 'truncate'}>{item.label}</span>
      </NavLink>
      {collapsed && <FloatingTooltip anchorRef={anchorRef} label={item.label} visible={tooltipVisible} />}
    </>
  )
}

function UtilityLink({
  to,
  label,
  icon: Icon,
  collapsed,
  onNavigate,
}: {
  to: string
  label: string
  icon: LucideIcon
  collapsed: boolean
  onNavigate: () => void
}) {
  const anchorRef = useRef<HTMLAnchorElement | null>(null)
  const [tooltipVisible, setTooltipVisible] = useState(false)

  const showTooltip = () => {
    if (collapsed) setTooltipVisible(true)
  }

  const hideTooltip = () => setTooltipVisible(false)

  useEffect(() => {
    setTooltipVisible(false)
  }, [collapsed])

  return (
    <>
      <Link
        ref={anchorRef}
        to={to}
        onClick={() => {
          hideTooltip()
          onNavigate()
        }}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        aria-label={collapsed ? label : undefined}
        title={collapsed ? label : undefined}
        className={`group relative flex min-h-11 items-center rounded-xl text-sm font-medium text-text-muted transition-all duration-200 hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
          collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
        }`}
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className={collapsed ? 'sr-only' : 'truncate'}>{label}</span>
      </Link>
      {collapsed && <FloatingTooltip anchorRef={anchorRef} label={label} visible={tooltipVisible} />}
    </>
  )
}

function SidebarContent({
  collapsed,
  isAdmin,
  onNavigate,
  onToggleCollapse,
}: {
  collapsed: boolean
  isAdmin: boolean
  onNavigate: () => void
  onToggleCollapse?: () => void
}) {
  const collapseButtonRef = useRef<HTMLButtonElement | null>(null)
  const [collapseTooltipVisible, setCollapseTooltipVisible] = useState(false)

  const visibleNavSections = navSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => !item.adminOnly || isAdmin),
    }))
    .filter((section) => section.items.length > 0)

  const collapseLabel = collapsed ? 'Expand sidebar' : 'Collapse sidebar'

  useEffect(() => {
    setCollapseTooltipVisible(false)
  }, [collapsed])

  return (
    <nav className="flex h-full flex-col" aria-label="Admin navigation">
      <div className={collapsed ? 'px-3 pb-3 pt-4' : 'px-4 pb-4 pt-5'}>
        <Link
          to="/admin"
          onClick={onNavigate}
          className={`group flex items-center rounded-2xl transition-colors hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface ${
            collapsed ? 'justify-center p-1.5' : 'gap-3 px-3 py-2'
          }`}
          aria-label="Marianas Open admin dashboard"
          title={collapsed ? 'Marianas Open Admin' : undefined}
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gold text-sm font-black tracking-tight text-navy-900 shadow-lg shadow-gold/20 ring-1 ring-gold-300/30">
            MO
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate font-heading text-sm font-bold tracking-wide text-text-primary">Marianas Open</p>
              <p className="truncate text-xs font-medium text-text-muted">Admin console</p>
            </div>
          )}
        </Link>

        {onToggleCollapse && (
          <>
            <button
              ref={collapseButtonRef}
              type="button"
              onClick={() => {
                setCollapseTooltipVisible(false)
                onToggleCollapse()
              }}
              onMouseEnter={() => collapsed && setCollapseTooltipVisible(true)}
              onMouseLeave={() => setCollapseTooltipVisible(false)}
              onFocus={() => collapsed && setCollapseTooltipVisible(true)}
              onBlur={() => setCollapseTooltipVisible(false)}
              className={`mt-3 hidden min-h-10 w-full items-center rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-text-secondary transition-all duration-200 hover:border-gold/30 hover:bg-gold/10 hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 focus-visible:ring-offset-2 focus-visible:ring-offset-surface lg:flex ${
                collapsed ? 'justify-center' : 'justify-between'
              }`}
              aria-label={collapseLabel}
              aria-expanded={!collapsed}
              title={collapsed ? collapseLabel : undefined}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
              {!collapsed && <span>{collapseLabel}</span>}
            </button>
            {collapsed && <FloatingTooltip anchorRef={collapseButtonRef} label={collapseLabel} visible={collapseTooltipVisible} />}
          </>
        )}
      </div>

      <div className={`flex-1 overflow-y-auto pb-4 ${collapsed ? 'space-y-3 px-3' : 'space-y-5 px-4'}`}>
        {visibleNavSections.map((section, sectionIndex) => (
          <div key={section.label}>
            {collapsed ? (
              <div className={sectionIndex === 0 ? 'sr-only' : 'mx-2 my-2 border-t border-white/10'}>
                <span className="sr-only">{section.label}</span>
              </div>
            ) : (
              <div className="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-text-muted">
                {section.label}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <AdminNavLink key={item.to} item={item} collapsed={collapsed} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className={`border-t border-white/10 ${collapsed ? 'p-3' : 'p-4'}`}>
        {!collapsed && (
          <div className="mb-3 rounded-2xl border border-gold/15 bg-gold/[0.07] px-3 py-3">
            <div className="flex items-start gap-2.5">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
              <div>
                <p className="text-xs font-semibold text-text-primary">Tournament operations</p>
                <p className="mt-1 text-[11px] leading-4 text-text-muted">Manage events, media, content, and access from one workspace.</p>
              </div>
            </div>
          </div>
        )}
        <UtilityLink to="/" label="Back to public site" icon={ArrowLeft} collapsed={collapsed} onNavigate={onNavigate} />
      </div>
    </nav>
  )
}

export default function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [desktopCollapsed, setDesktopCollapsed] = useState(readSidebarPreference)

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      window.localStorage.setItem(sidebarStorageKey, String(desktopCollapsed))
    } catch {
      // Ignore localStorage failures in private browsing or restricted contexts.
    }
  }, [desktopCollapsed])

  useEffect(() => {
    if (!mobileNavOpen || typeof document === 'undefined') return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileNavOpen(false)
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [mobileNavOpen])

  const closeMobileNav = () => setMobileNavOpen(false)

  return (
    <GalleryUploadProvider>
      <div className="min-h-screen bg-navy-900 text-text-primary">
        <header className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-surface/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-text-secondary transition-colors hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            aria-label="Open admin navigation"
            aria-expanded={mobileNavOpen}
            aria-controls={mobileAdminNavId}
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 text-center">
            <p className="font-heading text-sm font-bold tracking-wide text-text-primary">Marianas Open</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-text-muted">Admin console</p>
          </div>
          <div className="h-10 w-10" aria-hidden="true" />
        </header>

        {mobileNavOpen && (
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={closeMobileNav}
            aria-label="Close admin navigation"
          />
        )}

        <aside
          id={mobileAdminNavId}
          className={`fixed inset-y-0 left-0 z-[60] flex w-72 max-w-[86vw] transform flex-col border-r border-white/10 bg-surface shadow-2xl shadow-black/40 transition-transform duration-200 ease-out lg:hidden ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
          role="dialog"
          aria-modal="true"
          aria-label="Admin navigation"
          aria-hidden={!mobileNavOpen}
          inert={!mobileNavOpen}
        >
          <button
            type="button"
            onClick={closeMobileNav}
            className="absolute right-3 top-4 inline-flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-white/[0.05] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/60"
            aria-label="Close admin navigation"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent collapsed={false} isAdmin={isAdmin} onNavigate={closeMobileNav} />
        </aside>

        <aside
          className={`fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-white/10 bg-surface/95 shadow-2xl shadow-black/20 backdrop-blur transition-[width] duration-200 ease-out lg:flex ${
            desktopCollapsed ? 'w-20' : 'w-72'
          }`}
        >
          <SidebarContent
            collapsed={desktopCollapsed}
            isAdmin={isAdmin}
            onNavigate={() => undefined}
            onToggleCollapse={() => setDesktopCollapsed((value) => !value)}
          />
        </aside>

        <div className={`min-h-screen transition-[padding] duration-200 ease-out ${desktopCollapsed ? 'lg:pl-20' : 'lg:pl-72'}`}>
          <main className="min-w-0">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="p-4 sm:p-6 lg:p-8"
            >
              <Outlet />
            </motion.div>
          </main>
        </div>
        <GalleryUploadStatusPanel />
      </div>
    </GalleryUploadProvider>
  )
}
