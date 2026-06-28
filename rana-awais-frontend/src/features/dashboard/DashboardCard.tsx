import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'cyan' | 'indigo' | 'orange' | 'teal' | 'pink';
  onClick?: () => void;
  loading?: boolean;
}

const colorMap = {
  blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300', icon: 'bg-blue-100 dark:bg-blue-900/40' },
  emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300', icon: 'bg-emerald-100 dark:bg-emerald-900/40' },
  amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300', icon: 'bg-amber-100 dark:bg-amber-900/40' },
  rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300', icon: 'bg-rose-100 dark:bg-rose-900/40' },
  purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300', icon: 'bg-purple-100 dark:bg-purple-900/40' },
  cyan: { bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-200 dark:border-cyan-800', text: 'text-cyan-700 dark:text-cyan-300', icon: 'bg-cyan-100 dark:bg-cyan-900/40' },
  indigo: { bg: 'bg-indigo-50 dark:bg-indigo-900/20', border: 'border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300', icon: 'bg-indigo-100 dark:bg-indigo-900/40' },
  orange: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-700 dark:text-orange-300', icon: 'bg-orange-100 dark:bg-orange-900/40' },
  teal: { bg: 'bg-teal-50 dark:bg-teal-900/20', border: 'border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300', icon: 'bg-teal-100 dark:bg-teal-900/40' },
  pink: { bg: 'bg-pink-50 dark:bg-pink-900/20', border: 'border-pink-200 dark:border-pink-800', text: 'text-pink-700 dark:text-pink-300', icon: 'bg-pink-100 dark:bg-pink-900/40' },
};

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, subtitle, icon, color, onClick, loading }) => {
  const c = colorMap[color];

  return (
    <button
      onClick={onClick}
      disabled={loading || !onClick}
      className={`${c.bg} ${c.border} border rounded-2xl p-4 sm:p-5 text-start w-full transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98] ${onClick ? 'cursor-pointer' : 'cursor-default'} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`${c.icon} p-2.5 rounded-xl`}>
          {icon}
        </div>
        {loading && (
          <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        )}
      </div>
      <p className={`text-2xl sm:text-3xl font-extrabold ${c.text} mb-1`}>
        {loading ? '—' : value}
      </p>
      <p className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
        {title}
      </p>
      {subtitle && (
        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>
      )}
    </button>
  );
};

export default DashboardCard;
