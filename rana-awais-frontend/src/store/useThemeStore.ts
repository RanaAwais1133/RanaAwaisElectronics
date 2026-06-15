import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
}

// ✅ localStorage se saved theme uthao
const getSavedTheme = (): Theme => {
  const saved = localStorage.getItem('theme');
  return saved === 'light' || saved === 'dark' ? saved : 'light';
};

export const useThemeStore = create<ThemeState>((set) => ({
  theme: getSavedTheme(),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      document.documentElement.className = next;
      return { theme: next };
    }),
}));