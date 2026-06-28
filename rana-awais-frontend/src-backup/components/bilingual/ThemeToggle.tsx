import React from 'react';
import { useThemeStore } from '../../store/useThemeStore';

interface ThemeToggleProps {
  className?: string; // ✅ NEW: Custom className support
  showLabel?: boolean; // ✅ NEW: Toggle label visibility
  size?: 'sm' | 'md' | 'lg'; // ✅ NEW: Size variants
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  className = '',
  showLabel = true,
  size = 'md',
}) => {
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  const isLight = theme === 'light';

  // ✅ Size variants
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-2 sm:px-4 sm:py-2 text-sm sm:text-base gap-1.5',
    lg: 'px-4 py-2.5 sm:px-6 sm:py-3 text-base sm:text-lg gap-2',
  };

  const iconSizes = {
    sm: 'w-3 h-3 sm:w-4 sm:h-4',
    md: 'w-4 h-4 sm:w-5 sm:h-5',
    lg: 'w-5 h-5 sm:w-6 sm:h-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        group flex items-center 
        ${sizeClasses[size]}
        bg-gray-700 dark:bg-gray-200 
        text-white dark:text-gray-800 
        rounded-xl 
        hover:bg-gray-800 dark:hover:bg-gray-300 
        focus:outline-none focus:ring-2 focus:ring-gray-400 
        transition-all 
        font-medium 
        shadow-sm
        ${className}
      `}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {isLight ? (
        // Moon icon (dark mode)
        <svg 
          className={`${iconSizes[size]} flex-shrink-0`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
          />
        </svg>
      ) : (
        // Sun icon (light mode)
        <svg 
          className={`${iconSizes[size]} flex-shrink-0`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
          />
        </svg>
      )}
      
      {showLabel && (
        <>
          <span className="hidden sm:inline">
            {isLight ? 'Dark' : 'Light'}
          </span>
          <span className="sm:hidden">
            {isLight ? '🌙' : '☀️'}
          </span>
        </>
      )}
    </button>
  );
};

export default ThemeToggle;