import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  onClick?: () => void;
  loading?: boolean;
  badge?: string | number; // optional badge (e.g., "New", "5")
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  subtitle, 
  icon, 
  onClick, 
  loading,
  badge 
}) => {
  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={loading || !isClickable}
      aria-label={isClickable ? `${title} - ${value}` : title}
      className={`
        relative group
        bg-white dark:bg-gray-800
        border border-gray-200 dark:border-gray-700
        rounded-xl p-4 sm:p-5 text-start w-full
        transition-all duration-200 ease-out
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 dark:focus-visible:ring-gray-500 focus-visible:ring-offset-2
        ${isClickable ? 'cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-lg hover:-translate-y-0.5' : 'cursor-default'}
        disabled:opacity-60 disabled:cursor-not-allowed
        active:translate-y-0 active:scale-[0.99]
      `}
    >
      {/* Badge (optional) */}
      {badge && !loading && (
        <div className="absolute -top-1 -right-1 z-20">
          <span className="inline-flex items-center justify-center px-2 py-0.5 text-[10px] font-bold leading-none text-white bg-gray-900 dark:bg-white dark:text-gray-900 rounded-full shadow-sm">
            {badge}
          </span>
        </div>
      )}

      {/* Content */}
      <div className="relative z-10">
        {/* Top row: Icon + Loading/Arrow indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="p-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl transition-transform duration-200 group-hover:scale-105">
            <span className="text-gray-600 dark:text-gray-300">{icon}</span>
          </div>
          {loading ? (
            <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
          ) : isClickable ? (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </div>
          ) : null}
        </div>

        {/* Value */}
        <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1 tracking-tight">
          {loading ? (
            <span className="inline-block w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          ) : value}
        </p>

        {/* Title */}
        <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 leading-tight">
          {loading ? (
            <span className="inline-block w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mt-1" />
          ) : title}
        </p>

        {/* Subtitle */}
        {subtitle && !loading && (
          <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {subtitle}
          </p>
        )}
      </div>
    </button>
  );
};

export default DashboardCard;