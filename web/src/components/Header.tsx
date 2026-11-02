import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Shield, Search, ChevronDown } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import GlobalSearch from './GlobalSearch';
import { useOrg } from '../contexts/OrganizationContext';
import { useEvents } from '../hooks/useApi';
import { useTranslatedField } from '../hooks/useTranslatedField';
import { api } from '../services/api';
import { getCurrentMainEvent } from '../utils/events';
import { resolveMediaUrl } from '../utils/images';

const LOGO_FALLBACK = '/images/logos/mo-logo-white.png';

interface NavDropdown {
  label: string;
  children: { to: string; label: string }[];
}

type NavItem = { to: string; label: string; hidden?: boolean } | NavDropdown;

function isDropdown(item: NavItem): item is NavDropdown {
  return 'children' in item;
}

function DesktopDropdown({ item, pathname }: { item: NavDropdown; pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isActive = item.children.some(c => pathname === c.to);

  const enter = () => { clearTimeout(timeout.current); setOpen(true); };
  const leave = () => { timeout.current = setTimeout(() => setOpen(false), 150); };

  useEffect(() => () => clearTimeout(timeout.current), []);

  return (
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave} onKeyDown={event => {
      if (event.key === 'Escape') { setOpen(false); ref.current?.querySelector('button')?.focus(); }
    }}>
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={`flex items-center gap-1 text-sm font-medium transition-colors duration-200 ${
          isActive ? 'text-gold-500' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        {item.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
          <div className="ui-card min-w-[190px] py-1">
            {item.children.map(child => (
              <Link
                key={child.to}
                to={child.to}
                onClick={() => setOpen(false)}
                className={`block whitespace-nowrap px-4 py-2 text-sm transition-colors ${
                  pathname === child.to
                    ? 'text-gold-500 bg-white/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const org = useOrg();
  const { events } = useEvents();
  const { tf } = useTranslatedField();
  const [impactVisible, setImpactVisible] = useState(false);

  useEffect(() => {
    api.getImpactStatus()
      .then(res => setImpactVisible(res.visible))
      .catch(() => setImpactVisible(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setMobileOpen(false);
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useLayoutEffect(() => {
    if (!mobileOpen) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dismiss = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); menuButtonRef.current?.focus(); }
    };
    document.addEventListener('keydown', dismiss);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', dismiss);
    };
  }, [mobileOpen]);

  const logoSrc = resolveMediaUrl(org.logo_url) || LOGO_FALLBACK;
  const currentMainEvent = getCurrentMainEvent(events);
  const currentMainEventLabel = currentMainEvent
    ? tf(currentMainEvent, 'name') || currentMainEvent.name
    : null;
  const eventLinks = [
    ...(currentMainEventLabel ? [{ to: '/event', label: currentMainEventLabel }] : []),
    { to: '/calendar', label: t('nav.calendar') },
    { to: '/events/past', label: t('nav.pastEvents') },
  ];

  const navItems: NavItem[] = [
    { to: '/', label: t('nav.home') },
    {
      label: t('nav.events'),
      children: eventLinks,
    },
    { to: '/about', label: t('nav.about') },
    { to: '/rules', label: t('nav.rules') },
    {
      label: t('nav.athletes'),
      children: [
        { to: '/rankings', label: t('nav.rankings') },
        { to: '/competitors', label: t('nav.competitors') },
        { to: '/teams', label: t('nav.teams') },
      ],
    },
    { to: '/impact', label: t('nav.impact'), hidden: !impactVisible },
    { to: '/watch', label: t('nav.watch') },
  ];

  const mobileGroups = [
    {
      heading: null,
      links: [
        { to: '/', label: t('nav.home') },
        { to: '/about', label: t('nav.about') },
      ],
    },
    {
      heading: t('nav.events'),
      links: eventLinks,
    },
    {
      heading: t('nav.athletes'),
      links: [
        { to: '/rankings', label: t('nav.rankings') },
        { to: '/competitors', label: t('nav.competitors') },
        { to: '/teams', label: t('nav.teams') },
      ],
    },
    {
      heading: null,
      links: [
        { to: '/rules', label: t('nav.rules') },
        ...(impactVisible ? [{ to: '/impact', label: t('nav.impact') }] : []),
        { to: '/watch', label: t('nav.watch') },
      ],
    },
  ];

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-xl border-b border-white/5">
      <div className="public-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={logoSrc} alt={org.name} className="h-10 w-10 object-contain" />
            <div className="hidden sm:block">
              <span className="text-sm font-bold text-text-primary font-heading">
                {org.name}
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden lg:flex items-center gap-6">
            {navItems.map((item, i) =>
              isDropdown(item) ? (
                <DesktopDropdown key={i} item={item} pathname={location.pathname} />
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  style={item.hidden ? { visibility: 'hidden' } : undefined}
                  aria-hidden={item.hidden || undefined}
                  tabIndex={item.hidden ? -1 : undefined}
                  className={`text-sm font-medium transition-colors duration-200 ${
                    location.pathname === item.to
                      ? 'text-gold-500'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {item.label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { setMobileOpen(false); setSearchOpen(true); }}
              className="text-text-secondary hover:text-text-primary transition-colors min-h-11 min-w-11 flex items-center justify-center p-2 rounded-control hover:bg-white/5"
              aria-label={t('search.title')}
            >
              <Search className="w-5 h-5" />
            </button>
            <Link
              to="/admin"
              className="hidden lg:flex text-text-muted hover:text-text-primary transition-colors min-h-11 min-w-11 flex items-center justify-center p-2 rounded-control hover:bg-white/5"
              aria-label={t('nav.admin')}
            >
              <Shield className="w-4 h-4" />
            </Link>
            <LanguageSwitcher />
            <button
              ref={menuButtonRef}
              className="pressable lg:hidden text-text-primary min-h-11 min-w-11 flex items-center justify-center p-2"
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={t('nav.toggleMenu', 'Toggle menu')}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>

    {/* Mobile Nav */}
    {mobileOpen && (
      <div
        className="fixed inset-0 top-16 z-50 lg:hidden"
        onClick={() => setMobileOpen(false)}
      >
        <div className="absolute inset-0 bg-black/40" />
        <nav
          id="mobile-navigation"
          aria-label={t('nav.toggleMenu')}
          className="relative bg-navy-900/95 backdrop-blur-xl border-t border-white/5 px-4 py-3 max-h-[calc(100dvh-4rem)] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {mobileGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'border-t border-white/5 mt-2 pt-2' : ''}>
              {group.heading && (
                <div className="px-4 py-1.5 text-xs font-semibold text-text-muted">
                  {group.heading}
                </div>
              )}
              {group.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block min-h-11 py-2.5 px-4 rounded-control text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'text-gold-500 bg-white/5'
                      : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    )}
    </>
  );
}
