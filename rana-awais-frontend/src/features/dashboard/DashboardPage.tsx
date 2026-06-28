import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { APP_CONFIG } from '../../config/app';
import DashboardCard from './DashboardCard';
import DashboardModal from './DashboardModal';

interface DashboardSummary {
  todayCollection?: { total: number; count: number };
  totalPending?: number;
  totalPaid?: number;
  totalCustomers?: number;
  activeInstallments?: number;
  completedInstallments?: number;
  overdueCustomers?: number;
  todayDue?: number;
  totalProducts?: number;
  lowStockItems?: number;
  inventoryValue?: number;
  ageingStock?: number;
  todayProfit?: number;
  monthRevenue?: number;
  monthProfit?: number;
  activePlans?: number;
}

interface ModalState {
  title: string;
  endpoint: string;
}

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [summary, setSummary] = useState<DashboardSummary>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);

  useEffect(() => {
    document.title = `${t('dashboard')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  useEffect(() => {
    setLoading(true);
    api.get('/dashboard/summary')
      .then(res => {
        setSummary(res.data || {});
      })
      .catch(() => {
        // Silent fail - use empty data
      })
      .finally(() => setLoading(false));
  }, []);

  const fmt = (val: number | undefined | null): string => {
    if (val == null) return '—';
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const fmtCount = (val: number | undefined | null): string => {
    if (val == null) return '—';
    return val.toLocaleString();
  };

  const openModal = useCallback((title: string, endpoint: string) => {
    setModal({ title, endpoint });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10" dir={isUrdu ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {isUrdu ? 'ڈیش بورڈ' : t('dashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
              weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/installments" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            {isUrdu ? 'قسطوں کا انتظام' : t('manage_installments')}
          </Link>
          <Link to="/reports" className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium">
            {isUrdu ? 'رپورٹس' : 'Reports'}
          </Link>
        </div>
      </div>

      {/* Row 1: Financial Overview */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {isUrdu ? 'مالی جائزہ' : 'Financial Overview'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'آج کی وصولی' : "Today's Collection"}
            value={summary.todayCollection ? fmt(summary.todayCollection.total) : '—'}
            subtitle={summary.todayCollection ? `${summary.todayCollection.count} ${isUrdu ? 'کسٹمرز' : 'customers'}` : undefined}
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="blue"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'کل بقایا رقم' : 'Total Pending'}
            value={fmt(summary.totalPending)}
            icon={<svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="amber"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'کل ادا شدہ' : 'Total Paid'}
            value={fmt(summary.totalPaid)}
            icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="emerald"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'آج کا منافع' : "Today's Profit"}
            value={fmt(summary.todayProfit)}
            icon={<svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            color="teal"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue"}
            value={fmt(summary.monthRevenue)}
            icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            color="purple"
            loading={loading}
          />
        </div>
      </div>

      {/* Row 2: Customer Overview */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {isUrdu ? 'گاہکوں کا جائزہ' : 'Customer Overview'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'کل گاہک' : 'Total Customers'}
            value={fmtCount(summary.totalCustomers)}
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            color="blue"
            onClick={() => openModal(isUrdu ? 'تمام گاہک' : 'All Customers', '/customers?skip=0&limit=100')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'فعال اقساط' : 'Active Installments'}
            value={fmtCount(summary.activeInstallments)}
            icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            color="emerald"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'مکمل اقساط' : 'Completed Plans'}
            value={fmtCount(summary.completedInstallments)}
            icon={<svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="cyan"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'تاخیر شدہ گاہک' : 'Overdue Customers'}
            value={fmtCount(summary.overdueCustomers)}
            icon={<svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
            color="rose"
            onClick={() => openModal(isUrdu ? 'تاخیر شدہ گاہک' : 'Overdue Customers', '/dashboard/overdue')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'آج کی واجب الادا' : "Today's Due"}
            value={fmtCount(summary.todayDue)}
            icon={<svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            color="orange"
            onClick={() => openModal(isUrdu ? 'آج کی واجب الادا' : "Today's Due", '/dashboard/today-due')}
            loading={loading}
          />
        </div>
      </div>

      {/* Row 3: Product & Inventory */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {isUrdu ? 'پراڈکٹ اور انوینٹری' : 'Product & Inventory'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'کل پراڈکٹس' : 'Total Products'}
            value={fmtCount(summary.totalProducts)}
            icon={<svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            color="indigo"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'فعال پلانز' : 'Active Plans'}
            value={fmtCount(summary.activePlans)}
            icon={<svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            color="blue"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'کم اسٹاک' : 'Low Stock Items'}
            value={fmtCount(summary.lowStockItems)}
            icon={<svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
            color="rose"
            onClick={() => openModal(isUrdu ? 'کم اسٹاک آئٹمز' : 'Low Stock Items', '/dashboard/low-stock')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'انوینٹری ویلیو' : 'Inventory Value'}
            value={fmt(summary.inventoryValue)}
            icon={<svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            color="emerald"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'پرانا اسٹاک' : 'Ageing Stock'}
            value={fmtCount(summary.ageingStock)}
            icon={<svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            color="amber"
            loading={loading}
          />
        </div>
      </div>

      {/* Row 4: Monthly Summary */}
      <div className="mb-6">
        <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
          {isUrdu ? 'ماہانہ خلاصہ' : 'Monthly Summary'}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'ماہانہ منافع' : "Month's Profit"}
            value={fmt(summary.monthProfit)}
            icon={<svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>}
            color="pink"
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'کل منصوبے' : 'Total Plans'}
            value={fmtCount((summary.activeInstallments || 0) + (summary.completedInstallments || 0))}
            icon={<svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
            color="purple"
            loading={loading}
          />
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <DashboardModal
          title={modal.title}
          endpoint={modal.endpoint}
          onClose={() => setModal(null)}
          isUrdu={isUrdu}
        />
      )}
    </div>
  );
};

export default DashboardPage;
