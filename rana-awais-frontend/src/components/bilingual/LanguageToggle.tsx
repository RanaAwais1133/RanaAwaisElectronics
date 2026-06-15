import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLanguageStore } from '../../store/useLanguageStore';

const LanguageToggle: React.FC = () => {
  const { i18n } = useTranslation();
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  const toggle = () => {
    const next = i18n.language === 'en' ? 'ur' : 'en';
    setLanguage(next);
  };

  const isEnglish = i18n.language === 'en';

  return (
    <button
      onClick={toggle}
      className="group flex items-center gap-1.5 px-3 py-2 sm:px-4 sm:py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-xl hover:bg-blue-700 dark:hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-sm sm:text-base font-medium shadow-sm"
      aria-label={isEnglish ? 'Switch to Urdu' : 'Switch to English'}
      title={isEnglish ? 'Switch to Urdu' : 'Switch to English'}
    >
      {/* Globe icon */}
      <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="hidden sm:inline">
        {isEnglish ? 'اردو' : 'English'}
      </span>
      <span className="sm:hidden">
        {isEnglish ? 'UR' : 'EN'}
      </span>
    </button>
  );
};

export default LanguageToggle;
