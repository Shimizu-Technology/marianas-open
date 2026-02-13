import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, X } from 'lucide-react';

const languageNames: Record<string, string> = {
  en: 'English',
  ja: '日本語',
  ko: '한국어',
  tl: 'Tagalog',
  zh: '中文',
};

export default function QRShare() {
  const { t, i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
  const langName = languageNames[i18n.language] || i18n.language;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="w-9 h-9 rounded-full bg-navy-800 border border-white/10 flex items-center justify-center text-text-secondary hover:text-gold-500 hover:border-gold-500/50 transition-all duration-200"
        title={t('share.qrTitle')}
      >
        <QrCode size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={shouldReduceMotion ? {} : { scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-navy-800 border border-white/10 p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg uppercase tracking-wider">
                  {t('share.qrTitle')}
                </h3>
                <button
                  onClick={() => setOpen(false)}
                  className="text-text-muted hover:text-text-primary transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="bg-white p-4 rounded-lg inline-block mx-auto">
                <QRCodeSVG
                  value={currentUrl}
                  size={200}
                  bgColor="#ffffff"
                  fgColor="#0a0a0b"
                  level="M"
                />
              </div>

              <p className="text-text-secondary text-sm">
                {t('share.scanToView', { language: langName })}
              </p>

              <p className="text-text-muted text-xs break-all">{currentUrl}</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
