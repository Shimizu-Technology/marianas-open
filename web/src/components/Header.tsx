import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Shield, Search, ChevronDown } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import GlobalSearch from './GlobalSearch';
import { useOrg } from '../contexts/OrganizationContext';

const LOGO_FALLBACK = '/images/logos/mo-logo-white.png';

interface NavDropdown {
  label: string;
  children: { to: string; label: string }[];
}

type NavItem = { to: string; label: string } | NavDropdown;

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
    <div ref={ref} className="relative" onMouseEnter={enter} onMouseLeave={leave}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1 text-sm font-medium tracking-wide transition-colors duration-200 ${
          isActive ? 'text-gold-500' : 'text-text-secondary hover:text-text-primary'
        }`}
      >
        {item.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 z-50">
          <div className="bg-navy-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px]">
            {item.children.map(child => (
              <Link
                key={child.to}
                to={child.to}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
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
  const org = useOrg();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const logoSrc = org.logo_url || LOGO_FALLBACK;

  const navItems: NavItem[] = [
    { to: '/', label: t('nav.home') },
    {
      label: t('nav.events'),
      children: [
        { to: '/calendar', label: 'Calendar' },
        { to: '/events/past', label: t('nav.pastEvents') },
      ],
    },
    { to: '/about', label: t('nav.about') },
    { to: '/rules', label: t('nav.rules') },
    {
      label: 'Athletes',
      children: [
        { to: '/rankings', label: t('nav.rankings') },
        { to: '/competitors', label: t('nav.competitors') },
        { to: '/teams', label: 'Teams' },
      ],
    },
    { to: '/impact', label: 'Impact' },
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
      links: [
        { to: '/calendar', label: 'Calendar' },
        { to: '/events/past', label: t('nav.pastEvents') },
      ],
    },
    {
      heading: 'Athletes',
      links: [
        { to: '/rankings', label: t('nav.rankings') },
        { to: '/competitors', label: t('nav.competitors') },
        { to: '/teams', label: 'Teams' },
      ],
    },
    {
      heading: null,
      links: [
        { to: '/rules', label: t('nav.rules') },
        { to: '/impact', label: 'Impact' },
        { to: '/watch', label: t('nav.watch') },
      ],
    },
  ];

  return (
    <>
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src={logoSrc} alt={org.name} className="h-10 w-10 object-contain" />
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-wider text-text-primary font-heading uppercase">
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
                  className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
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
              onClick={() => setSearchOpen(true)}
              className="text-text-secondary hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-white/5"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <Link
              to="/admin"
              className="hidden lg:flex text-text-muted hover:text-text-primary transition-colors p-2 rounded-lg hover:bg-white/5"
              aria-label="Admin"
            >
              <Shield className="w-4 h-4" />
            </Link>
            <LanguageSwitcher />
            <button
              className="lg:hidden text-text-primary p-2"
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
          className="relative bg-navy-900/95 backdrop-blur-xl border-t border-white/5 px-4 py-3 max-h-[calc(100vh-4rem)] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          {mobileGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'border-t border-white/5 mt-2 pt-2' : ''}>
              {group.heading && (
                <div className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {group.heading}
                </div>
              )}
              {group.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={`block py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
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
          <div className="border-t border-white/5 mt-2 pt-2">
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          </div>
        </nav>
      </div>
    )}
    </>
  );
}
