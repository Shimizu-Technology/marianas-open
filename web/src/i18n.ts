import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import tl from './locales/tl.json';
import zh from './locales/zh.json';
import pt from './locales/pt.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ja: { translation: ja },
      ko: { translation: ko },
      tl: { translation: tl },
      zh: { translation: zh },
      pt: { translation: pt },
    },
    supportedLngs: ['en', 'ja', 'ko', 'tl', 'zh', 'pt'],
    fallbackLng: 'en',
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
    interpolation: { escapeValue: false },
  });

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.language || 'en';
  i18n.on('languageChanged', (lng) => {
    document.documentElement.lang = lng;
  });
}

export default i18n;
