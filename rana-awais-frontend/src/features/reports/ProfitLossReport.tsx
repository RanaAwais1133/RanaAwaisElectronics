import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const ProfitLossReport: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [cashProfit, setCashProfit] = useState<number | null>(null);
  const [accrualProfit, setAccrualProfit] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'revenue' | 'count' | 'name'>('revenue');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // ✅ Revenue + Profit alag-alag
  const [todayRevenue, setTodayRevenue] = useState<number | null>(null);
  const [todayProfit, setTodayProfit] = useState<number | null>(null);
  const [monthRevenue, setMonthRevenue] = useState<number | null>(null);
  const [monthProfit, setMonthProfit] = useState<number | null>(null);
  const [pendingTotal, setPendingTotal] = useState<number | null>(null);
  const [incomeExpense, setIncomeExpense] = useState<{ income: number; expense: number; net: number } | null>(null);
  const [productWise, setProductWise] = useState<any[]>([]);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);

  useEffect(() => {
    api.get('/accounting/today').then(res => {
      setTodayRevenue(res.data.revenue ?? null);
      setTodayProfit(res.data.profit ?? null);
    }).catch(() => {});
    api.get('/accounting/month').then(res => {
      setMonthRevenue(res.data.revenue ?? null);
      setMonthProfit(res.data.profit ?? null);
    }).catch(() => {});
    api.get('/accounting/pending-total').then(res => setPendingTotal(res.data.pending_total)).catch(() => {});
    api.get('/accounting/product-wise')
      .then(res => {
        setProductWise(res.data || []);
        const rev = (res.data || []).reduce((s: number, i: any) => s + (i.total || 0), 0);
        setTotalRevenue(rev);
      })
      .catch(() => setProductWise([]));
  }, []);

  const fetchReports = async () => {
    if (!start || !end) { setError(t('select_dates')); return; }
    setLoading(true); setError('');
    try {
      const [cashRes, accRes, summaryRes] = await Promise.all([
        api.get(`/accounting/profit-loss/cash?start=${start}&end=${end}`),
        api.get(`/accounting/profit-loss/accrual?start=${start}&end=${end}`),
        api.get(`/accounting/summary?start=${start}&end=${end}&basis=cash_flow`),
      ]);
      setCashProfit(cashRes.data.profit ?? 0);
      setAccrualProfit(accRes.data.profit ?? 0);
      setIncomeExpense({
        income: summaryRes.data.total_income || 0,
        expense: summaryRes.data.total_expense || 0,
        net: summaryRes.data.net_profit || 0,
      });
      toast.success(t('report_generated'));
    } catch (err) { setError(t('error_loading')); }
    finally { setLoading(false); }
  };

  const filteredProducts = useMemo(() => {
    let data = [...productWise];
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(i => (i._id || '').toLowerCase().includes(q));
    }
    data.sort((a, b) => {
      const val = sortBy === 'revenue' ? (a.total || 0) - (b.total || 0) :
                  sortBy === 'count' ? (a.count || 0) - (b.count || 0) :
                  (a._id || '').localeCompare(b._id || '');
      return sortOrder === 'desc' ? -val : val;
    });
    return data;
  }, [productWise, search, sortBy, sortOrder]);

  const isUrdu = i18n.language === 'ur';
  const reportRef = useRef<HTMLDivElement>(null);

  // PDF Download
  const downloadPDF = async () => {
    if (!reportRef.current) return;
    toast.loading(isUrdu ? 'پی ڈی ایف بنا رہے ہیں...' : 'Generating PDF...');
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      const fileName = `Profit_Loss_${start || 'report'}_${end || 'date'}.pdf`;
      pdf.save(fileName);
      toast.dismiss();
      toast.success(isUrdu ? 'پی ڈی ایف ڈاؤن لوڈ ہو گئی' : 'PDF downloaded');
    } catch (err) {
      toast.dismiss();
      toast.error(isUrdu ? 'پی ڈی ایف بنانے میں ناکامی' : 'PDF generation failed');
    }
  };

  const quickCards = [
    { label: "📈 " + (isUrdu ? "آج کی آمدنی" : "Today's Revenue"), value: todayRevenue, gradient: 'from-blue-500 to-cyan-500', bg: 'bg-blue-50 dark:bg-blue-900/20', textColor: 'text-blue-700 dark:text-blue-300' },
    { label: "💰 " + (isUrdu ? "آج کا منافع" : "Today's Profit"), value: todayProfit, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20', textColor: 'text-emerald-700 dark:text-emerald-300' },
    { label: "📊 " + (isUrdu ? "ماہانہ آمدنی" : "Month's Revenue"), value: monthRevenue, gradient: 'from-purple-500 to-pink-500', bg: 'bg-purple-50 dark:bg-purple-900/20', textColor: 'text-purple-700 dark:text-purple-300' },
    { label: "💎 " + (isUrdu ? "ماہانہ منافع" : "Month's Profit"), value: monthProfit, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-900/20', textColor: 'text-amber-700 dark:text-amber-300' },
    { label: "⏳ " + (isUrdu ? "زیر التواء اقساط" : "Pending Installments"), value: pendingTotal, gradient: 'from-rose-500 to-red-500', bg: 'bg-rose-50 dark:bg-rose-900/20', textColor: 'text-rose-700 dark:text-rose-300' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{t('profit_loss')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('profit_loss_description')}</p>
        </div>
        {(cashProfit !== null || incomeExpense) && (
          <button onClick={downloadPDF} className="px-5 py-2.5 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-sm font-semibold shadow-lg shadow-red-500/25 transition-all active:scale-95 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {isUrdu ? 'پی ڈی ایف ڈاؤن لوڈ' : 'Download PDF'}
          </button>
        )}
      </div>

      <div ref={reportRef}>

      {/* ✅ 5 Quick Cards — Revenue + Profit + Pending */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {quickCards.map((card, idx) => (
          <div key={idx} className={`${card.bg} rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-4 transition-all hover:shadow-lg hover:-translate-y-0.5 duration-300`}>
            <p className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">{card.label}</p>
            <p className={`text-lg font-extrabold ${card.textColor}`}>
              Rs. {card.value != null ? card.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
            </p>
          </div>
        ))}
      </div>

      {/* Date Range */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-5 sm:p-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('start_date')}</label>
            <input type="date" value={start} onChange={e => setStart(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('end_date')}</label>
            <input type="date" value={end} onChange={e => setEnd(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400" />
          </div>
          <button onClick={fetchReports} disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 active:scale-95">
            {loading ? <div className="spinner spinner-sm"></div> : t('generate_report')}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3 bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">{error}</p>}
      </div>

      {/* Cash vs Accrual */}
      {(cashProfit !== null && accrualProfit !== null) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 hover:shadow-md transition-all">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('cash_flow_profit')}</p>
            <p className={`text-3xl font-extrabold ${cashProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>Rs. {cashProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-400 mt-1">{t('cash_basis')}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6 hover:shadow-md transition-all">
            <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">{t('accrual_profit')}</p>
            <p className={`text-3xl font-extrabold ${accrualProfit >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>Rs. {accrualProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            <p className="text-xs text-gray-400 mt-1">{t('accrual_basis')}</p>
          </div>
        </div>
      )}

      {/* Income vs Expense */}
      {incomeExpense && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 p-6">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-5">{t('income_expense_breakdown')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">{t('total_income')}</p>
              <p className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-300">Rs. {incomeExpense.income.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-2xl p-5 text-center">
              <p className="text-sm font-semibold text-rose-600 dark:text-rose-400 mb-1">{t('total_expense')}</p>
              <p className="text-2xl font-extrabold text-rose-700 dark:text-rose-300">Rs. {incomeExpense.expense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
            <div className={`rounded-2xl p-5 text-center ${incomeExpense.net >= 0 ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
              <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 mb-1">{t('net_profit')}</p>
              <p className={`text-2xl font-extrabold ${incomeExpense.net >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>Rs. {incomeExpense.net.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
      )}

      {/* Product-wise Revenue */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="p-5 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{t('product_wise_revenue')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('active_plans_revenue')} — <span className="font-semibold text-gray-700 dark:text-gray-300">Rs. {totalRevenue.toLocaleString()}</span></p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input type="text" placeholder={t('search') + ' category...'} value={search} onChange={e => setSearch(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400 w-40" />
            <select value={sortBy} onChange={e => setSortBy(e.target.value as any)} className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700">
              <option value="revenue">{t('total_revenue')}</option>
              <option value="count">{t('plans_count')}</option>
              <option value="name">{t('category')}</option>
            </select>
            <button onClick={() => setSortOrder(s => s === 'asc' ? 'desc' : 'asc')} className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl text-sm dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all" title={sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900 uppercase text-xs tracking-wider">
                <th className="px-5 py-4 text-start font-bold text-gray-500 dark:text-gray-900">{t('category')}</th>
                <th className="px-5 py-4 text-end font-bold">{t('total_revenue')}</th>
                <th className="px-5 py-4 text-end font-bold">{t('plans_count')}</th>
                <th className="px-5 py-4 text-end font-bold">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filteredProducts.map((item: any, idx: number) => (
                <tr key={idx} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                  <td className="px-5 py-4 font-semibold text-gray-800 dark:text-white">{item._id || t('uncategorized')}</td>
                  <td className="px-5 py-4 text-right font-semibold text-gray-800 dark:text-white">Rs. {(item.total || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-5 py-4 text-right text-gray-600 dark:text-gray-300">{item.count || 0}</td>
                  <td className="px-5 py-4 text-right text-gray-500 dark:text-gray-400 text-xs">{totalRevenue > 0 ? ((item.total || 0) / totalRevenue * 100).toFixed(1) : 0}%</td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr><td colSpan={4} className="px-4 py-16 text-center text-gray-500"><svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>{t('no_report_data')}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    </div>
  );
};

export default ProfitLossReport;
