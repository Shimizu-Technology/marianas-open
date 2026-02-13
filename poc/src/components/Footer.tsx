import { useTranslation } from 'react-i18next';
import { Instagram, Facebook, Mail } from 'lucide-react';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="bg-surface border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/images/logo.png" alt="Marianas Open" className="h-12 w-12" />
              <span className="font-heading font-bold text-lg uppercase tracking-wider">
                Marianas Open
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
              <a
                href="https://instagram.com/themarianasopen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-gold-500 transition-colors"
              >
                <Instagram size={20} />
              </a>
              <a
                href="https://facebook.com/marianasopen"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-secondary hover:text-gold-500 transition-colors"
              >
                <Facebook size={20} />
              </a>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-heading font-semibold text-sm uppercase tracking-wider text-gold-500">
              {t('footer.contact')}
            </h4>
            <a
              href="mailto:steveshimizu@outlook.com"
              className="flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              <Mail size={16} />
              steveshimizu@outlook.com
            </a>
            <p className="text-sm text-text-secondary">(671) 777-9044</p>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-text-muted">
          <p>&copy; 2026 Marianas Open. {t('footer.rights')}</p>
          <p>{t('footer.builtBy')}</p>
        </div>
      </div>
    </footer>
  );
}
