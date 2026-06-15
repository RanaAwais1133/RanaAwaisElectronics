import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/translation.json';
import ur from './locales/ur/translation.json';

// ✅ localStorage se saved language uthao, warna default 'ur'
const savedLang = localStorage.getItem('i18nextLng') || localStorage.getItem('language');
const defaultLang = (savedLang === 'en' || savedLang === 'ur') ? savedLang : 'ur';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ur: { translation: ur },
    },
    lng: defaultLang,
    fallbackLng: 'ur',
    detection: {
      order: ['localStorage', 'cookie', 'querystring', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;