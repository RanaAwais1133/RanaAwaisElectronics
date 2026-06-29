import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { APP_CONFIG } from '../../config/app';
import DashboardCard from './DashboardCard';
import DashboardModal from './DashboardModal';
import DashboardSummaryModal from './DashboardSummaryModal';

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

interface SummaryModalState {
  title: string;
  type: 'today' | 'pending' | 'month';
}

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [summary, setSummary] = useState<DashboardSummary>({});
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState | null>(null);

  // Quick stats data
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [todayProfit, setTodayProfit] = useState<number | null>(null);
  const [monthRevenue, setMonthRevenue] = useState<number | null>(null);
  const [monthProfit, setMonthProfit] = useState<number | null>(null);
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);

  useEffect(() => {
    document.title = `${t('dashboard')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    // Set a timeout to force loading to false after 8 seconds max
    const forceTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('⚠️ Dashboard loading timeout - forcing display');
        setLoading(false);
      }
    }, 8000);
    
    // Use Promise.allSettled so one failure doesn't block others
    Promise.allSettled([
      api.get('/dashboard/summary'),
      api.get('/accounting/today'),
      api.get('/accounting/month'),
      api.get('/accounting/pending-total'),
    ])
      .then((results) => {
        if (cancelled) return;
        
        const [summaryRes, todayRes, monthRes, pendingRes] = results;
        
        if (summaryRes.status === 'fulfilled') {
          setSummary(summaryRes.value.data || {});
        }
        if (todayRes.status === 'fulfilled') {
          setTodayRevenue(todayRes.value.data.revenue ?? null);
          setTodayProfit(todayRes.value.data.profit ?? null);
        }
        if (monthRes.status === 'fulfilled') {
          setMonthRevenue(monthRes.value.data.revenue ?? null);
          setMonthProfit(monthRes.value.data.profit ?? null);
        }
        if (pendingRes.status === 'fulfilled') {
          setPendingTotal(pendingRes.value.data.pending_total ?? null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          clearTimeout(forceTimeout);
          setLoading(false);
        }
      });
      
    return () => { cancelled = true; };
  }, []);

  const fmt = (val: number | undefined | null): string => {
    if (val == null || val === 0) return 'Rs. 0';
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
  };

  const fmtCount = (val: number | undefined | null): string => {
    if (val == null || val === 0) return '0';
    return val.toLocaleString();
  };

  const openModal = useCallback((title: string, endpoint: string) => {
    setModal({ title, endpoint });
  }, []);

  const openSummaryModal = useCallback((title: string, type: 'today' | 'pending' | 'month') => {
    setSummaryModal({ title, type });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10" dir={isUrdu ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-gray-900 dark:bg-white rounded-xl shadow-lg">
              <svg className="w-5 h-5 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {isUrdu ? 'ڈیش بورڈ' : t('dashboard')}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link to="/installments" className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200 shadow-sm text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {isUrdu ? 'قسطوں کا انتظام' : t('manage_installments')}
          </Link>
          <Link to="/reports" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 border border-gray-200 dark:border-gray-700 shadow-sm text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {isUrdu ? 'رپورٹس' : 'Reports'}
          </Link>
        </div>
      </div>

      {/* TOP 3 SUMMARY CARDS - Quick Stats with Full Details & Print */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gray-900 dark:bg-gray-300 rounded-full" />
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'فوری جائزہ' : 'Quick Overview'}
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Today's Summary */}
          <button
            onClick={() => openSummaryModal(
              isUrdu ? 'آج کا خلاصہ' : "Today's Summary",
              'today'
            )}
            disabled={loading}
            className="relative group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 sm:p-6 text-start w-full transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed active:translate-y-0 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {isUrdu ? 'آج کا خلاصہ' : "Today's Summary"}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'آمدنی' : 'Revenue'}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : fmt(todayRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'منافع' : 'Profit'}</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : fmt(todayProfit)}
                </span>
              </div>
            </div>
          </button>

          {/* Card 2: Pending Summary */}
          <button
            onClick={() => openSummaryModal(
              isUrdu ? 'بقایا جات کا خلاصہ' : 'Pending Summary',
              'pending'
            )}
            disabled={loading}
            className="relative group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 sm:p-6 text-start w-full transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed active:translate-y-0 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {isUrdu ? 'بقایا جات کا خلاصہ' : 'Pending Summary'}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'کل بقایا' : 'Total Pending'}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : fmt(pendingTotal)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'تاخیر شدہ گاہک' : 'Overdue'}</span>
                <span className="text-lg font-bold text-red-600 dark:text-red-400">
                  {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : fmtCount(summary.overdueCustomers)}
                </span>
              </div>
            </div>
          </button>

          {/* Card 3: Monthly Summary */}
          <button
            onClick={() => openSummaryModal(
              isUrdu ? 'ماہانہ خلاصہ' : 'Monthly Summary',
              'month'
            )}
            disabled={loading}
            className="relative group bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 sm:p-6 text-start w-full transition-all duration-200 hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl hover:-translate-y-1 disabled:opacity-60 disabled:cursor-not-allowed active:translate-y-0 active:scale-[0.99]"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
                <svg className="w-6 h-6 text-gray-700 dark:text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              {loading ? (
                <div className="w-5 h-5 border-2 border-gray-300 dark:border-gray-600 border-t-gray-600 dark:border-t-gray-300 rounded-full animate-spin" />
              ) : (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              )}
            </div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {isUrdu ? 'ماہانہ خلاصہ' : 'Monthly Summary'}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'آمدنی' : 'Revenue'}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : fmt(monthRevenue)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'منافع' : 'Profit'}</span>
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : fmt(monthProfit)}
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Row 1: Financial Overview */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gray-900 dark:bg-gray-300 rounded-full" />
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'مالی جائزہ' : 'Financial Overview'}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'آج کی وصولی' : "Today's Collection"}
            value={summary.todayCollection ? fmt(summary.todayCollection.total) : 'Rs. 0'}
            subtitle={summary.todayCollection ? `${summary.todayCollection.count} ${isUrdu ? 'کسٹمرز' : 'customers'}` : undefined}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'آج کی وصولی' : "Today's Collection", '/dashboard/today-due')}
          />
          <DashboardCard
            title={isUrdu ? 'کل بقایا رقم' : 'Total Pending'}
            value={fmt(summary.totalPending)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'بقایا رقم' : 'Pending Amount', '/dashboard/overdue')}
          />
          <DashboardCard
            title={isUrdu ? 'کل ادا شدہ' : 'Total Paid'}
            value={fmt(summary.totalPaid)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ادا شدہ رقم' : 'Paid Amount', '/dashboard/today-due')}
          />
          <DashboardCard
            title={isUrdu ? 'آج کا منافع' : "Today's Profit"}
            value={fmt(summary.todayProfit)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'آج کا منافع' : "Today's Profit", '/dashboard/today-due')}
          />
          <DashboardCard
            title={isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue"}
            value={fmt(summary.monthRevenue)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue", '/dashboard/today-due')}
          />
        </div>
      </div>

      {/* Row 2: Customer Overview */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gray-900 dark:bg-gray-300 rounded-full" />
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'گاہکوں کا جائزہ' : 'Customer Overview'}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'کل گاہک' : 'Total Customers'}
            value={fmtCount(summary.totalCustomers)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            onClick={() => openModal(isUrdu ? 'تمام گاہک' : 'All Customers', '/customers?skip=0&limit=100')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'فعال اقساط' : 'Active Installments'}
            value={fmtCount(summary.activeInstallments)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'فعال اقساط' : 'Active Installments', '/dashboard/overdue')}
          />
          <DashboardCard
            title={isUrdu ? 'مکمل اقساط' : 'Completed Plans'}
            value={fmtCount(summary.completedInstallments)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'مکمل اقساط' : 'Completed Plans', '/dashboard/today-due')}
          />
          <DashboardCard
            title={isUrdu ? 'تاخیر شدہ گاہک' : 'Overdue Customers'}
            value={fmtCount(summary.overdueCustomers)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>}
            onClick={() => openModal(isUrdu ? 'تاخیر شدہ گاہک' : 'Overdue Customers', '/dashboard/overdue')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'آج کی واجب الادا' : "Today's Due"}
            value={fmtCount(summary.todayDue)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            onClick={() => openModal(isUrdu ? 'آج کی واجب الادا' : "Today's Due", '/dashboard/today-due')}
            loading={loading}
          />
        </div>
      </div>

      {/* Row 3: Product & Inventory */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gray-900 dark:bg-gray-300 rounded-full" />
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'پراڈکٹ اور انوینٹری' : 'Product & Inventory'}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'کل پراڈکٹس' : 'Total Products'}
            value={fmtCount(summary.totalProducts)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'تمام پراڈکٹس' : 'All Products', '/products?skip=0&limit=50')}
          />
          <DashboardCard
            title={isUrdu ? 'فعال پلانز' : 'Active Plans'}
            value={fmtCount(summary.activePlans)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'فعال پلانز' : 'Active Plans', '/dashboard/overdue')}
          />
          <DashboardCard
            title={isUrdu ? 'کم اسٹاک' : 'Low Stock Items'}
            value={fmtCount(summary.lowStockItems)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>}
            onClick={() => openModal(isUrdu ? 'کم اسٹاک آئٹمز' : 'Low Stock Items', '/dashboard/low-stock')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'انوینٹری ویلیو' : 'Inventory Value'}
            value={fmt(summary.inventoryValue)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'انوینٹری ویلیو' : 'Inventory Value', '/inventory?limit=50')}
          />
          <DashboardCard
            title={isUrdu ? 'ایجنگ اسٹاک' : 'Ageing Stock'}
            value={fmtCount(summary.ageingStock)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ایجنگ اسٹاک' : 'Ageing Stock', '/inventory/ageing')}
          />
        </div>
      </div>

      {/* Row 4: Monthly Summary */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gray-900 dark:bg-gray-300 rounded-full" />
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'ماہانہ خلاصہ' : 'Monthly Summary'}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue"}
            value={fmt(summary.monthRevenue)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue", '/dashboard/today-due')}
          />
          <DashboardCard
            title={isUrdu ? 'ماہانہ منافع' : "Month's Profit"}
            value={fmt(summary.monthProfit)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ماہانہ منافع' : "Month's Profit", '/dashboard/today-due')}
          />
          <DashboardCard
            title={isUrdu ? 'کل بقایا' : 'Total Pending'}
            value={fmt(summary.totalPending)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'کل بقایا' : 'Total Pending', '/dashboard/overdue')}
          />
          <DashboardCard
            title={isUrdu ? 'کل ادا شدہ' : 'Total Paid'}
            value={fmt(summary.totalPaid)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'کل ادا شدہ' : 'Total Paid', '/dashboard/today-due')}
          />
          <DashboardCard
            title={isUrdu ? 'فعال پلانز' : 'Active Plans'}
            value={fmtCount(summary.activePlans)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'فعال پلانز' : 'Active Plans', '/dashboard/overdue')}
          />
        </div>
      </div>

      {/* Modals */}
      {modal && (
        <DashboardModal
          title={modal.title}
          endpoint={modal.endpoint}
          onClose={() => setModal(null)}
          isUrdu={isUrdu}
        />
      )}
      {summaryModal && (
        <DashboardSummaryModal
          title={summaryModal.title}
          type={summaryModal.type}
          onClose={() => setSummaryModal(null)}
          isUrdu={isUrdu}
        />
      )}
    </div>
  );
};

export default DashboardPage;
