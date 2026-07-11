import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

interface Transaction {
  id: string;
  customer_name: string;
  customer_urdu: string;
  father_name: string;
  phone: string;
  product_name: string;
  amount: number;
  method: string;
  type: string;
  status: string;
  date: string;
  installment_no: number;
}

interface ReportData {
  total_sales: number;
  total_pending: number;
  total_collected: number;
  total_installments: number;
  customers: number;
  cash_in_hand: number;
  bank_deposit: number;
  recoveryRate: number;
  total_outstanding: number;
  open_accounts: number;
  closed_accounts: number;
  net_accounts: number;
  transactions: Transaction[];
  start?: string;
  end?: string;
  report_type?: string;
}

type ReportType = 'daily' | 'weekly' | 'monthly' | 'date-range';

const CustomerReport: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore(s => s.user);
  const clientInfo = useClientStore(s => s.info);
  const [reportType, setReportType] = useState<ReportType>('daily');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const PER_PAGE = 25;

  const fetchReport = () => {
    let endpoint = '';
    if (reportType === 'daily') endpoint = `/reports/daily?date=${selectedDate}`;
    else if (reportType === 'weekly') endpoint = '/reports/weekly';
    else if (reportType === 'monthly') endpoint = '/reports/monthly';
    else endpoint = `/reports/date-range?start=${startDate}&end=${endDate}`;

    setLoading(true);
    api.get(endpoint)
      .then(res => {
        const d = res.data;
        // Normalize both response formats
        setData({
          total_sales: d.total_sales || 0,
          total_pending: d.total_pending ?? d.pending ?? 0,
          total_collected: d.total_collected || 0,
          total_installments: d.total_installments || 0,
          customers: d.customers || 0,
          cash_in_hand: d.cash_in_hand || 0,
          bank_deposit: d.bank_deposit || 0,
          recoveryRate: d.recoveryRate || 0,
          total_outstanding: d.total_outstanding || 0,
          open_accounts: d.open_accounts || 0,
          closed_accounts: d.closed_accounts || 0,
          net_accounts: d.net_accounts || 0,
          transactions: d.transactions || [],
          start: d.start || d.date || '',
          end: d.end || d.date || '',
          report_type: d.report_type || reportType,
        });
      })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, [reportType, selectedDate, startDate, endDate]);

  const transactions: Transaction[] = data?.transactions || [];
  const filteredTxns = transactions.filter((tx: Transaction) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (tx.customer_name || '').toLowerCase().includes(q) ||
      (tx.customer_urdu || '').toLowerCase().includes(q) ||
      (tx.father_name || '').toLowerCase().includes(q) ||
      (tx.phone || '').includes(q) ||
      (tx.product_name || '').toLowerCase().includes(q);
  });
  const totalTxnPages = Math.ceil(filteredTxns.length / PER_PAGE);
  const paginatedTxns = filteredTxns.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pagesArr: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalTxnPages, page + 2); i++) pagesArr.push(i);

  const getTitle = () => {
    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    const displayDate = dateObj.toLocaleDateString(isUrdu ? 'ur-PK' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    if (reportType === 'daily') return `${isUrdu ? 'یومیہ رپورٹ' : 'Daily Report'} — ${displayDate} (${dayName})`;
    if (reportType === 'weekly') return `${isUrdu ? 'ہفتہ وار رپورٹ' : 'Weekly Report'} — ${formatDate(data?.start || '')} to ${formatDate(data?.end || '')}`;
    if (reportType === 'monthly') return `${isUrdu ? 'ماہانہ رپورٹ' : 'Monthly Report'} — ${formatMonth(data?.start || '')}`;
    return `${isUrdu ? 'رپورٹ' : 'Report'} — ${formatDate(startDate)} to ${formatDate(endDate)}`;
  };

  const formatDate = (d: string) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString(isUrdu ? 'ur-PK' : 'en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const formatMonth = (d: string) => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00').toLocaleDateString(isUrdu ? 'ur-PK' : 'en-GB', { year: 'numeric', month: 'long' });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !data) return;
    const rows = transactions.map((tx: Transaction, idx: number) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${isUrdu ? (tx.customer_urdu || tx.customer_name) : tx.customer_name}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${tx.father_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${tx.phone || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${tx.product_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;"><span style="background:#f3f4f6;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;">${tx.type || (tx.installment_no === 0 ? 'Down Payment' : 'Installment')}</span></td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;">Rs. ${(tx.amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;color:#059669;font-weight:600;">${isUrdu ? 'ادا شدہ' : 'Paid'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${tx.date || '—'}</td>
      </tr>
    `).join('');
    const now = new Date();
    printWindow.document.write(`<html><head><title>${getTitle()}</title><style>@page{size:landscape;margin:8mm;}body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#1f2937;}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #1f2937;padding-bottom:15px;}.header h1{font-size:20px;margin:0 0 4px 0;}.header .sub{font-size:12px;color:#6b7280;}.stats{display:flex;gap:12px;justify-content:center;margin-bottom:15px;flex-wrap:wrap;}.stat-box{background:#f3f4f6;padding:10px 16px;border-radius:8px;text-align:center;min-width:100px;}.stat-box .num{font-size:18px;font-weight:800;}.stat-box .lbl{font-size:10px;color:#6b7280;}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;}th{background:#1f2937;color:white;border:1px solid #374151;padding:8px 6px;font-weight:600;font-size:10px;text-align:center;}td{border:1px solid #e5e7eb;padding:6px 4px;}.footer{text-align:center;margin-top:15px;font-size:10px;color:#9ca3af;}</style></head><body><div class="header"><h1>${clientInfo?.name || ''}</h1><div class="sub">${clientInfo?.address || ''}</div><div class="sub">${getTitle()}</div></div><div class="stats"><div class="stat-box"><div class="num">Rs. ${(data.total_sales || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'کل سیلز' : 'Total Sales'}</div></div><div class="stat-box"><div class="num">${data.customers}</div><div class="lbl">${isUrdu ? 'گاہک' : 'Customers'}</div></div><div class="stat-box"><div class="num">Rs. ${(data.total_collected || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'وصول شدہ' : 'Collected'}</div></div><div class="stat-box"><div class="num">${data.total_installments}</div><div class="lbl">${isUrdu ? 'اقساط' : 'Installments'}</div></div><div class="stat-box"><div class="num" style="color:#dc2626;">Rs. ${(data.total_pending || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'زیر التوا' : 'Pending'}</div></div><div class="stat-box"><div class="num">${(data.recoveryRate || 0).toFixed(0)}%</div><div class="lbl">${isUrdu ? 'وصولی شرح' : 'Recovery'}</div></div></div><div class="stats"><div class="stat-box"><div class="num">Rs. ${(data.cash_in_hand || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'نقد رقم' : 'Cash'}</div></div><div class="stat-box"><div class="num">Rs. ${(data.bank_deposit || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'بینک رقم' : 'Bank'}</div></div><div class="stat-box"><div class="num">${data.open_accounts}</div><div class="lbl">${isUrdu ? 'کھلے' : 'Open'}</div></div><div class="stat-box"><div class="num">${data.closed_accounts}</div><div class="lbl">${isUrdu ? 'بند' : 'Closed'}</div></div><div class="stat-box"><div class="num">${data.net_accounts}</div><div class="lbl">${isUrdu ? 'کل' : 'Net'}</div></div><div class="stat-box"><div class="num" style="color:#d97706;">Rs. ${(data.total_outstanding || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'بقایا' : 'Outstanding'}</div></div></div><h3 style="font-size:14px;font-weight:700;">${isUrdu ? 'لین دین' : 'Transactions'} (${transactions.length})</h3><table><thead><tr><th>#</th><th>${isUrdu ? 'نام' : 'Name'}</th><th>${isUrdu ? 'والد' : 'Father'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th><th>${isUrdu ? 'پراڈکٹ' : 'Product'}</th><th>${isUrdu ? 'قسم' : 'Type'}</th><th>${isUrdu ? 'رقم' : 'Amount'}</th><th>${isUrdu ? 'حالت' : 'Status'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th></tr></thead><tbody>${rows}</tbody></table><div class="footer">${isUrdu ? 'پرنٹ تاریخ' : 'Print Date'}: ${now.toLocaleDateString()} | ${isUrdu ? 'وقت' : 'Time'}: ${now.toLocaleTimeString()} | ${isUrdu ? 'جنریٹ کردہ' : 'Generated By'}: ${currentUser?.displayName || currentUser?.username || '—'}<br>${isUrdu ? 'یہ رپورٹ خودکار طور پر تیار کی گئی ہے' : 'This report is auto-generated'}</div><script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script></body></html>`);
    printWindow.document.close();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-10 h-10 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Report Type Selector + Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select value={reportType} onChange={e => { setReportType(e.target.value as ReportType); setPage(1); }} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="daily">{isUrdu ? 'یومیہ' : 'Daily'}</option>
          <option value="weekly">{isUrdu ? 'ہفتہ وار' : 'Weekly'}</option>
          <option value="monthly">{isUrdu ? 'ماہانہ' : 'Monthly'}</option>
          <option value="date-range">{isUrdu ? 'تاریخ سے تاریخ' : 'Date to Date'}</option>
        </select>
        {reportType === 'daily' && (
          <input type="date" value={selectedDate} onChange={e => { setSelectedDate(e.target.value); setPage(1); }} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
        )}
        {reportType === 'date-range' && (
          <>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-xs text-gray-500">{isUrdu ? 'سے' : 'to'}</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </>
        )}
        {data && (
          <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all ml-auto">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
            {isUrdu ? 'پرنٹ' : 'Print'}
          </button>
        )}
      </div>

      {!data ? (
        <div className="text-center py-16 text-gray-400">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found'}</div>
      ) : (
        <>
          {/* Stats Row 1 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">Rs. {(data.total_sales || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'کل سیلز' : 'Total Sales'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{data.customers}</p>
              <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'گاہک' : 'Customers'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Rs. {(data.total_collected || data.total_sales || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'وصول شدہ' : 'Collected'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{data.total_installments || transactions.length}</p>
              <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'اقساط' : 'Installments'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-lg font-bold text-red-600 dark:text-red-400">Rs. {(data.total_pending || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'زیر التوا' : 'Pending'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{(data.recoveryRate || 0).toFixed(0)}%</p>
              <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'وصولی شرح' : 'Recovery'}</p>
            </div>
          </div>
          {/* Stats Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Rs. {(data.cash_in_hand || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{isUrdu ? 'نقد رقم' : 'Cash'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Rs. {(data.bank_deposit || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{isUrdu ? 'بینک رقم' : 'Bank'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{data.open_accounts}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{isUrdu ? 'کھلے اکاؤنٹ' : 'Open'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{data.closed_accounts}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{isUrdu ? 'بند اکاؤنٹ' : 'Closed'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm font-bold text-gray-900 dark:text-white">{data.net_accounts}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{isUrdu ? 'کل اکاؤنٹ' : 'Net'}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
              <p className="text-sm font-bold text-amber-600 dark:text-amber-400">Rs. {(data.total_outstanding || 0).toLocaleString()}</p>
              <p className="text-[10px] text-gray-500 mt-0.5">{isUrdu ? 'بقایا' : 'Outstanding'}</p>
            </div>
          </div>

          {/* Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white">{isUrdu ? 'لین دین' : 'Transactions'} ({transactions.length})</h3>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <input type="text" value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setPage(1); }} placeholder={isUrdu ? 'تلاش...' : 'Search...'} className="w-48 pl-9 pr-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase">#</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'نام' : 'Name'}</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'والد' : 'Father'}</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'فون' : 'Phone'}</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'پراڈکٹ' : 'Product'}</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'قسم' : 'Type'}</th>
                  <th className="px-3 py-2 text-end text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'رقم' : 'Amount'}</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'حالت' : 'Status'}</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'تاریخ' : 'Date'}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {paginatedTxns.map((tx: Transaction, idx: number) => (
                    <tr key={tx.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-3 py-2.5 text-gray-400 font-mono text-xs text-center">{(page - 1) * PER_PAGE + idx + 1}</td>
                      <td className="px-3 py-2.5"><span className="font-semibold text-gray-800 dark:text-white text-xs">{isUrdu ? (tx.customer_urdu || tx.customer_name) : tx.customer_name}</span></td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{tx.father_name || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{tx.phone || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{tx.product_name || '—'}</td>
                      <td className="px-3 py-2.5 text-center"><span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">{tx.type || (tx.installment_no === 0 ? (isUrdu ? 'ایڈوانس' : 'Down Pmt') : (isUrdu ? 'قسط' : 'Inst'))}</span></td>
                      <td className="px-3 py-2.5 text-end"><span className="font-bold text-gray-800 dark:text-white text-xs">Rs. {(tx.amount || 0).toLocaleString()}</span></td>
                      <td className="px-3 py-2.5 text-center"><span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-900/30"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{isUrdu ? 'ادا' : 'Paid'}</span></td>
                      <td className="px-3 py-2.5 text-center text-xs text-gray-500">{tx.date || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalTxnPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600">{isUrdu ? 'پچھلا' : 'Prev'}</button>
                <div className="flex items-center gap-1">{pagesArr.map(p => <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold ${p === page ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{p}</button>)}</div>
                <button onClick={() => setPage(p => Math.min(totalTxnPages, p + 1))} disabled={page === totalTxnPages} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600">{isUrdu ? 'اگلا' : 'Next'}</button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default CustomerReport;