import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingProps {
  message?: string;
  fullScreen?: boolean;
}

const Loading: React.FC<LoadingProps> = ({ message, fullScreen = true }) => {
  const { t } = useTranslation();
  const text = message || t('loading');

  return (
    <div
      className={`flex flex-col items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm ${
        fullScreen ? 'fixed inset-0 z-50' : 'py-16'
      }`}
    >
      <div className="spinner"></div>
      <p className="mt-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{text}</p>
    </div>
  );
};

export default Loading;