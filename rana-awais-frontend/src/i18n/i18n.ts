import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en/translation.json';
import ur from './locales/ur/translation.json';

// ✅ Get saved language from localStorage (multiple possible keys)
const getSavedLanguage = (): string | null => {
  const keys = ['i18nextLng', 'language', 'lang'];
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value === 'en' || value === 'ur') {
      return value;
    }
  }
  return null;
};

// ✅ Get browser language as fallback
const getBrowserLanguage = (): string => {
  const browserLang = navigator.language?.split('-')[0] || 'ur';
  return browserLang === 'en' || browserLang === 'ur' ? browserLang : 'ur';
};

// ✅ Get default language
const getDefaultLanguage = (): string => {
  // 1. Check localStorage
  const saved = getSavedLanguage();
  if (saved) return saved;
  
  // 2. Check browser language
  const browser = getBrowserLanguage();
  if (browser === 'en' || browser === 'ur') return browser;
  
  // 3. Default to Urdu
  return 'ur';
};

// ✅ Resources type for better TypeScript support
export const resources = {
  en: { translation: en },
  ur: { translation: ur },
} as const;

// ✅ Supported languages
export const supportedLanguages = ['en', 'ur'] as const;
export type SupportedLanguage = typeof supportedLanguages[number];

// ✅ Language names for display
export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  ur: 'اردو',
};

// ✅ Initialize i18n
const defaultLang = getDefaultLanguage();

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    lng: defaultLang,
    fallbackLng: 'ur',
    supportedLngs: ['en', 'ur'],
    
    // ✅ Detection options
    detection: {
      order: ['localStorage', 'cookie', 'querystring', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
      lookupQuerystring: 'lang',
      lookupCookie: 'i18nextLng',
      cookieMinutes: 525600, // 1 year
    },
    
    // ✅ Interpolation
    interpolation: {
      escapeValue: false,
    },
    
    // ✅ React options
    react: {
      useSuspense: true,
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'b', 'i', 'p'],
    },
  });

// ✅ Change language helper
export const changeLanguage = async (lang: SupportedLanguage): Promise<void> => {
  if (!supportedLanguages.includes(lang)) {
    console.warn(`Language "${lang}" is not supported. Falling back to Urdu.`);
    lang = 'ur';
  }
  
  try {
    await i18n.changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    localStorage.setItem('language', lang);
    
    // ✅ Update document direction
    const dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
    
    // ✅ Update HTML lang attribute
    document.documentElement.setAttribute('lang', lang);
    
    // ✅ Update body class for RTL
    if (lang === 'ur') {
      document.documentElement.classList.add('rtl');
      document.documentElement.classList.remove('ltr');
    } else {
      document.documentElement.classList.add('ltr');
      document.documentElement.classList.remove('rtl');
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('Failed to change language:', error);
    return Promise.reject(error);
  }
};

// ✅ Get current language
export const getCurrentLanguage = (): SupportedLanguage => {
  const lang = i18n.language || defaultLang;
  return supportedLanguages.includes(lang as SupportedLanguage) 
    ? lang as SupportedLanguage 
    : 'ur';
};

// ✅ Check if current language is Urdu
export const isUrdu = (): boolean => getCurrentLanguage() === 'ur';

// ✅ Check if current language is English
export const isEnglish = (): boolean => getCurrentLanguage() === 'en';

// ✅ Get language display name
export const getLanguageName = (lang: SupportedLanguage): string => {
  return languageNames[lang] || lang;
};

// ✅ Get current language display name
export const getCurrentLanguageName = (): string => {
  return getLanguageName(getCurrentLanguage());
};

// ✅ Toggle language helper
export const toggleLanguage = async (): Promise<void> => {
  const current = getCurrentLanguage();
  const next = current === 'en' ? 'ur' : 'en';
  await changeLanguage(next);
};

export default i18n;