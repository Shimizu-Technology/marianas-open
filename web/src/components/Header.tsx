import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Menu, X, Shield, Search, ChevronDown, ShoppingBag } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import GlobalSearch from './GlobalSearch';
import { useOrg } from '../contexts/OrganizationContext';
import { useEvents } from '../hooks/useApi';
import { useTranslatedField } from '../hooks/useTranslatedField';
import { api } from '../services/api';
import { getCurrentMainEvent } from '../utils/events';
import { resolveMediaUrl } from '../utils/images';
import { useCommerce } from '../contexts/CommerceContext';

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
          <div className="min-w-[190px] border border-white/10 bg-navy-900/95 py-1 shadow-xl backdrop-blur-xl">
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
  const org = useOrg();
  const { events } = useEvents();
  const { tf } = useTranslatedField();
  const [impactVisible, setImpactVisible] = useState(false);
  const { enabled: commerceEnabled, cartCount, setCartOpen } = useCommerce();

  useEffect(() => {
    api.getImpactStatus()
      .then(res => setImpactVisible(res.visible))
      .catch(() => setImpactVisible(false));
  }, []);

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
      label: 'Athletes',
      children: [
        { to: '/rankings', label: t('nav.rankings') },
        { to: '/competitors', label: t('nav.competitors') },
        { to: '/teams', label: 'Teams' },
      ],
    },
    ...(impactVisible ? [{ to: '/impact', label: 'Impact' }] : []),
    ...(commerceEnabled ? [{ to: '/shop', label: 'Shop merch' }] : []),
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
        ...(impactVisible ? [{ to: '/impact', label: 'Impact' }] : []),
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
            <img src={logoSrc} onError={event => { event.currentTarget.onerror = null; event.currentTarget.src = LOGO_FALLBACK }} alt={org.name} className="h-10 w-10 object-contain" />
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
            {commerceEnabled && (cartCount > 0 ? (
              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="relative inline-flex min-h-11 items-center gap-1.5 rounded-full border border-gold bg-gold px-3 font-heading text-xs font-bold uppercase tracking-wider text-navy-900 transition-colors hover:bg-gold-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:hidden"
                aria-label={`Open shopping bag with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}`}
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Bag</span>
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-navy-900 px-1 text-[10px] text-gold">{cartCount > 99 ? '99+' : cartCount}</span>
              </button>
            ) : (
              <Link
                to="/shop"
                className={`relative inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3 font-heading text-xs font-bold uppercase tracking-wider transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold lg:hidden ${
                  location.pathname.startsWith('/shop')
                    ? 'border-gold bg-gold text-navy-900'
                    : 'border-gold/40 bg-gold/10 text-gold hover:border-gold/70 hover:bg-gold/15'
                }`}
                aria-label="Shop merchandise"
              >
                <ShoppingBag className="h-4 w-4" />
                <span>Shop</span>
              </Link>
            ))}
            {commerceEnabled && (
              <button
                onClick={() => setCartOpen(true)}
                className="relative hidden rounded-lg p-2 text-text-secondary transition-colors hover:bg-white/5 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold sm:inline-flex"
                aria-label={`Open shopping bag${cartCount ? ` with ${cartCount} ${cartCount === 1 ? 'item' : 'items'}` : ''}`}
              >
                <ShoppingBag className="h-5 w-5" />
                {cartCount > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-navy-900">{cartCount > 99 ? '99+' : cartCount}</span>}
              </button>
            )}
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
          {commerceEnabled && (
            <Link
              to="/shop"
              onClick={() => setMobileOpen(false)}
              className="group mb-3 flex min-h-20 items-center justify-between gap-4 border border-gold/30 bg-gold/[0.08] px-4 py-3 transition-colors hover:border-gold/55 hover:bg-gold/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold text-navy-900">
                  <ShoppingBag className="h-5 w-5" />
                </span>
                <span>
                  <strong className="block font-heading text-sm uppercase tracking-wider text-text-primary">Official shop</strong>
                  <span className="mt-1 block text-xs text-text-secondary">Browse Marianas Open gear</span>
                </span>
              </span>
              <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0 text-gold transition-transform group-hover:translate-x-1" />
            </Link>
          )}
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
