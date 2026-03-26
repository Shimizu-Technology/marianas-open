import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { flagComponents } from './flags';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'tl', label: 'Filipino' },
  { code: 'zh', label: '中文' },
  { code: 'pt', label: 'Português' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = languages.find((l) => l.code === i18n.language) || languages[0];
  const CurrentFlag = flagComponents[current.code];

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        aria-label={`Language: ${current.label}`}
      >
        {CurrentFlag && <CurrentFlag className="w-6 h-[18px]" />}
        <ChevronDown className={`w-3.5 h-3.5 text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 bg-navy-900/95 backdrop-blur-xl border border-white/10 rounded-lg shadow-xl py-1 min-w-[160px] z-50">
          {languages.map((lang) => {
            const Flag = flagComponents[lang.code];
            const isActive = i18n.language === lang.code;
            return (
              <button
                key={lang.code}
                onClick={() => { i18n.changeLanguage(lang.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors ${
                  isActive
                    ? 'text-gold bg-white/5'
                    : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
                }`}
              >
                {Flag && <Flag className="w-5 h-[15px]" />}
                <span>{lang.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
