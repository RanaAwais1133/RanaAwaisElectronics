import { create } from 'zustand';

// ✅ Types
type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  isDark: boolean;
  isLight: boolean;
  isLoading: boolean;
  error: string | null;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

// ✅ Theme display names
export const themeDisplayNames: Record<Theme, string> = {
  light: 'Light',
  dark: 'Dark',
};

// ✅ Theme icons
export const themeIcons: Record<Theme, string> = {
  light: '☀️',
  dark: '🌙',
};

// ✅ Theme colors
export const themeColors: Record<Theme, { bg: string; text: string; border: string }> = {
  light: {
    bg: 'bg-white',
    text: 'text-gray-900',
    border: 'border-gray-200',
  },
  dark: {
    bg: 'bg-gray-900',
    text: 'text-white',
    border: 'border-gray-700',
  },
};

// ✅ Get saved theme with validation
const getSavedTheme = (): Theme => {
  try {
    // Check localStorage
    const saved = localStorage.getItem('theme');
    if (saved === 'light' || saved === 'dark') {
      return saved as Theme;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    
    return 'light';
  } catch {
    return 'light';
  }
};

// ✅ Apply theme to DOM
const applyTheme = (theme: Theme): void => {
  try {
    // Update document class
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(theme);
    document.documentElement.setAttribute('data-theme', theme);
    
    // Update meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      const color = theme === 'dark' ? '#1a1a2e' : '#ffffff';
      metaThemeColor.setAttribute('content', color);
    }
    
    // Update body class
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(`theme-${theme}`);
    
    // Store in localStorage
    localStorage.setItem('theme', theme);
    
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('themeChange', { 
      detail: { theme } 
    }));
  } catch (error) {
    console.error('Failed to apply theme:', error);
  }
};

// ✅ Create store WITHOUT persist middleware to avoid infinite re-render loops
export const useThemeStore = create<ThemeState>()((set, get) => ({
  theme: getSavedTheme(),
  isDark: getSavedTheme() === 'dark',
  isLight: getSavedTheme() === 'light',
  isLoading: false,
  error: null,

  // ✅ Toggle theme
  toggleTheme: () => {
    const { theme } = get();
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
    set({
      theme: next,
      isDark: next === 'dark',
      isLight: next === 'light',
    });
  },

  // ✅ Set theme
  setTheme: (theme: Theme) => {
    const current = get().theme;
    if (current === theme) return;
    
    applyTheme(theme);
    set({
      theme,
      isDark: theme === 'dark',
      isLight: theme === 'light',
    });
  },

  // ✅ Set loading
  setLoading: (loading: boolean) => set({ isLoading: loading }),

  // ✅ Set error
  setError: (error: string | null) => set({ error }),

  // ✅ Clear error
  clearError: () => set({ error: null }),

  // ✅ Reset
  reset: () => {
    const defaultTheme: Theme = 'light';
    applyTheme(defaultTheme);
    set({
      theme: defaultTheme,
      isDark: false,
      isLight: true,
      isLoading: false,
      error: null,
    });
  },
}));

// ✅ Helper hooks
export const useTheme = () => useThemeStore((state) => state.theme);
export const useIsDark = () => useThemeStore((state) => state.isDark);
export const useIsLight = () => useThemeStore((state) => state.isLight);
export const useThemeLoading = () => useThemeStore((state) => state.isLoading);
export const useThemeError = () => useThemeStore((state) => state.error);

// ✅ Utility functions
export const getThemeDisplayName = (theme: Theme): string => {
  return themeDisplayNames[theme] || theme;
};

export const getThemeIcon = (theme: Theme): string => {
  return themeIcons[theme] || '';
};

export const getThemeColors = (theme: Theme) => {
  return themeColors[theme] || themeColors.light;
};

export const getOppositeTheme = (theme: Theme): Theme => {
  return theme === 'light' ? 'dark' : 'light';
};

export const isSystemDark = (): boolean => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

// ✅ Event listener for system theme changes
export const listenToSystemTheme = (callback: (theme: Theme) => void) => {
  if (!window.matchMedia) {
    // Return a noop cleanup function
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    return () => {};
  }
  
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handler = (e: MediaQueryListEvent) => {
    callback(e.matches ? 'dark' : 'light');
  };
  
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
};

// ✅ Event listener for theme changes
export const onThemeChange = (callback: (theme: Theme) => void) => {
  const handler = (event: CustomEvent) => {
    callback(event.detail.theme);
  };
  window.addEventListener('themeChange', handler as EventListener);
  return () => window.removeEventListener('themeChange', handler as EventListener);
};

// ✅ Class name helpers
export const getThemeClass = (isDark: boolean): string => {
  return isDark ? 'dark' : 'light';
};

export const getThemeBgClass = (theme: Theme): string => {
  return themeColors[theme]?.bg || 'bg-white';
};

export const getThemeTextClass = (theme: Theme): string => {
  return themeColors[theme]?.text || 'text-gray-900';
};

export default useThemeStore;
