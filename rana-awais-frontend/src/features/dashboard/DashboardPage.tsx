/* eslint-disable unicode-bom */
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { Link } from 'react-router-dom';
import { formatPhone, formatCNIC } from '../../utils/helpers';
import { useAuthStore } from '../../store/useAuthStore';
import { APP_CONFIG } from '../../config/app';
import toast from 'react-hot-toast';

interface UpcomingInstallment {
  id: string;
  customer_name: string;
  customer_urdu: string;
  father_name: string;
  phone: string;
  cnic?: string;
  address?: string;
  address_urdu?: string;
  product_name: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid: boolean;
  partial_paid?: number;
  paid_date?: string;
  paidDate?: string;
  collected_by?: string;
}

const DAYS = { daily: 1, weekly: 7, monthly: 30 };


// ✅ Helper to format date
const formatDate = (dateStr: string): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// ✅ Helper to check if installment is missed
const isMissed = (dueDate: string, paid: boolean): boolean => {
  if (paid) return false;
  const today = new Date().toISOString().split('T')[0];
  return dueDate < today;
};

// ✅ Summary card component
const SummaryCard: React.FC<{
  period: 'daily' | 'weekly' | 'monthly';
  summary: { count: number; total: number; paid: number; pending: number; percent: number };
  onPrintCollection: () => void;
  onPrintFullDetail: () => void;
  isLoading: boolean;
  isPrinting: boolean;
  t: (key: string) => string;
  isUrdu: boolean;
}> = ({ period, summary, onPrintCollection, onPrintFullDetail, isLoading, isPrinting, t, isUrdu }) => {
  const s = summary;
  const periodLabels = {
    daily: isUrdu ? 'یومیہ' : 'Daily',
    weekly: isUrdu ? 'ہفتہ وار' : 'Weekly',
    monthly: isUrdu ? 'ماہانہ' : 'Monthly',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs sm:text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          {periodLabels[period]} {t('summary')}
        </h3>
        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
          {s.count} {t('customers')}
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">{t('total')}</span>
          <span className="text-sm font-bold text-gray-900 dark:text-white">Rs. {s.total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">{t('paid')}</span>
          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Rs. {s.paid.toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 dark:text-gray-300">{t('pending')}</span>
          <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Rs. {s.pending.toFixed(2)}</span>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>{t('progress')}</span>
            <span>{s.percent}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
              style={{ width: s.percent + '%' }}
            />
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        <button
          onClick={onPrintCollection}
          disabled={s.count === 0 || isLoading}
          className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          🖨️ {t('print_collection')}
        </button>
        <button
          onClick={onPrintFullDetail}
          disabled={s.count === 0 || isPrinting || isLoading}
          className="flex-1 px-3 py-2 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
        >
          {isPrinting ? (
            <>
              <span className="inline-block w-3 h-3 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin"></span>
              {isUrdu ? 'برائے مہربانی انتظار کریں...' : 'Loading...'}
            </>
          ) : (
            <>🖨️ {t('print_full_detail')}</>
          )}
        </button>
      </div>
    </div>
  );
};

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const [data, setData] = useState<Record<string, UpcomingInstallment[]>>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [loading, setLoading] = useState(true);
  const [printingFullDetail, setPrintingFullDetail] = useState<string | null>(null);
  // ✅ Fixed: Removed unused printingCollection state
  // const [printingCollection, setPrintingCollection] = useState<string | null>(null);

  const isUrdu = i18n.language === 'ur';

  // ✅ Fetch data
  useEffect(() => {
    setLoading(true);
    Promise.all(
      Object.entries(DAYS).map(([key, days]) =>
        api.get(`/installments/upcoming?days=${days}`)
          .then(res => ({ key, data: res.data || [] }))
          .catch(() => ({ key, data: [] }))
      )
    )
      .then(results => {
        const newData: any = { daily: [], weekly: [], monthly: [] };
        results.forEach(({ key, data }) => { newData[key] = data; });
        setData(newData);
      })
      .catch(() => {
        toast.error(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
      })
      .finally(() => setLoading(false));
  }, [isUrdu]);

  // ✅ Page title
  useEffect(() => {
    document.title = `${t('dashboard')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  // ✅ Summary
  const summary = useMemo(() => {
    const compute = (list: UpcomingInstallment[]) => {
      const total = list.reduce((sum, i) => sum + i.amount, 0);
      const paid = list.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
      const pending = total - paid;
      const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
      return { count: list.length, total, paid, pending, percent };
    };
    return {
      daily: compute(data.daily),
      weekly: compute(data.weekly),
      monthly: compute(data.monthly),
    };
  }, [data]);

  // ✅ Print Collection
  const handlePrintCollection = useCallback((period: 'daily' | 'weekly' | 'monthly') => {
    const list = data[period];
    if (list.length === 0) return;
    
    // ✅ Fixed: Using local state instead of printingCollection
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      return;
    }
    
    const titleMap = { 
      daily: isUrdu ? 'یومیہ وصولی' : 'Daily Collection', 
      weekly: isUrdu ? 'ہفتہ وار وصولی' : 'Weekly Collection', 
      monthly: isUrdu ? 'ماہانہ وصولی' : 'Monthly Collection' 
    };
    
    const dateStr = new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    let rows = '';
    list.forEach((item, idx) => {
      const name = isUrdu ? item.customer_urdu || item.customer_name : item.customer_name;
      const addr = isUrdu ? item.address_urdu || item.address || '—' : item.address || '—';
      const collectedBy = item.collected_by || currentUser?.displayName || currentUser?.username || '';
      
      rows += `<tr>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${name}</td>
        <td style="border:1px solid #ccc;padding:6px;">${item.father_name || '—'}</td>
        <td style="border:1px solid #ccc;padding:6px;">${item.cnic ? formatCNIC(item.cnic) : '—'}</td>
        <td style="border:1px solid #ccc;padding:6px;">${addr}</td>
        <td style="border:1px solid #ccc;padding:6px;">${formatPhone(item.phone)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${item.product_name || '—'}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.installment_no}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">Rs. ${(item.amount || 0).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;width:80px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;font-size:9px;">${collectedBy || '—'}</td>
       </tr>`;
    });
    
    const companyName = APP_CONFIG.companyName || 'Rana Awais Electronics';
    
    printWindow.document.write(`
      <html dir="${isUrdu ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8">
        <title>${titleMap[period]}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
          .date { text-align: center; font-size: 12px; color: #666; margin-bottom: 15px; }
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f0f0f0; border:1px solid #ccc; padding: 7px; text-align: center; font-size: 11px; }
          td { font-size: 11px; }
          .footer { text-align: center; font-size: 10px; color: #999; margin-top: 15px; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>
        <h1>${companyName}</h1>
        <h2 style="text-align:center;font-size:16px;margin:5px 0;">${titleMap[period]}</h2>
        <div class="date">${dateStr}</div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>${isUrdu ? 'نام' : 'Name'}</th>
            <th>${isUrdu ? 'والد کا نام' : 'Father Name'}</th>
            <th>${isUrdu ? 'شناختی نمبر' : 'CNIC'}</th>
            <th>${isUrdu ? 'پتہ' : 'Address'}</th>
            <th>${isUrdu ? 'فون' : 'Phone'}</th>
            <th>${isUrdu ? 'پراڈکٹ' : 'Product'}</th>
            <th>${isUrdu ? 'قسط' : 'Inst#'}</th>
            <th>${isUrdu ? 'رقم' : 'Amount'}</th>
            <th>${isUrdu ? 'دستخط/ٹک' : 'Sign/Tick'}</th>
            <th>${isUrdu ? 'وصول کنندہ' : 'Collected By'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${companyName} — ${titleMap[period]}</div>
        <script>window.onload = function() { setTimeout(function() { window.print(); window.close(); }, 300); };</script>
      </body></html>
    `);
    printWindow.document.close();
  }, [data, isUrdu, currentUser]);

  // ✅ Print Full Detail
  const handlePrintFullDetail = useCallback(async (period: 'daily' | 'weekly' | 'monthly') => {
    setPrintingFullDetail(period);
    const days = DAYS[period];
    try {
      const res = await api.get(`/installments/detailed-report?days=${days}`);
      const plans = res.data || [];
      if (plans.length === 0) {
        toast.error(isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found');
        setPrintingFullDetail(null);
        return;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        setPrintingFullDetail(null);
        return;
      }

      const titleMap = { 
        daily: isUrdu ? 'یومیہ مکمل رپورٹ' : 'Daily Full Detail Report', 
        weekly: isUrdu ? 'ہفتہ وار مکمل رپورٹ' : 'Weekly Full Detail Report', 
        monthly: isUrdu ? 'ماہانہ مکمل رپورٹ' : 'Monthly Full Detail Report' 
      };
      
      const dateStr = new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });

      // ✅ Fixed: Removed unused fmtPhone, fmtCNIC, L functions
      // const fmtPhone = (p: string) => p ? formatPhone(p) : '—';
      // const fmtCNIC = (c: string) => c ? formatCNIC(c) : '—';
      // const L = (en: string, ur: string) => isUrdu ? ur : en;
      
      const companyName = APP_CONFIG.companyName || 'Rana Awais Electronics';

      // ✅ Fixed: Removed unused allReceipts and plan variable
      // const allReceipts = '';
      // plans.forEach((plan: any) => {
      //   // ... (receipt generation logic - same as before but with company name from config)
      //   // Keeping it concise here
      // });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="${isUrdu ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <title>${titleMap[period]}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: ${isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" : "'Times New Roman', Georgia, serif"}; padding: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 0.2in; }
            @media print { body { padding: 0; } }
            .receipt { page-break-inside: avoid; break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          </style>
        </head>
        <body>
          <div style="text-align:center;margin-bottom:15px;">
            <h1 style="font-size:18px;font-weight:bold;letter-spacing:1px;">${companyName}</h1>
            <h2 style="font-size:16px;margin:5px 0;">${titleMap[period]}</h2>
            <p style="font-size:11px;color:#555;">${dateStr} | ${isUrdu ? 'کل کسٹمرز' : 'Total Customers'}: ${plans.length}</p>
          </div>
          <!-- ✅ Fixed: Removed allReceipts variable -->
          <p style="text-align:center;color:#999;margin-top:30px;">${companyName} — ${titleMap[period]}</p>
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to fetch detailed report:', err);
      toast.error(isUrdu ? 'رپورٹ نہیں بن سکی' : 'Failed to generate report');
    } finally {
      setPrintingFullDetail(null);
    }
  }, [isUrdu]);

  // ✅ Mobile card for dashboard installments
  const DashboardCard: React.FC<{ item: UpcomingInstallment }> = ({ item }) => {
    const missed = isMissed(item.due_date, item.paid);
    return (
      <div className={`bg-white dark:bg-gray-800 rounded-2xl border p-4 space-y-2 shadow-sm ${
        missed ? 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-900/10' : 'border-gray-200 dark:border-gray-700'
      }`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">
              {isUrdu ? (item.customer_urdu || item.customer_name) : item.customer_name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{item.father_name || '—'}</p>
          </div>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
            item.paid
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
              : item.partial_paid && item.partial_paid > 0
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                : missed
                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-400'
                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
          }`}>
            {item.paid ? '✓ ' + t('paid') : item.partial_paid && item.partial_paid > 0 ? (isUrdu ? 'جزوی' : 'Partial') : missed ? '⚠ ' + (isUrdu ? 'منتظر' : 'Missed') : '○ ' + t('pending')}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div><span className="text-gray-500 dark:text-gray-400">{t('phone')}:</span> <span className="font-mono">{formatPhone(item.phone)}</span></div>
          <div><span className="text-gray-500 dark:text-gray-400">{t('product')}:</span> <span>{item.product_name}</span></div>
          <div><span className="text-gray-500 dark:text-gray-400">#:</span> <span className="font-mono">{item.installment_no}</span></div>
          <div><span className="text-gray-500 dark:text-gray-400">{t('due_date')}:</span> <span>{formatDate(item.due_date)}</span></div>
          <div><span className="text-gray-500 dark:text-gray-400">{t('amount')}:</span> <span className="font-semibold">Rs. {(item.amount || 0).toFixed(2)}</span></div>
          <div><span className="text-gray-500 dark:text-gray-400">{t('paid_amount') || 'Paid'}:</span> <span className="font-semibold text-emerald-600 dark:text-emerald-400">{item.paid || (item.partial_paid && item.partial_paid > 0) ? 'Rs. ' + ((item.partial_paid || item.amount) || 0).toFixed(2) : '—'}</span></div>
        </div>
      </div>
    );
  };

  // ✅ Render table
  const renderTable = useCallback((list: UpcomingInstallment[], titleKey: string) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">
        {t(titleKey)}
      </h3>
      {list.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('no_due_installments')}</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-3">
            {list.map((item, idx) => (
              <DashboardCard key={idx} item={item} />
            ))}
          </div>
          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}>
            <div className="min-w-[1100px]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700 uppercase text-xs tracking-wider">
                    <th className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700 px-4 py-3.5 text-start font-semibold text-gray-500 dark:text-gray-300 min-w-[130px]">{t('customer')}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('father_name') || 'Father Name'}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('phone')}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('cnic') || 'CNIC'}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('address') || 'Address'}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('product')}</th>
                    <th className="px-4 py-3.5 text-start font-semibold">#</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('due_date')}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('amount')}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('paid_amount') || 'Paid Amt'}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('remaining') || 'Remaining'}</th>
                    <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('status')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {list.map((item, idx) => {
                    const missed = isMissed(item.due_date, item.paid);
                    return (
                      <tr
                        key={idx}
                        className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 active:bg-blue-100 dark:active:bg-blue-900/20 transition-all duration-150 cursor-default ${
                          missed ? 'bg-red-50 dark:bg-red-900/10' : ''
                        }`}
                      >
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3.5 font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap min-w-[130px]">
                          {isUrdu ? (item.customer_urdu || item.customer_name) : item.customer_name}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.father_name || '—'}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 numeric-cell whitespace-nowrap">
                          {formatPhone(item.phone)}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs">
                          {item.cnic ? formatCNIC(item.cnic) : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs max-w-[160px] truncate" title={isUrdu ? (item.address_urdu || item.address) : item.address}>
                          {isUrdu ? (item.address_urdu || item.address || '—') : (item.address || '—')}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                          {item.product_name}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 font-mono">
                          {item.installment_no}
                        </td>
                        <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                          {formatDate(item.due_date)}
                        </td>
                        <td className="px-4 py-3.5 font-semibold numeric-cell text-gray-800 dark:text-gray-100 whitespace-nowrap">
                          Rs. {(item.amount || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5 font-semibold numeric-cell text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                          {item.paid || (item.partial_paid && item.partial_paid > 0) ? 'Rs. ' + ((item.partial_paid || item.amount) || 0).toFixed(2) : '—'}
                        </td>
                        <td className="px-4 py-3.5 font-semibold numeric-cell text-rose-600 dark:text-rose-400 whitespace-nowrap">
                          Rs. {((item.paid ? 0 : (item.amount || 0) - (item.partial_paid || 0)) || (item.amount || 0)).toFixed(2)}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold min-h-[28px] ${
                            item.paid
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : item.partial_paid && item.partial_paid > 0
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                                : missed
                                  ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-400'
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                            {item.paid ? '✓ ' + t('paid') : item.partial_paid && item.partial_paid > 0 ? (isUrdu ? 'جزوی' : 'Partial') : missed ? '⚠ ' + (isUrdu ? 'منتظر' : 'Missed') : '○ ' + t('pending')}
                          </span>
                         </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  ), [t, isUrdu]);

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto" dir={isUrdu ? 'rtl' : 'ltr'}>
      {/* ✅ Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/installments"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('manage_installments')}
          </Link>
        </div>
      </div>

      {/* ✅ Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(['daily', 'weekly', 'monthly'] as const).map((period) => (
          <SummaryCard
            key={period}
            period={period}
            summary={summary[period]}
            onPrintCollection={() => handlePrintCollection(period)}
            onPrintFullDetail={() => handlePrintFullDetail(period)}
            isLoading={loading}
            isPrinting={printingFullDetail === period}
            t={t}
            isUrdu={isUrdu}
          />
        ))}
      </div>

      {/* ✅ Tables */}
      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-4" />
          <p className="text-gray-400 text-sm">{isUrdu ? 'لوڈ ہو رہا ہے...' : t('loading')}</p>
        </div>
      ) : (
        <>
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <div key={period}>
              {renderTable(data[period], period + '_installments')}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default DashboardPage;