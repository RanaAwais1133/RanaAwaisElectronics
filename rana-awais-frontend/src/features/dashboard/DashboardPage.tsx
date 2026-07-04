import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import api from '../../utils/api';
import { getTodayInstallments } from '../../utils/api';
import { APP_CONFIG } from '../../config/app';
import DashboardCard from './DashboardCard';
import DashboardModal from './DashboardModal';
import DashboardSummaryModal from './DashboardSummaryModal';

// Lazy load InstallmentDetailTable for faster initial render
const InstallmentDetailTable = lazy(() => import('./InstallmentDetailTable'));

// LocalStorage cache helpers
const LS_CACHE_KEY = 'dashboard_summary_cache';
const LS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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
  todayRevenue?: number;
  pendingTotal?: number;
  monthlyDueCount?: number;
}

interface TodayInstallment {
  plan_id: string;
  customer_id: string;
  customer_name: string;
  customer_urdu: string;
  father_name: string;
  phone: string;
  cnic: string;
  address: string;
  address_urdu: string;
  product_name: string;
  installment_no: number;
  due_date: string;
  amount: number;
  fine: number;
  is_overdue: boolean;
  total_installments: number;
  paid_count: number;
  remaining: number;
}

interface ModalState {
  title: string;
  endpoint: string;
}

interface SummaryModalState {
  title: string;
  type: 'today' | 'pending' | 'month';
}

// Skeleton loader component for instant display
const DashboardSkeleton: React.FC<{ isUrdu: boolean }> = ({ isUrdu }) => (
  <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
    {/* Header skeleton */}
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div>
          <div className="w-40 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
          <div className="w-56 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>

    {/* Quick Overview skeleton */}
    <div className="mb-8">
      <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 sm:p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
            <div className="w-28 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-3" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
              <div className="flex justify-between">
                <div className="w-16 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                <div className="w-20 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Cards skeleton */}
    {[1, 2, 3].map(row => (
      <div key={row} className="mb-8">
        <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map(card => (
            <div key={card} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
                <div className="flex-1">
                  <div className="w-20 h-3 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
                  <div className="w-16 h-5 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

// TodayInstallmentsCard - Shows unpaid installments due today or overdue
const TodayInstallmentsCard: React.FC<{ isUrdu: boolean }> = ({ isUrdu }) => {
  const [installments, setInstallments] = useState<TodayInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    getTodayInstallments()
      .then((data: any) => {
        const items = Array.isArray(data) ? data : (data?.data ? (Array.isArray(data.data) ? data.data : []) : []);
        setInstallments(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = installments.map((item, idx) => {
      const name = isUrdu ? (item.customer_urdu || item.customer_name || '—') : (item.customer_name || '—');
      const father = item.father_name || '—';
      const phone = item.phone || '—';
      const address = item.address || '—';
      const cnic = item.cnic || '—';
      const product = item.product_name || '—';
      const instDisplay = `${item.installment_no ?? '—'}/${item.total_installments ?? '—'}`;
      const status = item.is_overdue ? (isUrdu ? 'تاخیر شدہ' : 'Overdue') : (isUrdu ? 'زیر التوا' : 'Pending');
      const statusColor = item.is_overdue ? '#dc2626' : '#d97706';

      return `<tr>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${name}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${father}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${phone}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${address}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${cnic}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${product}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;">${instDisplay}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;font-size:11px;white-space:nowrap;">Rs. ${Number(item.amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;white-space:nowrap;">${item.due_date || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;color:${statusColor};font-weight:600;">${status}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
      <head><title>${isUrdu ? 'آج کی واجب الادا اقساط' : "Today's Installments"}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 15px; color: #1f2937; }
        h1 { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 5px; color: #111827; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1f2937; color: white; border:1px solid #374151; padding: 8px 4px; font-weight: 600; font-size: 10px; text-align: center; }
        td { border:1px solid #e5e7eb; padding: 6px 4px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #9ca3af; }
        .summary { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
        .summary span { background: #f3f4f6; padding: 4px 10px; border-radius: 4px; }
        @media print { body { padding: 10px; } }
      </style>
      </head>
      <body>
        <h1>${isUrdu ? 'آج کی واجب الادا اقساط' : "Today's Installments"}</h1>
        <div class="summary">
          <span>${isUrdu ? 'کل ریکارڈز' : 'Total Records'}: ${installments.length}</span>
          <span>${isUrdu ? 'کل رقم' : 'Total Amount'}: Rs. ${installments.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}</span>
        </div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>${isUrdu ? 'نام' : 'Name'}</th>
            <th>${isUrdu ? 'والد' : 'Father'}</th>
            <th>${isUrdu ? 'فون' : 'Phone'}</th>
            <th>${isUrdu ? 'پتہ' : 'Address'}</th>
            <th>${isUrdu ? 'شناختی نمبر' : 'CNIC'}</th>
            <th>${isUrdu ? 'پراڈکٹ' : 'Product'}</th>
            <th>${isUrdu ? 'قسط' : 'Inst#'}</th>
            <th>${isUrdu ? 'رقم' : 'Amount'}</th>
            <th>${isUrdu ? 'تاریخ' : 'Due Date'}</th>
            <th>${isUrdu ? 'حالت' : 'Status'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Rana Awais Autos and Electronics — ${new Date().toLocaleDateString()}</div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const displayList = showAll ? installments : installments.slice(0, 10);
  const totalAmount = installments.reduce((sum, item) => sum + (item.amount || 0), 0);
  const overdueCount = installments.filter(i => i.is_overdue).length;

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (installments.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <svg className="w-12 h-12 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium">
            {isUrdu ? 'آج کوئی قسط واجب الادا نہیں ہے' : 'No installments due today'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Summary Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'کل اقساط' : 'Total Installments'}:</span>
            <span className="font-bold text-gray-900 dark:text-white">{installments.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'تاخیر شدہ' : 'Overdue'}:</span>
            <span className="font-bold text-red-600 dark:text-red-400">{overdueCount}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'کل رقم' : 'Total Amount'}:</span>
            <span className="font-bold text-gray-900 dark:text-white">Rs. {totalAmount.toLocaleString()}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {isUrdu ? 'پرنٹ' : 'Print'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-8">#</th>
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                {isUrdu ? 'گاہک کا نام' : 'Customer Name'}
              </th>
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                {isUrdu ? 'والد کا نام' : 'Father Name'}
              </th>
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                {isUrdu ? 'فون نمبر' : 'Phone'}
              </th>
              <th className="px-3 py-2.5 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                {isUrdu ? 'پراڈکٹ' : 'Product'}
              </th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[60px]">
                {isUrdu ? 'قسط#' : 'Inst#'}
              </th>
              <th className="px-3 py-2.5 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                {isUrdu ? 'رقم' : 'Amount'}
              </th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                {isUrdu ? 'واجب الادا تاریخ' : 'Due Date'}
              </th>
              <th className="px-3 py-2.5 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[70px]">
                {isUrdu ? 'حالت' : 'Status'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {displayList.map((item, idx) => {
              const statusText = item.is_overdue
                ? (isUrdu ? 'تاخیر شدہ' : 'Overdue')
                : (isUrdu ? 'زیر التوا' : 'Pending');
              const statusColor = item.is_overdue
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';

              return (
                <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${item.is_overdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                  <td className="px-3 py-2.5 text-gray-400 font-mono text-[10px] text-center">{idx + 1}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-semibold text-gray-800 dark:text-white text-xs leading-tight">
                      {isUrdu ? (item.customer_urdu || item.customer_name || '—') : (item.customer_name || '—')}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-xs text-gray-600 dark:text-gray-300">{item.father_name || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                      {item.phone || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="text-[10px] text-gray-600 dark:text-gray-300">{item.product_name || '—'}</span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      <span className="text-gray-900 dark:text-white">{item.installment_no ?? '—'}</span>
                      <span className="text-gray-400">/</span>
                      <span className="text-gray-500">{item.total_installments ?? '—'}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-end">
                    <span className="font-bold text-gray-800 dark:text-white text-xs whitespace-nowrap">
                      Rs. {Number(item.amount || 0).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                      item.is_overdue ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50'
                    }`}>
                      {item.due_date || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${item.is_overdue ? 'bg-red-500' : 'bg-amber-500'}`} />
                      {statusText}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Show More / Show Less */}
      {installments.length > 10 && (
        <div className="px-4 sm:px-5 py-3 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            {showAll
              ? (isUrdu ? 'کم دکھائیں' : 'Show Less')
              : (isUrdu ? `مزید ${installments.length - 10} دکھائیں` : `Show ${installments.length - 10} More`)}
          </button>
        </div>
      )}
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [summary, setSummary] = useState<DashboardSummary>(() => {
    // Try to load from localStorage cache immediately
    try {
      const cached = localStorage.getItem(LS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < LS_CACHE_TTL) {
          return parsed.data;
        }
      }
    } catch {}
    return {};
  });
  // If we have cached data, don't show skeleton - show data immediately
  const hasCachedData = Object.keys(summary).length > 0;
  const [loading, setLoading] = useState(!hasCachedData);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState | null>(null);

  // Quick stats data - derive from summary if available
  const todayRevenue = summary.todayCollection?.total ?? null;
  const todayProfit = summary.todayProfit ?? null;
  const monthRevenue = summary.monthRevenue ?? null;
  const monthProfit = summary.monthProfit ?? null;
  const pendingTotal = summary.totalPending ?? null;

  useEffect(() => {
    document.title = `${t('dashboard')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  useEffect(() => {
    let cancelled = false;
    let retryCount = 0;
    const MAX_RETRIES = 2;
    
    setLoading(true);
    
    // Set a timeout to force loading to false after 15 seconds max
    const forceTimeout = setTimeout(() => {
      if (!cancelled) {
        console.warn('⚠️ Dashboard loading timeout - forcing display');
        setLoading(false);
      }
    }, 15000);
    
    const fetchSummary = () => {
      if (cancelled) return;
      
      api.get('/dashboard/summary')
        .then((res) => {
          if (cancelled) return;
          const data = res.data || {};
          setSummary(data);
          
          // Cache in localStorage
          try {
            localStorage.setItem(LS_CACHE_KEY, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          } catch {}
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('⚠️ Dashboard summary fetch error:', err.message);
          
          // Try to load from cache
          try {
            const cached = localStorage.getItem(LS_CACHE_KEY);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed.data && Object.keys(parsed.data).length > 0) {
                setSummary(parsed.data);
                console.log('✅ Loaded dashboard from cache');
              }
            }
          } catch {}
          
          // Retry if we haven't exceeded max retries
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            console.log(`🔄 Retrying dashboard fetch (${retryCount}/${MAX_RETRIES})...`);
            setTimeout(fetchSummary, 2000);
            return;
          }
        })
        .finally(() => {
          if (!cancelled) {
            clearTimeout(forceTimeout);
            setLoading(false);
          }
        });
    };
    
    fetchSummary();
      
    return () => { cancelled = true; };
  }, []);

  const fmt = (val: number | undefined | null): string => {
    if (val == null) return 'Rs. 0';
    return `Rs. ${val.toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
  };

  const fmtCount = (val: number | undefined | null): string => {
    if (val == null) return '0';
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

      {/* TODAY'S INSTALLMENTS CARD - Top Priority */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-blue-600 dark:bg-blue-400 rounded-full" />
          <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            {isUrdu ? 'آج کی واجب الادا اقساط' : "Today's Installments"}
          </h2>
        </div>
        <TodayInstallmentsCard isUrdu={isUrdu} />
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
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'کل گاہک' : 'Total Customers'}</span>
                <span className="text-lg font-bold text-gray-900 dark:text-white">
                  {loading ? <span className="inline-block w-16 h-6 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" /> : fmtCount(summary.totalCustomers)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">{isUrdu ? 'تاخیر شدہ' : 'Overdue'}</span>
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
            onClick={() => openModal(isUrdu ? 'آج کی وصولی' : "Today's Collection", '/accounting/today')}
          />
          <DashboardCard
            title={isUrdu ? 'کل بقایا رقم' : 'Total Pending'}
            value={fmt(summary.totalPending)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'بقایا رقم' : 'Pending Amount', '/accounting/pending-total')}
          />
          <DashboardCard
            title={isUrdu ? 'کل ادا شدہ' : 'Total Paid'}
            value={fmt(summary.totalPaid)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ادا شدہ رقم' : 'Paid Amount', '/accounting/total-paid')}
          />
          <DashboardCard
            title={isUrdu ? 'آج کا منافع' : "Today's Profit"}
            value={fmt(summary.todayProfit)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'آج کا منافع' : "Today's Profit", '/accounting/today')}
          />
          <DashboardCard
            title={isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue"}
            value={fmt(summary.monthRevenue)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue", '/accounting/month')}
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
            onClick={() => openModal(isUrdu ? 'تمام گاہک' : 'All Customers', '/dashboard/customers-with-finance')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'فعال اقساط' : 'Active Installments'}
            value={fmtCount(summary.activeInstallments)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'فعال اقساط' : 'Active Installments', '/dashboard/active-installments')}
          />
          <DashboardCard
            title={isUrdu ? 'مکمل اقساط' : 'Completed Plans'}
            value={fmtCount(summary.completedInstallments)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'مکمل اقساط' : 'Completed Plans', '/dashboard/completed-installments')}
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
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            onClick={() => openModal(isUrdu ? 'آج کی واجب الادا' : "Today's Due", '/dashboard/today-due')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'ماہانہ واجب الادا' : 'Monthly Due'}
            value={fmtCount(summary.monthlyDueCount)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ماہانہ واجب الادا' : 'Monthly Due', '/dashboard/monthly-due')}
          />
        </div>
      </div>

      {/* Row 3: Inventory Overview */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gray-900 dark:bg-gray-300 rounded-full" />
          <h2 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'انوینٹری کا جائزہ' : 'Inventory Overview'}
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <DashboardCard
            title={isUrdu ? 'کل مصنوعات' : 'Total Products'}
            value={fmtCount(summary.totalProducts)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
            onClick={() => openModal(isUrdu ? 'تمام مصنوعات' : 'All Products', '/products?skip=0&limit=50')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'کم اسٹاک' : 'Low Stock Items'}
            value={fmtCount(summary.lowStockItems)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            onClick={() => openModal(isUrdu ? 'کم اسٹاک آئٹمز' : 'Low Stock Items', '/dashboard/low-stock')}
            loading={loading}
          />
          <DashboardCard
            title={isUrdu ? 'انوینٹری ویلیو' : 'Inventory Value'}
            value={fmt(summary.inventoryValue)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'انوینٹری ویلیو' : 'Inventory Value', '/inventory?limit=50')}
          />
          <DashboardCard
            title={isUrdu ? 'پرانا اسٹاک' : 'Ageing Stock'}
            value={fmtCount(summary.ageingStock)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'پرانا اسٹاک' : 'Ageing Stock', '/inventory/ageing?older_than_days=90')}
          />
          <DashboardCard
            title={isUrdu ? 'ماہانہ منافع' : "Month's Profit"}
            value={fmt(summary.monthProfit)}
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            loading={loading}
            onClick={() => openModal(isUrdu ? 'ماہانہ منافع' : "Month's Profit", '/accounting/month')}
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
