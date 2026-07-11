import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

const ProfitLossReport: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore(s => s.user);
  const clientInfo = useClientStore(s => s.info);

  const today = new Date().toISOString().slice(0, 10);
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [cashProfit, setCashProfit] = useState<number | null>(null);
  const [accrualProfit, setAccrualProfit] = useState<number | null>(null);
  const [incomeExpense, setIncomeExpense] = useState<{ income: number; expense: number; net: number } | null>(null);
  const [productWise, setProductWise] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  const [todayRevenue, setTodayRevenue] = useState<number>(0);
  const [todayProfit, setTodayProfit] = useState<number>(0);
  const [monthRevenue, setMonthRevenue] = useState<number>(0);
  const [monthProfit, setMonthProfit] = useState<number>(0);
  const [pendingTotal, setPendingTotal] = useState<number>(0);

  // Product table pagination
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'count' | 'name'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const PER_PAGE = 25;

  // Load dashboard stats
  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/dashboard/summary');
        const d = res.data;
        setTodayRevenue(d.todayRevenue || 0);
        setTodayProfit(d.todayProfit || 0);
        setMonthRevenue(d.monthRevenue || 0);
        setMonthProfit(d.monthProfit || 0);
        setPendingTotal(d.totalPending || 0);
      } catch { /* ignore */ }
      setStatsLoading(false);
    };
    load();
  }, []);

  const fetchReports = async () => {
    if (!start || !end) return;
    setLoading(true);
    try {
      const [accRes, summaryRes, productRes] = await Promise.all([
        api.get(`/accounting/profit-loss/accrual?start=${start}&end=${end}`),
        api.get(`/accounting/summary?start=${start}&end=${end}&basis=cash_flow`),
        api.get('/accounting/product-wise'),
      ]);
      // Cash profit = income - expense from accounting summary (same as Income vs Expense net)
      const income = summaryRes.data.total_income || 0;
      const expense = summaryRes.data.total_expense || 0;
      setCashProfit(income - expense);
      setAccrualProfit(accRes.data.profit ?? 0);
      setIncomeExpense({ income, expense, net: income - expense });
      setProductWise(productRes.data || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  // Auto-fetch on mount
  useEffect(() => { fetchReports(); }, []);

  // Product filtering/sorting
  const filteredProducts = useMemo(() => {
    let data = [...productWise];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(i => (i.category || i._id || '').toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const aName = a.category || a._id || '';
      const bName = b.category || b._id || '';
      if (sortBy === 'revenue') return sortOrder === 'desc' ? (b.total || 0) - (a.total || 0) : (a.total || 0) - (b.total || 0);
      if (sortBy === 'count') return sortOrder === 'desc' ? (b.count || 0) - (a.count || 0) : (a.count || 0) - (b.count || 0);
      return sortOrder === 'desc' ? bName.localeCompare(aName) : aName.localeCompare(bName);
    });
    return data;
  }, [productWise, search, sortBy, sortOrder]);

  const totalProductPages = Math.ceil(filteredProducts.length / PER_PAGE);
  const paginatedProducts = filteredProducts.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const totalRevenue = productWise.reduce((s: number, i: any) => s + (i.total || 0), 0);
  const pagesArr: number[] = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalProductPages, page + 2); i++) pagesArr.push(i);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const prodRows = productWise.map((item: any, idx: number) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px 10px;">${item.category || item._id || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 10px;text-align:right;">Rs. ${(item.total || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 10px;text-align:center;">${item.count || 0}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 10px;text-align:right;">${totalRevenue > 0 ? ((item.total || 0) / totalRevenue * 100).toFixed(1) : 0}%</td>
      </tr>
    `).join('');
    printWindow.document.write(`<html><head><title>${isUrdu ? 'منافع و نقصان' : 'Profit & Loss'}</title><style>@page{size:landscape;margin:8mm;}body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#1f2937;}.header{text-align:center;margin-bottom:20px;border-bottom:2px solid #1f2937;padding-bottom:15px;}.header h1{font-size:20px;margin:0 0 4px 0;}.stats{display:flex;gap:10px;justify-content:center;margin-bottom:15px;flex-wrap:wrap;}.stat-box{background:#f3f4f6;padding:10px 14px;border-radius:8px;text-align:center;}.stat-box .num{font-size:16px;font-weight:800;}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:10px;}th{background:#1f2937;color:white;border:1px solid #374151;padding:8px 6px;font-weight:600;font-size:10px;text-align:center;}td{border:1px solid #e5e7eb;padding:6px 10px;}.footer{text-align:center;margin-top:15px;font-size:10px;color:#9ca3af;}</style></head><body><div class="header"><h1>${clientInfo?.name || ''}</h1><div style="font-size:14px;">${isUrdu ? 'منافع و نقصان رپورٹ' : 'Profit & Loss Report'}</div><div style="font-size:11px;color:#6b7280;">${start} — ${end}</div></div><div class="stats"><div class="stat-box"><div class="num">Rs. ${(cashProfit || 0).toLocaleString()}</div><div style="font-size:9px;">${isUrdu ? 'کیش منافع' : 'Cash Profit'}</div></div><div class="stat-box"><div class="num">Rs. ${(accrualProfit || 0).toLocaleString()}</div><div style="font-size:9px;">${isUrdu ? 'اکرول منافع' : 'Accrual Profit'}</div></div>${incomeExpense ? `<div class="stat-box"><div class="num">Rs. ${incomeExpense.income.toLocaleString()}</div><div style="font-size:9px;">${isUrdu ? 'آمدنی' : 'Income'}</div></div><div class="stat-box"><div class="num">Rs. ${incomeExpense.expense.toLocaleString()}</div><div style="font-size:9px;">${isUrdu ? 'اخراجات' : 'Expense'}</div></div><div class="stat-box"><div class="num">Rs. ${incomeExpense.net.toLocaleString()}</div><div style="font-size:9px;">${isUrdu ? 'خالص' : 'Net'}</div></div>` : ''}</div><h3 style="font-size:14px;">${isUrdu ? 'پروڈکٹ وائز' : 'By Category'}</h3><table><thead><tr><th>${isUrdu ? 'کیٹیگری' : 'Category'}</th><th>${isUrdu ? 'آمدنی' : 'Revenue'}</th><th>${isUrdu ? 'پلانز' : 'Plans'}</th><th>%</th></tr></thead><tbody>${prodRows}</tbody></table><div class="footer">${new Date().toLocaleDateString()} | ${currentUser?.displayName || '—'}</div><script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script></body></html>`);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Quick Stats Cards */}
      {!statsLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-lg font-bold text-blue-600 dark:text-blue-400">Rs. {(todayRevenue || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'آج کی آمدنی' : "Today's Revenue"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Rs. {(todayProfit || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'آج کا منافع' : "Today's Profit"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">Rs. {(monthRevenue || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'ماہانہ آمدنی' : "Month's Revenue"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-lg font-bold text-amber-600 dark:text-amber-400">Rs. {(monthProfit || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'ماہانہ منافع' : "Month's Profit"}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-700 shadow-sm">
            <p className="text-lg font-bold text-red-600 dark:text-red-400">Rs. {(pendingTotal || 0).toLocaleString()}</p>
            <p className="text-[10px] text-gray-500 mt-1">{isUrdu ? 'زیر التوا' : 'Pending'}</p>
          </div>
        </div>
      )}

      {/* Date Range + Generate */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{isUrdu ? 'شروع' : 'Start'}</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1">{isUrdu ? 'اختتام' : 'End'}</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-semibold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <button onClick={fetchReports} disabled={loading} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50">
            {loading ? <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />{isUrdu ? '...' : '...'}</span> : (isUrdu ? 'رپورٹ بنائیں' : 'Generate Report')}
          </button>
          {(cashProfit !== null || incomeExpense) && (
            <button onClick={handlePrint} className="ml-auto px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              {isUrdu ? 'پرنٹ' : 'Print'}
            </button>
          )}
        </div>
      </div>

      {/* Cash vs Accrual */}
      {(cashProfit !== null && accrualProfit !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{isUrdu ? 'کیش فلو منافع' : 'Cash Flow Profit'}</p>
            <p className={`text-2xl font-extrabold ${cashProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Rs. {cashProfit.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-1">{isUrdu ? 'نقد بنیاد (اصل رقم موصول/خرچ)' : 'Cash basis (actual money received/spent)'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
            <p className="text-xs font-bold text-gray-500 uppercase mb-2">{isUrdu ? 'اکرول منافع' : 'Accrual Profit'}</p>
            <p className={`text-2xl font-extrabold ${accrualProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>Rs. {accrualProfit.toLocaleString()}</p>
            <p className="text-[10px] text-gray-400 mt-1">{isUrdu ? 'اکرول بنیاد (جب لین دین ہوا)' : 'Accrual basis (when transaction occurred)'}</p>
          </div>
        </div>
      )}

      {/* Income vs Expense */}
      {incomeExpense && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">{isUrdu ? 'آمدنی بمقابلہ اخراجات' : 'Income vs Expense'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center">
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">Rs. {incomeExpense.income.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-600 mt-1">{isUrdu ? 'کل آمدنی' : 'Total Income'}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
              <p className="text-lg font-bold text-red-700 dark:text-red-300">Rs. {incomeExpense.expense.toLocaleString()}</p>
              <p className="text-[10px] text-red-600 mt-1">{isUrdu ? 'کل اخراجات' : 'Total Expense'}</p>
            </div>
            <div className={`rounded-xl p-4 text-center ${incomeExpense.net >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-orange-50 dark:bg-orange-900/20'}`}>
              <p className={`text-lg font-bold ${incomeExpense.net >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-orange-700'}`}>Rs. {incomeExpense.net.toLocaleString()}</p>
              <p className="text-[10px] mt-1">{isUrdu ? 'خالص منافع' : 'Net Profit'}</p>
            </div>
          </div>
        </div>
      )}

      {/* Product-wise Revenue */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">{isUrdu ? 'پروڈکٹ کیٹیگری وائز' : 'Revenue by Product Category'}</h3>
            <p className="text-[10px] text-gray-500">{isUrdu ? 'فعال پلانز سے' : 'From active plans'} — Rs. {totalRevenue.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder={isUrdu ? 'تلاش...' : 'Search...'} className="w-40 pl-8 pr-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs dark:bg-gray-700 focus:ring-2 focus:ring-blue-400">
              <option value="revenue">{isUrdu ? 'آمدنی ↓' : 'Revenue ↓'}</option>
              <option value="count">{isUrdu ? 'تعداد' : 'Plans'}</option>
              <option value="name">{isUrdu ? 'نام' : 'Name'}</option>
            </select>
            <button onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')} className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-xs dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600" title={sortOrder}>{sortOrder === 'asc' ? '↑' : '↓'}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
              <th className="px-4 py-2 text-start text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'کیٹیگری' : 'Category'}</th>
              <th className="px-4 py-2 text-end text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'آمدنی' : 'Revenue'}</th>
              <th className="px-4 py-2 text-center text-[10px] font-bold text-gray-500 uppercase">{isUrdu ? 'پلانز' : 'Plans'}</th>
              <th className="px-4 py-2 text-end text-[10px] font-bold text-gray-500 uppercase">%</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {paginatedProducts.map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-gray-800 dark:text-white text-xs">{item.category || item._id || (isUrdu ? 'غیر درجہ' : 'Uncategorized')}</td>
                  <td className="px-4 py-2.5 text-end font-semibold text-xs">Rs. {(item.total || 0).toLocaleString()}</td>
                  <td className="px-4 py-2.5 text-center text-xs text-gray-600 dark:text-gray-300">{item.count || 0}</td>
                  <td className="px-4 py-2.5 text-end text-xs text-gray-500">{totalRevenue > 0 ? ((item.total || 0) / totalRevenue * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
              {paginatedProducts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-gray-400 text-xs">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data'}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {totalProductPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 dark:border-gray-700">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600">{isUrdu ? 'پچھلا' : 'Prev'}</button>
            <div className="flex items-center gap-1">{pagesArr.map(p => <button key={p} onClick={() => setPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold ${p === page ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{p}</button>)}</div>
            <button onClick={() => setPage(p => Math.min(totalProductPages, p + 1))} disabled={page === totalProductPages} className="px-3 py-1.5 text-xs font-semibold bg-gray-100 dark:bg-gray-700 rounded-lg disabled:opacity-30 hover:bg-gray-200 dark:hover:bg-gray-600">{isUrdu ? 'اگلا' : 'Next'}</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfitLossReport;