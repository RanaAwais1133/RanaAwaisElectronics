import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

interface DashboardSummaryModalProps {
  title: string;
  type: 'today' | 'pending' | 'month';
  onClose: () => void;
  isUrdu: boolean;
}

interface DetailItem {
  label: string;
  value: string;
  rawValue?: number;
  isNegative?: boolean;
}

interface CustomerPending {
  customer_id: string;
  customer_name: string;
  customer_name_urdu: string;
  father_name: string;
  phone: string;
  cnic?: string;
  address?: string;
  address_urdu?: string;
  pending_amount: number;
  installment_count: number;
  earliest_due_date?: string;
}

const DashboardSummaryModal: React.FC<DashboardSummaryModalProps> = ({ title, type, onClose, isUrdu }) => {
  const currentUser = useAuthStore((state) => state.user);
  const clientInfo = useClientStore((s) => s.info);
  const [details, setDetails] = useState<DetailItem[]>([]);
  const [customers, setCustomers] = useState<CustomerPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    let endpoint = '';
    if (type === 'today') endpoint = '/accounting/today';
    else if (type === 'month') endpoint = '/accounting/month';
    else endpoint = '/accounting/pending-total';

    api.get(endpoint)
      .then(res => {
        if (cancelled) return;
        const d = res.data;
        const items: DetailItem[] = [];

        // If response is an array (edge case), wrap it
        if (Array.isArray(d)) {
          setDetails([]);
          setCustomers([]);
          return;
        }

        if (type === 'today' || type === 'month') {
          const prefix = type === 'today' ? (isUrdu ? 'آج' : 'Today') : (isUrdu ? 'ماہ' : 'Month');
          // Try multiple possible field names - backend returns {revenue, profit}
          const revenue = d.revenue ?? d.total_revenue ?? d.totalIncome ?? d.totalIncome ?? 0;
          const profit = d.profit ?? d.total_profit ?? d.netProfit ?? 0;
          const collected = d.total_collected ?? d.collection ?? 0;
          const sales = d.total_sales ?? d.sales ?? 0;
          const expenses = d.expenses ?? d.total_expenses ?? 0;
          const transactionCount = d.transaction_count ?? d.count ?? 0;

          // Always show revenue and profit (even if 0) since backend always returns them
          items.push({
            label: isUrdu ? `${prefix} کی کل آمدنی` : `${prefix} Total Revenue`,
            value: `Rs. ${revenue.toLocaleString()}`,
            rawValue: revenue,
          });
          items.push({
            label: isUrdu ? `${prefix} کا کل منافع` : `${prefix} Total Profit`,
            value: `Rs. ${profit.toLocaleString()}`,
            rawValue: profit,
            isNegative: profit < 0,
          });
          if (collected > 0) {
            items.push({
              label: isUrdu ? `${prefix} کی وصولی` : `${prefix} Collection`,
              value: `Rs. ${collected.toLocaleString()}`,
              rawValue: collected,
            });
          }
          if (sales > 0) {
            items.push({
              label: isUrdu ? `${prefix} کی فروخت` : `${prefix} Sales`,
              value: `Rs. ${sales.toLocaleString()}`,
              rawValue: sales,
            });
          }
          if (expenses > 0) {
            items.push({
              label: isUrdu ? `${prefix} کے اخراجات` : `${prefix} Expenses`,
              value: `Rs. ${expenses.toLocaleString()}`,
              rawValue: expenses,
              isNegative: true,
            });
          }
          if (transactionCount > 0) {
            items.push({
              label: isUrdu ? 'لین دین کی تعداد' : 'Transactions',
              value: `${transactionCount}`,
              rawValue: transactionCount,
            });
          }
        } else {
          // Pending type - show total and customer-wise list
          const pendingTotal = d.pending_total ?? d.totalPending ?? 0;
          items.push({
            label: isUrdu ? 'کل بقایا رقم' : 'Total Pending Amount',
            value: `Rs. ${pendingTotal.toLocaleString()}`,
            rawValue: pendingTotal,
          });
          if (d.customers && Array.isArray(d.customers)) {
            items.push({
              label: isUrdu ? 'متاثرہ گاہک' : 'Affected Customers',
              value: `${d.customers.length}`,
              rawValue: d.customers.length,
            });
            setCustomers(d.customers);
          }
        }

        if (!cancelled) setDetails(items);
      })
      .catch(() => {
        // ✅ OFFLINE FALLBACK: Try to serve from cached dashboard summary
        if (!cancelled) {
          import('../../db/indexeddb').then(({ offlineDB }) => {
            offlineDB.getCachedDashboardSummary().then(cached => {
              if (cached && !cancelled) {
                const items: DetailItem[] = [];
                if (type === 'today') {
                  items.push({
                    label: isUrdu ? 'آج کی کل آمدنی' : "Today's Total Revenue",
                    value: `Rs. ${(cached.todayRevenue || 0).toLocaleString()}`,
                    rawValue: cached.todayRevenue || 0,
                  });
                  items.push({
                    label: isUrdu ? 'آج کا کل منافع' : "Today's Total Profit",
                    value: `Rs. ${(cached.todayProfit || 0).toLocaleString()}`,
                    rawValue: cached.todayProfit || 0,
                    isNegative: (cached.todayProfit || 0) < 0,
                  });
                  if (cached.todayCollection?.total) {
                    items.push({
                      label: isUrdu ? 'آج کی وصولی' : "Today's Collection",
                      value: `Rs. ${(cached.todayCollection.total || 0).toLocaleString()}`,
                      rawValue: cached.todayCollection.total || 0,
                    });
                  }
                } else if (type === 'month') {
                  items.push({
                    label: isUrdu ? 'ماہ کی کل آمدنی' : "Month's Total Revenue",
                    value: `Rs. ${(cached.monthRevenue || 0).toLocaleString()}`,
                    rawValue: cached.monthRevenue || 0,
                  });
                  items.push({
                    label: isUrdu ? 'ماہ کا کل منافع' : "Month's Total Profit",
                    value: `Rs. ${(cached.monthProfit || 0).toLocaleString()}`,
                    rawValue: cached.monthProfit || 0,
                    isNegative: (cached.monthProfit || 0) < 0,
                  });
                } else {
                  // Pending
                  items.push({
                    label: isUrdu ? 'کل بقایا رقم' : 'Total Pending Amount',
                    value: `Rs. ${(cached.totalPending || 0).toLocaleString()}`,
                    rawValue: cached.totalPending || 0,
                  });
                }
                setDetails(items);
              } else if (!cancelled) {
                setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
              }
            }).catch(() => {
              if (!cancelled) setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
            });
          }).catch(() => {
            if (!cancelled) setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [type, isUrdu]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = details.map((item, idx) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:10px 12px;text-align:center;width:40px;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:10px 12px;font-weight:500;">${item.label}</td>
        <td style="border:1px solid #e5e7eb;padding:10px 12px;text-align:right;font-weight:700;${item.isNegative ? 'color:#dc2626;' : 'color:#111827;'}">${item.value}</td>
      </tr>
    `).join('');

    // Calculate total using raw numeric values (skip profit items to avoid double-counting)
    const totalValue = details.reduce((sum, item) => {
      // Skip profit items in total calculation since profit is already part of revenue
      if (item.label.toLowerCase().includes('profit') || item.label.toLowerCase().includes('منافع')) {
        return sum;
      }
      return sum + (item.rawValue || 0);
    }, 0);

    printWindow.document.write(`
      <html>
      <head><title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1f2937; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; }
        .header h1 { font-size: 22px; font-weight: 800; margin: 0 0 4px 0; color: #111827; }
        .header .sub { font-size: 13px; color: #6b7280; }
        .header .date { font-size: 11px; color: #9ca3af; margin-top: 4px; }
        table { width: 100%; border-collapse: collapse; font-size: 14px; margin-top: 20px; }
        th { background: #f3f4f6; border:1px solid #e5e7eb; padding: 10px 12px; font-weight: 700; color: #374151; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; }
        td { border:1px solid #e5e7eb; padding: 10px 12px; }
        .total-row { background: #f9fafb; font-weight: 700; }
        .total-row td { border-top: 2px solid #9ca3af; }
        .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #9ca3af; }
        .badge { display: inline-block; background: #f3f4f6; padding: 2px 10px; border-radius: 4px; font-size: 11px; color: #6b7280; }
        @media print { body { padding: 20px; } }
      </style>
      </head>
      <body>
        <div class="header">
          <h1>${clientInfo?.name || ''}</h1>
          <div class="sub">${title}</div>
          <div class="date">${isUrdu ? 'پرنٹ کی تاریخ' : 'Print Date'}: ${new Date().toLocaleDateString()} | ${isUrdu ? 'تیار کردہ' : 'Generated By'}: ${currentUser?.displayName || currentUser?.username || '—'}</div>
        </div>
        <table>
          <thead><tr>
            <th>#</th>
            <th style="text-align:start;">${isUrdu ? 'تفصیل' : 'Description'}</th>
            <th style="text-align:end;">${isUrdu ? 'رقم' : 'Amount'}</th>
          </tr></thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="2" style="text-align:end;font-weight:700;">${isUrdu ? 'کل' : 'Total'}</td>
              <td style="text-align:right;font-weight:800;">Rs. ${totalValue.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
        <div class="footer">
          ${isUrdu ? 'یہ رپورٹ خودکار طور پر تیار کی گئی ہے' : 'This report is auto-generated'} | ${clientInfo?.name || ''}
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  }, [details, title, isUrdu, currentUser]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              type === 'today' ? 'bg-blue-50 dark:bg-blue-900/30' :
              type === 'pending' ? 'bg-amber-50 dark:bg-amber-900/30' :
              'bg-emerald-50 dark:bg-emerald-900/30'
            }`}>
              {type === 'today' ? (
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : type === 'pending' ? (
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                })}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {details.length > 0 && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {isUrdu ? 'پرنٹ کریں' : 'Print'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : details.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">
                {isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {details.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                      type === 'today' ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400' :
                      type === 'pending' ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                      'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {String(idx + 1).padStart(2, '0')}
                    </div>
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {item.label}
                    </span>
                  </div>
                  <span className={`text-base font-bold ${
                    item.isNegative
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-gray-900 dark:text-white'
                  }`}>
                    {item.value}
                  </span>
                </div>
              ))}

              {/* Total - skip profit items and count items to avoid double-counting */}
              <div className="flex items-center justify-between p-4 bg-gray-900 dark:bg-white rounded-xl mt-4">
                <span className="text-sm font-bold text-white dark:text-gray-900 uppercase tracking-wider">
                  {isUrdu ? 'کل' : 'Total'}
                </span>
                <span className="text-lg font-extrabold text-white dark:text-gray-900">
                  Rs. {details.reduce((sum, item) => {
                    // Skip profit items in total since profit is derived from revenue
                    if (item.label.toLowerCase().includes('profit') || item.label.toLowerCase().includes('منافع')) {
                      return sum;
                    }
                    // Skip count/quantity items (like "Affected Customers", "Transactions") - only sum financial values
                    if (item.label.toLowerCase().includes('متاثرہ گاہک') || item.label.toLowerCase().includes('affected customers') || item.label.toLowerCase().includes('transactions') || item.label.toLowerCase().includes('لین دین')) {
                      return sum;
                    }
                    return sum + (item.rawValue || 0);
                  }, 0).toLocaleString()}
                </span>
              </div>

              {/* Customer-wise pending list for pending type */}
              {type === 'pending' && customers.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 uppercase tracking-wider">
                    {isUrdu ? 'گاہک کے لحاظ سے بقایا جات' : 'Customer-wise Pending'}
                  </h3>
                  <div className="space-y-3">
                    {customers.map((cust, idx) => (
                      <div
                        key={cust.customer_id}
                        className="p-4 bg-white dark:bg-gray-700 rounded-xl border border-gray-200 dark:border-gray-600 shadow-sm"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center text-xs font-bold text-amber-600 dark:text-amber-400">
                              {idx + 1}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-900 dark:text-white">
                                {isUrdu && cust.customer_name_urdu ? cust.customer_name_urdu : cust.customer_name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {cust.father_name ? `${isUrdu ? 'والد کا نام' : 'Father'}: ${cust.father_name}` : ''}
                              </p>
                            </div>
                          </div>
                          <span className="text-base font-extrabold text-amber-600 dark:text-amber-400">
                            Rs. {(cust.pending_amount || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-2 pt-2 border-t border-gray-100 dark:border-gray-600">
                          <span>{isUrdu ? 'فون' : 'Phone'}: {cust.phone || '—'}</span>
                          <span>{isUrdu ? 'اقساط' : 'Installments'}: {cust.installment_count || 0}</span>
                          {cust.address && (
                            <span className="truncate max-w-[200px]" title={cust.address}>
                              {isUrdu ? 'پتہ' : 'Address'}: {isUrdu ? (cust.address_urdu || cust.address) : cust.address}
                            </span>
                          )}
                          {cust.earliest_due_date && (
                            <span>{isUrdu ? 'تاریخ' : 'Due Date'}: {new Date(cust.earliest_due_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardSummaryModal; 