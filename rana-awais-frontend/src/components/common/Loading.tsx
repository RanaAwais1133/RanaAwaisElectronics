import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
  size?: 'sm' | 'md' | 'lg'; // ✅ NEW: Size variants
  overlay?: boolean; // ✅ NEW: Overlay mode
}

const Loading: React.FC<LoadingProps> = ({ 
  message, 
  fullScreen = true,
  size = 'md',
  overlay = false,
}) => {
  const { t } = useTranslation();
  const text = message || t('loading');

  // ✅ Size variants for spinner
  const spinnerSizes = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-4',
    lg: 'w-14 h-14 border-4',
  };

  // ✅ Size variants for text
  const textSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  const containerClasses = fullScreen 
    ? 'fixed inset-0 z-50' 
    : overlay 
      ? 'absolute inset-0 z-10' 
      : 'py-16';

  return (
    <div
      className={`
        flex flex-col items-center justify-center 
        bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm
        ${containerClasses}
      `}
    >
      <div 
        className={`
          spinner 
          ${spinnerSizes[size]}
          border-t-transparent 
          border-blue-600 dark:border-blue-400 
          rounded-full 
          animate-spin
        `}
      ></div>
      <p className={`mt-4 text-gray-600 dark:text-gray-300 font-medium ${textSizes[size]}`}>
        {text}
      </p>
      {/* ✅ Small loading dots animation */}
      <div className="flex gap-1 mt-2">
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
      </div>
    </div>
  );
};

export default Loading;