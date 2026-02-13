import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Menu, X } from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';

export default function Header() {
  const { t } = useTranslation();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { to: '/', label: t('nav.home') },
    { to: '/calendar', label: t('nav.events') },
    { to: '/events/past', label: t('nav.pastEvents') },
    { to: '/about', label: t('nav.about') },
    { to: '/rankings', label: t('nav.rankings') },
    { to: '/watch', label: t('nav.watch') },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-navy-900/80 backdrop-blur-xl border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 shrink-0">
            <img src="/images/logo.svg" alt="Marianas Open" className="h-10 w-10" />
            <div className="hidden sm:block">
              <span className="text-sm font-bold tracking-wider text-text-primary font-heading uppercase">
                Marianas Open
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8">
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

          {/* Language + Mobile Toggle */}
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <button
              className="md:hidden text-text-primary p-1"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Nav */}
      {mobileOpen && (
        <nav className="md:hidden bg-navy-900/95 backdrop-blur-xl border-t border-white/5 px-4 py-4 space-y-1">
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
        </nav>
      )}
    </header>
  );
}
