import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'en', flag: '🇺🇸', label: 'English' },
  { code: 'ja', flag: '🇯🇵', label: '日本語' },
  { code: 'ko', flag: '🇰🇷', label: '한국어' },
  { code: 'tl', flag: '🇵🇭', label: 'Filipino' },
  { code: 'zh', flag: '🇨🇳', label: '中文' },
];

export default function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <div className="flex items-center gap-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => i18n.changeLanguage(lang.code)}
          className={`text-xl px-1.5 py-1 rounded transition-all duration-200 hover:bg-white/10 ${
            i18n.language === lang.code
              ? 'bg-white/15 scale-110'
              : 'opacity-60 hover:opacity-100'
          }`}
          title={lang.label}
          aria-label={`Switch to ${lang.label}`}
        >
          {lang.flag}
        </button>
      ))}
    </div>
  );
}
