import { create } from 'zustand';
import i18n from '../i18n/i18n';

interface LanguageState {
  language: string;
  setLanguage: (lang: string) => void;
}

const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('i18nextLng') || localStorage.getItem('language');
  return saved === 'en' || saved === 'ur' ? saved : 'ur';
};

export const useLanguageStore = create<LanguageState>((set) => ({
  language: getSavedLanguage(),
  setLanguage: (lang) => {
    (i18n as any).changeLanguage(lang);
    localStorage.setItem('i18nextLng', lang);
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    set({ language: lang });
  },
}));