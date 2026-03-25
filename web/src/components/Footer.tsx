import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, Mail, Youtube, Phone, Globe } from 'lucide-react';
import { YOUTUBE_CHANNEL_URL } from '../lib/seo';
import { useOrg } from '../contexts/OrganizationContext';

const LOGO_FALLBACK = '/images/logos/mo-logo-white.png';

export default function Footer() {
  const { t } = useTranslation();
  const org = useOrg();

  const logoSrc = org.logo_url || LOGO_FALLBACK;

  return (
    <footer className="bg-surface border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={logoSrc} alt={org.name} className="h-12 w-12 object-contain" />
              <span className="font-heading font-bold text-lg uppercase tracking-wider">
                {org.name}
              </span>
            </div>
            <p className="text-text-secondary text-sm max-w-xs">
              {t('footer.tagline')}
            </p>
          </div>

          {/* Social */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-gold-500">
              {t('footer.followUs')}
            </h4>
            <div className="flex gap-4">
              {org.instagram_url && (
                <a
                  href={org.instagram_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-gold-500 transition-colors"
                >
                  <Instagram size={20} />
                </a>
              )}
              {org.facebook_url && (
                <a
                  href={org.facebook_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-gold-500 transition-colors"
                >
                  <Facebook size={20} />
                </a>
              )}
              <a
                href={YOUTUBE_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-gold-500 transition-colors"
              >
                <Youtube size={20} />
              </a>
              {org.website_url && (
                <a
                  href={org.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-text-secondary hover:text-gold-500 transition-colors"
                >
                  <Globe size={20} />
                </a>
              )}
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-gold-500">
              {t('footer.contact')}
            </h4>
            {org.contact_email && (
              <a
                href={`mailto:${org.contact_email}`}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <Mail size={16} />
                {org.contact_email}
              </a>
            )}
            {org.phone && (
              <a
                href={`tel:${org.phone.replace(/[^\d+]/g, '')}`}
                className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              >
                <Phone size={16} />
                {org.phone}
              </a>
            )}
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>&copy; {new Date().getFullYear()} {org.name}. {t('footer.rights')}</p>
          <div className="flex items-center gap-4">
            <Link to="/rules" className="hover:text-text-secondary transition-colors">
              {t('footer.rules')}
            </Link>
            <span className="text-white/10">|</span>
            <Link to="/terms" className="hover:text-text-secondary transition-colors">
              {t('footer.terms')}
            </Link>
            <span className="text-white/10">|</span>
            <a href="https://shimizu-technology.com" target="_blank" rel="noopener noreferrer" className="hover:text-text-secondary transition-colors">{t('footer.builtBy')}</a>
            <span className="text-white/10">|</span>
            <Link to="/admin" className="hover:text-text-secondary transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
