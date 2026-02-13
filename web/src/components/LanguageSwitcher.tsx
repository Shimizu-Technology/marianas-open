import { useTranslation } from 'react-i18next';
import { flagComponents } from './flags';

const languages = [
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'tl', label: 'Filipino' },
  { code: 'zh', label: '中文' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => {
        const Flag = flagComponents[lang.code];
        return (
          <button
            key={lang.code}
            onClick={() => i18n.changeLanguage(lang.code)}
            className={`px-1.5 py-1.5 rounded transition-all duration-200 hover:bg-white/10 flex items-center justify-center ${
              i18n.language === lang.code
                ? 'bg-white/15 scale-110'
                : 'opacity-60 hover:opacity-100'
            }`}
            title={lang.label}
            aria-label={`Switch to ${lang.label}`}
          >
            {Flag && <Flag className="w-6 h-[18px]" />}
          </button>
        );
      })}
    </div>
  );
}
