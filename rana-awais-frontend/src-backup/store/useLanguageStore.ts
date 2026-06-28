import { create } from 'zustand';
import i18n, { changeLanguage, getCurrentLanguage, supportedLanguages, type SupportedLanguage } from '../i18n/i18n';

// ✅ Types
interface LanguageState {
  language: SupportedLanguage;
  isRTL: boolean;
  isLoading: boolean;
  error: string | null;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  toggleLanguage: () => Promise<void>;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ✅ Language display names
export const languageDisplayNames: Record<SupportedLanguage, string> = {
  en: 'English',
  ur: 'اردو',
};

// ✅ Language directions
export const languageDirections: Record<SupportedLanguage, 'ltr' | 'rtl'> = {
  en: 'ltr',
  ur: 'rtl',
};

// ✅ Get saved language with validation
const getSavedLanguage = (): SupportedLanguage => {
  try {
    // Check multiple storage keys
    const keys = ['i18nextLng', 'language', 'lang'];
    for (const key of keys) {
      const saved = localStorage.getItem(key);
      if (saved === 'en' || saved === 'ur') {
        return saved as SupportedLanguage;
      }
    }
    // Check browser language
    const browserLang = navigator.language?.split('-')[0] || 'ur';
    if (browserLang === 'en' || browserLang === 'ur') {
      return browserLang as SupportedLanguage;
    }
    return 'ur';
  } catch {
    return 'ur';
  }
};

// ✅ Create store WITHOUT persist middleware to avoid infinite re-render loops
export const useLanguageStore = create<LanguageState>()((set, get) => ({
  language: getSavedLanguage(),
  isRTL: getSavedLanguage() === 'ur',
  isLoading: false,
  error: null,

  // ✅ Set language
  setLanguage: async (lang: SupportedLanguage) => {
    const currentLang = get().language;
    if (currentLang === lang) return;

    set({ isLoading: true, error: null });

    try {
      await changeLanguage(lang);
      
      // Update document
      const isRTL = lang === 'ur';
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      document.documentElement.classList.remove('rtl', 'ltr');
      document.documentElement.classList.add(isRTL ? 'rtl' : 'ltr');

      // Update body class
      document.body.classList.remove('lang-en', 'lang-ur');
      document.body.classList.add(`lang-${lang}`);

      // Update meta tags
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const desc = lang === 'ur' 
          ? 'رانا اویس الیکٹرانکس - قسطوں کا مکمل نظام' 
          : 'Rana Awais Electronics - Complete Installment Management System';
        metaDesc.setAttribute('content', desc);
      }

      // Update html lang
      document.documentElement.setAttribute('lang', lang);

      // Store in multiple locations for compatibility
      localStorage.setItem('i18nextLng', lang);
      localStorage.setItem('language', lang);
      localStorage.setItem('lang', lang);

      set({
        language: lang,
        isRTL,
        isLoading: false,
        error: null,
      });

      // Dispatch custom event for language change
      window.dispatchEvent(new CustomEvent('languageChange', { 
        detail: { language: lang, isRTL } 
      }));

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Failed to change language';
      set({
        isLoading: false,
        error: errorMsg,
      });
      console.error('Language change failed:', error);
    }
  },

  // ✅ Toggle language
  toggleLanguage: async () => {
    const current = get().language;
    const next: SupportedLanguage = current === 'en' ? 'ur' : 'en';
    await get().setLanguage(next);
  },

  // ✅ Set loading
  setIsLoading: (loading: boolean) => set({ isLoading: loading }),

  // ✅ Set error
  setError: (error: string | null) => set({ error }),

  // ✅ Clear error
  clearError: () => set({ error: null }),

  // ✅ Reset
  reset: () => {
    const defaultLang: SupportedLanguage = 'ur';
    set({
      language: defaultLang,
      isRTL: true,
      isLoading: false,
      error: null,
    });
    localStorage.setItem('i18nextLng', defaultLang);
    localStorage.setItem('language', defaultLang);
    localStorage.setItem('lang', defaultLang);
    document.documentElement.dir = 'rtl';
    document.documentElement.lang = defaultLang;
  },
}));

// ✅ Helper hooks
export const useLanguage = () => useLanguageStore((state) => state.language);
export const useIsRTL = () => useLanguageStore((state) => state.isRTL);
export const useIsUrdu = () => useLanguageStore((state) => state.language === 'ur');
export const useIsEnglish = () => useLanguageStore((state) => state.language === 'en');
export const useLanguageLoading = () => useLanguageStore((state) => state.isLoading);
export const useLanguageError = () => useLanguageStore((state) => state.error);

// ✅ Utility functions
export const getLanguageDisplayName = (lang: SupportedLanguage): string => {
  return languageDisplayNames[lang] || lang;
};

export const getCurrentLanguageDisplayName = (): string => {
  const lang = getSavedLanguage();
  return getLanguageDisplayName(lang);
};

export const isLanguageRTL = (lang: SupportedLanguage): boolean => {
  return languageDirections[lang] === 'rtl';
};

export const getLanguageDirection = (lang: SupportedLanguage): 'ltr' | 'rtl' => {
  return languageDirections[lang] || 'ltr';
};

// ✅ Class names for RTL support
export const getRTLClass = (isRTL: boolean): string => {
  return isRTL ? 'rtl' : 'ltr';
};

export const getTextAlignClass = (isRTL: boolean): string => {
  return isRTL ? 'text-right' : 'text-left';
};

// ✅ Event listener for language changes
export const onLanguageChange = (callback: (lang: SupportedLanguage, isRTL: boolean) => void) => {
  const handler = (event: CustomEvent) => {
    callback(event.detail.language, event.detail.isRTL);
  };
  window.addEventListener('languageChange', handler as EventListener);
  return () => window.removeEventListener('languageChange', handler as EventListener);
};

export default useLanguageStore;
