import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { APP_CONFIG } from '../../config/app';
import CustomerReport from './CustomerReport';
import ProfitLossReport from './ProfitLossReport';

type ReportTab = 'daily' | 'profit-loss' | 'customer' | 'inventory' | 'pending';

const ReportsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [activeTab, setActiveTab] = useState<ReportTab>('daily');

  useEffect(() => {
    document.title = `${t('reports')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  const tabs: { key: ReportTab; label: string; icon: string }[] = [
    { key: 'daily', label: isUrdu ? 'یومیہ رپورٹ' : 'Daily Report', icon: '📅' },
    { key: 'profit-loss', label: isUrdu ? 'منافع اور نقصان' : 'Profit & Loss', icon: '📊' },
    { key: 'customer', label: isUrdu ? 'گاہک رپورٹ' : 'Customer Report', icon: '👥' },
    { key: 'inventory', label: isUrdu ? 'انوینٹری رپورٹ' : 'Inventory Report', icon: '📦' },
    { key: 'pending', label: isUrdu ? 'زیر التواء رپورٹ' : 'Pending Report', icon: '⏳' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
          {isUrdu ? 'رپورٹس' : t('reports')}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {isUrdu ? 'تمام رپورٹس دیکھیں اور پرنٹ کریں' : 'View and print all reports'}
        </p>
      </div>

      {/* Tab Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/30'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Report Content */}
      <div>
        {activeTab === 'daily' && <CustomerReport />}
        {activeTab === 'profit-loss' && <ProfitLossReport />}
        {activeTab === 'customer' && <CustomerReport />}
        {activeTab === 'inventory' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 text-center">
            <div className="text-5xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {isUrdu ? 'انوینٹری رپورٹ' : 'Inventory Report'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isUrdu ? 'انوینٹری رپورٹ کے لیے انوینٹری سیکشن پر جائیں' : 'Go to Inventory section for inventory reports'}
            </p>
          </div>
        )}
        {activeTab === 'pending' && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 text-center">
            <div className="text-5xl mb-4">⏳</div>
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              {isUrdu ? 'زیر التواء رپورٹ' : 'Pending Report'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {isUrdu ? 'زیر التواء رپورٹ کے لیے ڈیش بورڈ دیکھیں' : 'Check Dashboard for pending details'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
