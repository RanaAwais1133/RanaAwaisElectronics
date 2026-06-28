import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../../store/useLanguageStore';

interface LanguageToggleProps {
  className?: string; // ✅ NEW: Custom className support
  showLabel?: boolean; // ✅ NEW: Toggle label visibility
  size?: 'sm' | 'md' | 'lg'; // ✅ NEW: Size variants
}

const LanguageToggle: React.FC<LanguageToggleProps> = ({
  className = '',
  showLabel = true,
  size = 'md',
}) => {
  const { i18n } = useTranslation();
  const language = useLanguageStore((s) => s.language);
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const currentLang = language || i18n.language || 'en';
  const isEnglish = currentLang === 'en';

  const toggle = () => {
    const next = isEnglish ? 'ur' : 'en';
    setLanguage(next);
    i18n.changeLanguage(next);
  };

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
      onClick={toggle}
      className={`
        group flex items-center 
        ${sizeClasses[size]}
        bg-blue-600 dark:bg-blue-700 
        text-white 
        rounded-xl 
        hover:bg-blue-700 dark:hover:bg-blue-600 
        focus:outline-none focus:ring-2 focus:ring-blue-400 
        transition-all 
        font-medium 
        shadow-sm
        ${className}
      `}
      aria-label={isEnglish ? 'Switch to Urdu' : 'Switch to English'}
      title={isEnglish ? 'Switch to Urdu' : 'Switch to English'}
    >
      {/* Globe icon */}
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
          d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
        />
      </svg>
      
      {showLabel && (
        <>
          <span className="hidden sm:inline">
            {isEnglish ? 'اردو' : 'English'}
          </span>
          <span className="sm:hidden">
            {isEnglish ? 'UR' : 'EN'}
          </span>
        </>
      )}
    </button>
  );
};

export default LanguageToggle;