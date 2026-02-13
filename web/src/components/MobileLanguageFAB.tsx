import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Globe, X } from 'lucide-react';

const languages = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'tl', flag: '🇵🇭', label: 'Filipino' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

export default function MobileLanguageFAB() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <div className="md:hidden fixed bottom-6 right-4 z-50">
      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />

            {/* Language options */}
            <motion.div
              className="absolute bottom-16 right-0 mb-2 flex flex-col gap-2 items-end"
              initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.2 }}
            >
              {languages.map((lang, i) => (
                <motion.button
                  key={lang.code}
                  onClick={() => {
                    i18n.changeLanguage(lang.code);
                    setOpen(false);
                  }}
                  initial={shouldReduceMotion ? {} : { opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-full border transition-all duration-200 ${
                    i18n.language === lang.code
                      ? 'bg-gold-500/20 border-gold-500/40 text-gold-400'
                      : 'bg-navy-800/95 border-white/10 text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <span className="text-sm font-heading font-medium tracking-wide">
                    {lang.label}
                  </span>
                  <span className="text-2xl leading-none">{lang.flag}</span>
                </motion.button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* FAB button */}
      <motion.button
        onClick={() => setOpen(!open)}
        className="relative w-14 h-14 rounded-full bg-gold-500 text-navy-900 shadow-lg shadow-gold-500/25 flex items-center justify-center"
        whileTap={{ scale: 0.9 }}
        animate={
          !open && !shouldReduceMotion
            ? { scale: [1, 1.08, 1] }
            : {}
        }
        transition={
          !open
            ? { repeat: Infinity, duration: 2, repeatDelay: 3 }
            : {}
        }
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <X size={22} strokeWidth={2.5} />
            </motion.div>
          ) : (
            <motion.div
              key="globe"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center justify-center"
            >
              <Globe size={22} strokeWidth={2.5} />
              <span className="absolute -top-1 -right-1 text-xs w-5 h-5 rounded-full bg-navy-900 text-gold-500 font-bold flex items-center justify-center border border-gold-500/40">
                {currentLang.flag}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
