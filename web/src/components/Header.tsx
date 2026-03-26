import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X, Shield, Search } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import GlobalSearch from './GlobalSearch';
import { useOrg } from '../contexts/OrganizationContext';

const LOGO_FALLBACK = '/images/logos/mo-logo-white.png';

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

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/calendar', label: t('nav.events') },
    { to: '/events/past', label: t('nav.pastEvents') },
    { to: '/about', label: t('nav.about') },
    { to: '/rules', label: t('nav.rules') },
    { to: '/rankings', label: t('nav.rankings') },
    { to: '/competitors', label: t('nav.competitors') },
    { to: '/teams', label: 'Teams' },
    { to: '/watch', label: t('nav.watch') },
  ];

  return (
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
          <nav className="hidden xl:flex items-center gap-8">
            {links.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={`text-sm font-medium tracking-wide transition-colors duration-200 ${
                  location.pathname === link.to
                    ? 'text-gold-500'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Search + Language + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded-lg hover:bg-white/5"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono text-text-muted">
                ⌘K
              </kbd>
            </button>
            <LanguageSwitcher />
            <button
              className="xl:hidden text-text-primary p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={t('nav.toggleMenu', 'Toggle menu')}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="xl:hidden bg-navy-900/95 backdrop-blur-xl border-t border-white/5 px-4 py-4 space-y-1">
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={`block py-3 px-4 rounded-md text-sm font-medium transition-colors ${
                location.pathname === link.to
                  ? 'text-gold-500 bg-white/5'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-white/5 mt-2 pt-2">
            <Link
              to="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 py-3 px-4 rounded-md text-sm font-medium text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          </div>
        </nav>
      )}
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}
