import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { getTodayInstallments } from '../../utils/api';
import { useClientStore } from '../../store/useClientStore';
import { useOfflineDashboard } from '../../hooks/useOfflineData';
import DashboardCard from './DashboardCard';
import DashboardModal from './DashboardModal';
import DashboardSummaryModal from './DashboardSummaryModal';
import AddPromiseModal from './AddPromiseModal';
import PromisesModal from '../promises/PromisesModal';

const LS_CACHE_KEY = 'dashboard_summary_cache';
const LS_CACHE_TTL = 5 * 60 * 1000;

interface DashboardSummary {
  todayCollection?: { total: number; count: number };
  totalPending?: number;
  pendingCustomers?: number;
  pendingTotal?: number;
  totalPaid?: number;
  totalCustomers?: number;
  activeInstallments?: number;
  completedInstallments?: number;
  overdueCount?: number;
  todayDueCount?: number;
  totalProducts?: number;
  lowStock?: number;
  inventoryValue?: number;
  ageingInventory?: number;
  todayProfit?: number;
  monthRevenue?: number;
  monthProfit?: number;
  todayRevenue?: number;
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

// ========== TODAY'S INSTALLMENT STATS MODAL ==========
interface TodayInstallmentStatsModalProps {
  onClose: () => void;
  isUrdu: boolean;
}

const TodayInstallmentStatsModal: React.FC<TodayInstallmentStatsModalProps> = ({ onClose, isUrdu }) => {
  const clientInfo = useClientStore((s) => s.info);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'collected' | 'remaining'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get('/dashboard/today-installment-stats')
      .then(res => { if (!cancelled) setStats(res.data); })
      .catch(() => { if (!cancelled) setStats(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filterRows = (rows: any[]) => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r: any) =>
      (r.customer_name || '').toLowerCase().includes(q) ||
      (r.customer_urdu || '').toLowerCase().includes(q) ||
      (r.father_name || '').toLowerCase().includes(q) ||
      (r.phone || '').includes(q) ||
      (r.product_name || '').toLowerCase().includes(q)
    );
  };

  const collected = filterRows(stats?.collected_customers || []);
  const remaining = filterRows(stats?.remaining_customers || []);
  const allRows = [...collected, ...remaining];

  const handlePrint = () => {
    if (!stats) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const colRows = (stats.collected_customers || []).map((c: any, i: number) =>
      `<tr><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${i+1}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${isUrdu?(c.customer_urdu||c.customer_name):c.customer_name}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.father_name||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.phone||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.product_name||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${c.installment_no||'—'}/${c.total_installments||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${c.due_date||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;">Rs. ${(c.amount||0).toLocaleString()}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;color:#059669;font-weight:600;">${isUrdu?'ادا شدہ':'Collected'}</td></tr>`
    ).join('');
    const remRows = (stats.remaining_customers || []).map((c: any, i: number) => {
      const status = c.status==='overdue'?(isUrdu?'تاخیر شدہ':'Overdue'):(isUrdu?'زیر التوا':'Pending');
      const color = c.status==='overdue'?'#dc2626':'#d97706';
      return `<tr><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${i+1}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${isUrdu?(c.customer_urdu||c.customer_name):c.customer_name}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.father_name||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.phone||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.product_name||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${c.installment_no||'—'}/${c.total_installments||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${c.due_date||'—'}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;">Rs. ${(c.amount||0).toLocaleString()}</td><td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;color:${color};font-weight:600;">${status}</td></tr>`;
    }).join('');
    printWindow.document.write(`<html><head><title>${isUrdu?'آج کی اقساط کا خلاصہ':"Today's Installment Summary"}</title><style>@page{size:landscape;margin:8mm;}body{font-family:'Segoe UI',Arial,sans-serif;padding:20px;color:#1f2937;}h1{text-align:center;font-size:18px;font-weight:700;margin-bottom:5px;}.stats{display:flex;gap:15px;justify-content:center;margin-bottom:15px;flex-wrap:wrap;}.stat-box{background:#f3f4f6;padding:8px 16px;border-radius:8px;text-align:center;}.stat-box .num{font-size:18px;font-weight:800;}table{width:100%;border-collapse:collapse;font-size:11px;margin-bottom:20px;}th{background:#1f2937;color:white;border:1px solid #374151;padding:8px 6px;font-weight:600;font-size:10px;text-align:center;}td{border:1px solid #e5e7eb;padding:6px 4px;}.section-title{font-size:14px;font-weight:700;margin:15px 0 8px 0;padding:6px 12px;border-radius:6px;}.collected-title{background:#d1fae5;color:#065f46;}.remaining-title{background:#fee2e2;color:#991b1b;}.footer{text-align:center;margin-top:15px;font-size:10px;color:#9ca3af;}</style></head><body><h1>${isUrdu?'آج کی اقساط کا خلاصہ':"Today's Installment Summary"}</h1><div class="stats"><div class="stat-box"><div class="num">${stats.total_due_count||0}</div><div class="lbl">${isUrdu?'کل واجب الادا':'Total Due'}</div></div><div class="stat-box"><div class="num">${stats.collected_count||0}</div><div class="lbl">${isUrdu?'وصول شدہ':'Collected'}</div></div><div class="stat-box"><div class="num">${stats.remaining_count||0}</div><div class="lbl">${isUrdu?'باقی':'Remaining'}</div></div><div class="stat-box"><div class="num">Rs. ${(stats.total_due_amount||0).toLocaleString()}</div><div class="lbl">${isUrdu?'کل رقم':'Total Amount'}</div></div><div class="stat-box"><div class="num" style="color:#059669;">Rs. ${(stats.collected_amount||0).toLocaleString()}</div><div class="lbl">${isUrdu?'وصول شدہ رقم':'Collected'}</div></div><div class="stat-box"><div class="num" style="color:#dc2626;">Rs. ${(stats.remaining_amount||0).toLocaleString()}</div><div class="lbl">${isUrdu?'باقی رقم':'Remaining'}</div></div></div>${colRows?`<div class="section-title collected-title">${isUrdu?'✅ وصول شدہ اقساط':'✅ Collected Installments'}</div><table><thead><tr><th>#</th><th>${isUrdu?'نام':'Name'}</th><th>${isUrdu?'والد':'Father'}</th><th>${isUrdu?'فون':'Phone'}</th><th>${isUrdu?'پروڈکٹ':'Product'}</th><th>${isUrdu?'قسط':'Inst#'}</th><th>${isUrdu?'تاریخ':'Date'}</th><th>${isUrdu?'رقم':'Amount'}</th><th>${isUrdu?'حالت':'Status'}</th></tr></thead><tbody>${colRows}</tbody></table>`:''}${remRows?`<div class="section-title remaining-title">${isUrdu?'⏳ باقی اقساط':'⏳ Remaining Installments'}</div><table><thead><tr><th>#</th><th>${isUrdu?'نام':'Name'}</th><th>${isUrdu?'والد':'Father'}</th><th>${isUrdu?'فون':'Phone'}</th><th>${isUrdu?'پروڈکٹ':'Product'}</th><th>${isUrdu?'قسط':'Inst#'}</th><th>${isUrdu?'تاریخ':'Date'}</th><th>${isUrdu?'رقم':'Amount'}</th><th>${isUrdu?'حالت':'Status'}</th></tr></thead><tbody>${remRows}</tbody></table>`:''}<div class="footer">${clientInfo?.name||''} — ${new Date().toLocaleDateString()}</div><script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script></body></html>`);
    printWindow.document.close();
  };

  const renderTable = (rows: any[], startIdx: number = 0) => rows.map((c: any, i: number) => {
    const instDisplay = `${c.installment_no ?? '—'}/${c.total_installments ?? '—'}`;
    const status = c.status === 'collected' ? (isUrdu ? 'ادا شدہ' : 'Collected')
      : c.status === 'overdue' ? (isUrdu ? 'تاخیر شدہ' : 'Overdue')
      : (isUrdu ? 'زیر التوا' : 'Pending');
    const statusCls = c.status === 'collected' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
      : c.status === 'overdue' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
      : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';
    return (
      <tr key={startIdx + i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
        <td className="px-3 py-2.5 text-gray-400 font-mono text-xs text-center">{startIdx + i + 1}</td>
        <td className="px-3 py-2.5"><span className="font-semibold text-gray-800 dark:text-white text-xs">{isUrdu ? (c.customer_urdu || c.customer_name) : c.customer_name}</span></td>
        <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.father_name || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.phone || '—'}</td>
        <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.product_name || '—'}</td>
        <td className="px-3 py-2.5 text-center text-xs text-gray-600 dark:text-gray-300">{instDisplay}</td>
        <td className="px-3 py-2.5 text-center text-xs text-gray-500">{c.due_date || '—'}</td>
        <td className="px-3 py-2.5 text-end"><span className="font-bold text-gray-800 dark:text-white text-xs">Rs. {(c.amount || 0).toLocaleString()}</span></td>
        <td className="px-3 py-2.5 text-center"><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusCls}`}><span className={`w-1.5 h-1.5 rounded-full ${c.status === 'collected' ? 'bg-emerald-500' : c.status === 'overdue' ? 'bg-red-500' : 'bg-amber-500'}`} />{status}</span></td>
      </tr>
    );
  });

  const activeData = activeTab === 'collected' ? collected : activeTab === 'remaining' ? remaining : allRows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isUrdu ? 'آج کی اقساط کا خلاصہ' : "Today's Installment Summary"}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {stats && <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>{isUrdu ? 'پرنٹ' : 'Print'}</button>}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
          </div>
        </div>
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={isUrdu ? 'تلاش کریں...' : 'Search...'} className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"><div className="w-10 h-10 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" /><p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p></div>
          ) : !stats ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3"><p className="text-gray-400 font-medium">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data'}</p></div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700"><p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total_due_count || 0}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{isUrdu ? 'کل واجب الادا' : 'Total Due'}</p></div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-100 dark:border-emerald-800"><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.collected_count || 0}</p><p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{isUrdu ? 'وصول شدہ' : 'Collected'}</p></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-100 dark:border-red-800"><p className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.remaining_count || 0}</p><p className="text-xs text-red-600 dark:text-red-400 mt-1">{isUrdu ? 'باقی' : 'Remaining'}</p></div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center border border-gray-100 dark:border-gray-700"><p className="text-2xl font-bold text-gray-900 dark:text-white">Rs. {(stats.total_due_amount || 0).toLocaleString()}</p><p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{isUrdu ? 'کل رقم' : 'Total Amount'}</p></div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-100 dark:border-emerald-800"><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">Rs. {(stats.collected_amount || 0).toLocaleString()}</p><p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">{isUrdu ? 'وصول شدہ رقم' : 'Collected'}</p></div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-100 dark:border-red-800"><p className="text-2xl font-bold text-red-600 dark:text-red-400">Rs. {(stats.remaining_amount || 0).toLocaleString()}</p><p className="text-xs text-red-600 dark:text-red-400 mt-1">{isUrdu ? 'باقی رقم' : 'Remaining'}</p></div>
              </div>
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                {[{ key: 'all', label: isUrdu ? 'تمام' : 'All' },{ key: 'collected', label: isUrdu ? 'وصول شدہ' : 'Collected' },{ key: 'remaining', label: isUrdu ? 'باقی' : 'Remaining' }].map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.key ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>{tab.label}</button>
                ))}
              </div>
              {activeData.length > 0 ? (
                <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
                      <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                      <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                      <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'والد' : 'Father'}</th>
                      <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'فون' : 'Phone'}</th>
                      <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'پروڈکٹ' : 'Product'}</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'قسط#' : 'Inst#'}</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                      <th className="px-3 py-2 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                      <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'حالت' : 'Status'}</th>
                    </tr></thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">{renderTable(activeData)}</tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 gap-3"><div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full"><svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><p className="text-gray-400 font-medium">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data'}</p></div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== SKELETON LOADER ==========
const DashboardSkeleton: React.FC<{ isUrdu: boolean }> = ({ isUrdu }) => (
  <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse" />
        <div>
          <div className="w-40 h-7 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-1" />
          <div className="w-56 h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
    </div>
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

// ========== TODAY INSTALLMENTS CARD ==========
const TodayInstallmentsCard: React.FC<{ isUrdu: boolean }> = ({ isUrdu }) => {
  const clientInfo = useClientStore((s) => s.info);
  const [installments, setInstallments] = useState<TodayInstallment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    
    getTodayInstallments()
      .then((data: any) => {
        if (cancelled) return;
        const items = Array.isArray(data) ? data : (data?.data ? (Array.isArray(data.data) ? data.data : []) : []);
        setInstallments(items);
      })
      .catch(() => {
        // ✅ OFFLINE FALLBACK: Try to load from IndexedDB cache
        if (!cancelled) {
          import('../../db/indexeddb').then(({ offlineDB }) => {
            offlineDB.getCachedInstallments().then(cached => {
              if (cached && cached.length > 0 && !cancelled) {
                // Filter today's installments from cached data
                const today = new Date().toISOString().split('T')[0];
                const todayInsts = cached.filter((inst: any) => 
                  inst.due_date === today || inst.dueDate === today
                );
                if (todayInsts.length > 0) {
                  setInstallments(todayInsts as any);
                }
              }
            }).catch(() => {});
          }).catch(() => {});
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
      
    return () => { cancelled = true; };
  }, []);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = installments.map((item, idx) => {
      const name = isUrdu ? (item.customer_urdu || item.customer_name || '—') : (item.customer_name || '—');
      const father = item.father_name || '—';
      const phone = item.phone || '—';
      const product = item.product_name || '—';
      const instDisplay = `${item.installment_no ?? '—'}/${item.total_installments ?? '—'}`;
      const status = item.is_overdue ? (isUrdu ? 'تاخیر شدہ' : 'Overdue') : (isUrdu ? 'زیر التوا' : 'Pending');
      const statusColor = item.is_overdue ? '#dc2626' : '#d97706';

      return `<tr>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${name}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;">${father}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;">${phone}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;">${product}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;text-align:center;">${instDisplay}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;text-align:right;">Rs. ${(item.amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;text-align:center;">${item.due_date || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;text-align:center;color:${statusColor};font-weight:600;">${status}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`<html><head><title>${isUrdu ? 'آج کی اقساط' : "Today's Installments"}</title>
    <style>
      @page { size: landscape; margin: 8mm; }
      body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1f2937; }
      h1 { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 5px; }
      .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 15px; }
      table { width: 100%; border-collapse: collapse; font-size: 11px; }
      th { background: #1f2937; color: white; border:1px solid #374151; padding: 8px 6px; font-weight: 600; font-size: 10px; text-align: center; }
      td { border:1px solid #e5e7eb; padding: 6px 4px; }
      .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #9ca3af; }
    </style></head><body>
      <h1>${isUrdu ? 'آج کی اقساط' : "Today's Installments"}</h1>
      <div class="subtitle">${clientInfo?.name || ''} — ${new Date().toLocaleDateString()}</div>
      <table><thead><tr>
        <th>#</th><th>${isUrdu ? 'نام' : 'Name'}</th><th>${isUrdu ? 'والد' : 'Father'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th>
        <th>${isUrdu ? 'پروڈکٹ' : 'Product'}</th><th>${isUrdu ? 'قسط' : 'Inst'}</th><th>${isUrdu ? 'رقم' : 'Amount'}</th>
        <th>${isUrdu ? 'تاریخ' : 'Date'}</th><th>${isUrdu ? 'حالت' : 'Status'}</th>
      </tr></thead><tbody>${rows}</tbody></table>
      <div class="footer">${isUrdu ? 'کل اقساط' : 'Total Installments'}: ${installments.length}</div>
      <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
    </body></html>`);
    printWindow.document.close();
  };

  const overdueCount = installments.filter(i => i.is_overdue).length;
  const pendingCount = installments.filter(i => !i.is_overdue).length;
  const totalAmount = installments.reduce((sum, i) => sum + (i.amount || 0), 0);
  const displayItems = showAll ? installments : installments.slice(0, 10);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{isUrdu ? 'آج کی اقساط' : "Today's Installments"}</h3>
            <p className="text-[10px] text-gray-500 dark:text-gray-400">{new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowStatsModal(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-semibold hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            {isUrdu ? 'شماریات' : 'Stats'}
          </button>
          {installments.length > 0 && (
            <button onClick={handlePrint} className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-[10px] font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              {isUrdu ? 'پرنٹ' : 'Print'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
        </div>
      ) : installments.length === 0 ? (
        <div className="p-8 flex flex-col items-center gap-3">
          <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-sm text-gray-400 font-medium">{isUrdu ? 'آج کوئی اقساط نہیں ہیں' : 'No installments due today'}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-0 border-b border-gray-100 dark:border-gray-700">
            <div className="p-3 text-center border-r border-gray-100 dark:border-gray-700">
              <p className="text-lg font-bold text-gray-900 dark:text-white">{installments.length}</p>
              <p className="text-[10px] text-gray-500">{isUrdu ? 'کل' : 'Total'}</p>
            </div>
            <div className="p-3 text-center border-r border-gray-100 dark:border-gray-700">
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{pendingCount}</p>
              <p className="text-[10px] text-gray-500">{isUrdu ? 'زیر التوا' : 'Pending'}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-lg font-bold text-red-600 dark:text-red-400">{overdueCount}</p>
              <p className="text-[10px] text-gray-500">{isUrdu ? 'تاخیر شدہ' : 'Overdue'}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'والد' : 'Father'}</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'فون' : 'Phone'}</th>
                  <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'پروڈکٹ' : 'Product'}</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'قسط' : 'Inst'}</th>
                  <th className="px-3 py-2 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                  <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'حالت' : 'Status'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {displayItems.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-3 py-2.5 text-gray-400 font-mono text-xs text-center">{idx + 1}</td>
                    <td className="px-3 py-2.5">
                      <span className="font-semibold text-gray-800 dark:text-white text-xs">
                        {isUrdu ? (item.customer_urdu || item.customer_name || '—') : (item.customer_name || '—')}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{item.father_name || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{item.phone || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{item.product_name || '—'}</td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-600 dark:text-gray-300">
                      {item.installment_no ?? '—'}/{item.total_installments ?? '—'}
                    </td>
                    <td className="px-3 py-2.5 text-end">
                      <span className="font-bold text-gray-900 dark:text-white text-xs">Rs. {(item.amount || 0).toLocaleString()}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-xs text-gray-500">{item.due_date || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {item.is_overdue ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                          {isUrdu ? 'تاخیر شدہ' : 'Overdue'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-semibold">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                          {isUrdu ? 'زیر التوا' : 'Pending'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {installments.length > 10 && (
            <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => setShowAll(!showAll)}
                className="w-full text-center text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                {showAll
                  ? (isUrdu ? 'کم دکھائیں' : 'Show Less')
                  : (isUrdu ? `مزید ${installments.length - 10} دکھائیں` : `Show ${installments.length - 10} More`)}
              </button>
            </div>
          )}
        </>
      )}

      {showStatsModal && <TodayInstallmentStatsModal onClose={() => setShowStatsModal(false)} isUrdu={isUrdu} />}
    </div>
  );
};

// ========== MONTHLY REPORT MODAL ==========
interface MonthlyReportModalProps {
  onClose: () => void;
  isUrdu: boolean;
}

const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({ onClose, isUrdu }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [activeTab, setActiveTab] = useState<'all' | 'collected' | 'remaining'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get(`/dashboard/monthly-report?month=${selectedMonth}`)
      .then(res => {
        if (!cancelled) setReport(res.data);
      })
      .catch(() => {
        if (!cancelled) setReport(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedMonth]);

  const handlePrint = () => {
    if (!report) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const months = [
      'January','February','March','April','May','June',
      'July','August','September','October','November','December'
    ];
    const [year, month] = selectedMonth.split('-');
    const monthName = months[parseInt(month) - 1];

    const collectedRows = (report.collected_customers || []).map((c: any, i: number) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${isUrdu ? (c.customer_name_urdu || c.customer_name) : c.customer_name}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.father_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.phone || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.product_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;">Rs. ${(c.due_amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;color:#059669;">Rs. ${(c.collected_amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${c.due_date || '—'}</td>
      </tr>
    `).join('');

    const remainingRows = (report.remaining_customers || []).map((c: any, i: number) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${i + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${isUrdu ? (c.customer_name_urdu || c.customer_name) : c.customer_name}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.father_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.phone || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;">${c.product_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;">Rs. ${(c.due_amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;color:#dc2626;">Rs. ${(c.remaining_amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;">${c.due_date || '—'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
      <head><title>${isUrdu ? 'ماہانہ رپورٹ' : 'Monthly Report'} - ${monthName} ${year}</title>
      <style>
        @page { size: landscape; margin: 8mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1f2937; }
        h1 { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 5px; }
        .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 15px; }
        .stats { display: flex; gap: 15px; justify-content: center; margin-bottom: 15px; flex-wrap: wrap; }
        .stat-box { background: #f3f4f6; padding: 8px 16px; border-radius: 8px; text-align: center; min-width: 120px; }
        .stat-box .num { font-size: 18px; font-weight: 800; }
        .stat-box .lbl { font-size: 10px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 20px; }
        th { background: #1f2937; color: white; border:1px solid #374151; padding: 8px 6px; font-weight: 600; font-size: 10px; text-align: center; }
        td { border:1px solid #e5e7eb; padding: 6px 4px; }
        .section-title { font-size: 14px; font-weight: 700; margin: 15px 0 8px 0; padding: 6px 12px; border-radius: 6px; }
        .collected-title { background: #d1fae5; color: #065f46; }
        .remaining-title { background: #fee2e2; color: #991b1b; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #9ca3af; }
      </style>
      </head>
      <body>
        <h1>${isUrdu ? 'ماہانہ رپورٹ' : 'Monthly Report'}</h1>
        <div class="subtitle">${monthName} ${year}</div>
        <div class="stats">
          <div class="stat-box"><div class="num">Rs. ${(report.total_collection || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'کل وصولی' : 'Total Collection'}</div></div>
          <div class="stat-box"><div class="num">${report.total_customers || 0}</div><div class="lbl">${isUrdu ? 'کل گاہک' : 'Total Customers'}</div></div>
          <div class="stat-box"><div class="num">${report.new_customers || 0}</div><div class="lbl">${isUrdu ? 'نئے گاہک' : 'New Customers'}</div></div>
          <div class="stat-box"><div class="num">Rs. ${(report.total_profit || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'کل منافع' : 'Total Profit'}</div></div>
          <div class="stat-box"><div class="num">Rs. ${(report.total_due_amount || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'کل واجب الادا' : 'Total Due'}</div></div>
          <div class="stat-box"><div class="num" style="color:#059669;">Rs. ${(report.total_collected_amount || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'وصول شدہ' : 'Collected'}</div></div>
          <div class="stat-box"><div class="num" style="color:#dc2626;">Rs. ${(report.total_remaining_amount || 0).toLocaleString()}</div><div class="lbl">${isUrdu ? 'باقی' : 'Remaining'}</div></div>
        </div>
        ${collectedRows ? `<div class="section-title collected-title">${isUrdu ? '✅ وصول شدہ اقساط' : '✅ Collected Installments'} (${report.collected_count || 0})</div><table><thead><tr><th>#</th><th>${isUrdu ? 'نام' : 'Name'}</th><th>${isUrdu ? 'والد' : 'Father'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th><th>${isUrdu ? 'پروڈکٹ' : 'Product'}</th><th>${isUrdu ? 'رقم' : 'Amount'}</th><th>${isUrdu ? 'وصول شدہ' : 'Collected'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th></tr></thead><tbody>${collectedRows}</tbody></table>` : ''}
        ${remainingRows ? `<div class="section-title remaining-title">${isUrdu ? '⏳ باقی اقساط' : '⏳ Remaining Installments'} (${report.remaining_count || 0})</div><table><thead><tr><th>#</th><th>${isUrdu ? 'نام' : 'Name'}</th><th>${isUrdu ? 'والد' : 'Father'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th><th>${isUrdu ? 'پروڈکٹ' : 'Product'}</th><th>${isUrdu ? 'رقم' : 'Amount'}</th><th>${isUrdu ? 'باقی' : 'Remaining'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th></tr></thead><tbody>${remainingRows}</tbody></table>` : ''}
        <div class="footer">Generated on ${new Date().toLocaleDateString()}</div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // Filter customers based on search
  const filterCustomers = (customers: any[]) => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter((c: any) =>
      (c.customer_name || '').toLowerCase().includes(q) ||
      (c.customer_name_urdu || '').toLowerCase().includes(q) ||
      (c.father_name || '').toLowerCase().includes(q) ||
      (c.phone || '').includes(q) ||
      (c.product_name || '').toLowerCase().includes(q)
    );
  };

  const collectedCustomers = filterCustomers(report?.collected_customers || []);
  const remainingCustomers = filterCustomers(report?.remaining_customers || []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
              <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{isUrdu ? 'ماہانہ رپورٹ' : 'Monthly Report'}</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">{selectedMonth}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <button onClick={handlePrint} className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                {isUrdu ? 'پرنٹ' : 'Print'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full sm:w-auto px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isUrdu ? 'تلاش کریں...' : 'Search...'}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
            </div>
          ) : !report ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-gray-400 font-medium">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data available'}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-3 text-center border border-indigo-100 dark:border-indigo-800">
                  <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">Rs. {(report.total_collection || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-0.5">{isUrdu ? 'کل وصولی' : 'Total Collection'}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center border border-blue-100 dark:border-blue-800">
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{report.total_customers || 0}</p>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-0.5">{isUrdu ? 'کل گاہک' : 'Total Customers'}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{report.new_customers || 0}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{isUrdu ? 'نئے گاہک' : 'New Customers'}</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center border border-amber-100 dark:border-amber-800">
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">Rs. {(report.total_profit || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">{isUrdu ? 'کل منافع' : 'Total Profit'}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center border border-purple-100 dark:border-purple-800">
                  <p className="text-lg font-bold text-purple-600 dark:text-purple-400">Rs. {(report.total_due_amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-purple-600 dark:text-purple-400 mt-0.5">{isUrdu ? 'کل واجب الادا' : 'Total Due'}</p>
                </div>
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center border border-emerald-100 dark:border-emerald-800">
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Rs. {(report.total_collected_amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">{isUrdu ? 'وصول شدہ' : 'Collected'}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center border border-red-100 dark:border-red-800">
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">Rs. {(report.total_remaining_amount || 0).toLocaleString()}</p>
                  <p className="text-[10px] text-red-600 dark:text-red-400 mt-0.5">{isUrdu ? 'باقی' : 'Remaining'}</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
                {[
                  { key: 'all', label: isUrdu ? 'تمام' : 'All' },
                  { key: 'collected', label: isUrdu ? 'وصول شدہ' : 'Collected' },
                  { key: 'remaining', label: isUrdu ? 'باقی' : 'Remaining' },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as any)}
                    className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === tab.key
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Collected Customers */}
              {(activeTab === 'all' || activeTab === 'collected') && collectedCustomers.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {isUrdu ? 'وصول شدہ اقساط' : 'Collected Installments'} ({collectedCustomers.length})
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-emerald-50 dark:bg-emerald-900/20">
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'والد' : 'Father'}</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'فون' : 'Phone'}</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'پروڈکٹ' : 'Product'}</th>
                          <th className="px-3 py-2 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                          <th className="px-3 py-2 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'وصول شدہ' : 'Collected'}</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {collectedCustomers.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-3 py-2.5 text-gray-400 font-mono text-xs text-center">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-gray-800 dark:text-white text-xs">
                                {isUrdu ? (c.customer_name_urdu || c.customer_name) : c.customer_name}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.father_name || '—'}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.phone || '—'}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.product_name || '—'}</td>
                            <td className="px-3 py-2.5 text-end">
                              <span className="font-bold text-gray-800 dark:text-white text-xs">Rs. {(c.due_amount || 0).toLocaleString()}</span>
                            </td>
                            <td className="px-3 py-2.5 text-end">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400 text-xs">Rs. {(c.collected_amount || 0).toLocaleString()}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-gray-500">{c.due_date || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Remaining Customers */}
              {(activeTab === 'all' || activeTab === 'remaining') && remainingCustomers.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {isUrdu ? 'باقی اقساط' : 'Remaining Installments'} ({remainingCustomers.length})
                  </h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700 max-h-80 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0">
                        <tr className="bg-red-50 dark:bg-red-900/20">
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">#</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'نام' : 'Name'}</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'والد' : 'Father'}</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'فون' : 'Phone'}</th>
                          <th className="px-3 py-2 text-start text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'پروڈکٹ' : 'Product'}</th>
                          <th className="px-3 py-2 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'رقم' : 'Amount'}</th>
                          <th className="px-3 py-2 text-end text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'باقی' : 'Remaining'}</th>
                          <th className="px-3 py-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">{isUrdu ? 'آخری تاریخ' : 'Due Date'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                        {remainingCustomers.map((c: any, i: number) => (
                          <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                            <td className="px-3 py-2.5 text-gray-400 font-mono text-xs text-center">{i + 1}</td>
                            <td className="px-3 py-2.5">
                              <span className="font-semibold text-gray-800 dark:text-white text-xs">
                                {isUrdu ? (c.customer_name_urdu || c.customer_name) : c.customer_name}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.father_name || '—'}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.phone || '—'}</td>
                            <td className="px-3 py-2.5 text-xs text-gray-600 dark:text-gray-300">{c.product_name || '—'}</td>
                            <td className="px-3 py-2.5 text-end">
                              <span className="font-bold text-gray-800 dark:text-white text-xs">Rs. {(c.due_amount || 0).toLocaleString()}</span>
                            </td>
                            <td className="px-3 py-2.5 text-end">
                              <span className="font-bold text-red-600 dark:text-red-400 text-xs">Rs. {(c.remaining_amount || 0).toLocaleString()}</span>
                            </td>
                            <td className="px-3 py-2.5 text-center text-xs text-gray-500">{c.due_date || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* No results */}
              {collectedCustomers.length === 0 && remainingCustomers.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <p className="text-gray-400 font-medium">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data available'}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ========== MAIN DASHBOARD PAGE COMPONENT ==========
const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const clientInfo = useClientStore((s) => s.info);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState | null>(null);
  const [showPromiseModal, setShowPromiseModal] = useState(false);
  const [showPromisesList, setShowPromisesList] = useState(false);
  const navigate = useNavigate();

  // ✅ Use offline-first dashboard hook
  const {
    data: summary,
    loading,
    error,
    isOffline,
    isStale,
    refresh: handleRefresh,
  } = useOfflineDashboard();

  if (loading && !summary) {
    return <DashboardSkeleton isUrdu={isUrdu} />;
  }

  if (error && !summary) {
    return (
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-red-200 dark:border-red-800 p-8 text-center">
          <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full inline-flex mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{isUrdu ? 'ڈیش بورڈ لوڈ کرنے میں مسئلہ' : 'Failed to load dashboard'}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {isUrdu ? 'دوبارہ کوشش کریں' : 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  const todayCollection = summary?.todayCollection || { total: 0, count: 0 };
  const totalPending = summary?.totalPending || 0;
  const totalPaid = summary?.totalPaid || 0;
  const totalCustomers = summary?.totalCustomers || 0;
  const activeInstallments = summary?.activeInstallments || 0;
  const completedInstallments = summary?.completedInstallments || 0;
  const overdueCustomers = summary?.overdueCount || 0;
  const todayDue = summary?.todayDueCount || 0;
  const totalProducts = summary?.totalProducts || 0;
  const lowStockItems = summary?.lowStock || 0;
  const inventoryValue = summary?.inventoryValue || 0;
  const ageingStock = summary?.ageingInventory || 0;
  const todayProfit = summary?.todayProfit || 0;
  const monthRevenue = summary?.monthRevenue || 0;
  const monthProfit = summary?.monthProfit || 0;
  const activePlans = summary?.activeInstallments || 0;
  const todayRevenue = summary?.todayRevenue || 0;
  const pendingCustomers = summary?.pendingCustomers || 0;
  const pendingTotal = summary?.pendingTotal || 0;
  const monthlyDueCount = summary?.monthlyDueCount || 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-gray-900 to-gray-700 dark:from-white dark:to-gray-200 rounded-xl shadow-sm">
            <svg className="w-5 h-5 text-white dark:text-gray-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {clientInfo?.name || (isUrdu ? 'ڈیش بورڈ' : 'Dashboard')}
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-GB', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/reports/monthly')}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all border border-indigo-200 dark:border-indigo-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {isUrdu ? 'ماہانہ رپورٹ' : 'Monthly Report'}
          </button>
          <button
            onClick={() => setShowPromisesList(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all border border-amber-200 dark:border-amber-800"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {isUrdu ? 'وعدے دیکھیں' : 'View Promises'}
          </button>
          <button
            onClick={() => setShowPromiseModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg shadow-amber-500/25"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {isUrdu ? 'وعدہ شامل کریں' : 'Add Promise'}
          </button>
          <button
            onClick={handleRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {isUrdu ? 'ریفریش' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Quick Overview */}
      <div className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{isUrdu ? 'فوری جائزہ' : 'Quick Overview'}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Today's Collection */}
          <div className="bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-emerald-900 rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all cursor-pointer" onClick={() => setSummaryModal({ title: isUrdu ? 'آج کی وصولی' : "Today's Collection", type: 'today' })}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-1 rounded-full">
                {isUrdu ? 'آج' : 'Today'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isUrdu ? 'آج کی وصولی' : "Today's Collection"}</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{isUrdu ? 'رقم' : 'Amount'}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Rs. {(todayCollection.total || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{isUrdu ? 'گنتی' : 'Count'}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{todayCollection.count || 0}</span>
              </div>
            </div>
          </div>

          {/* Pending Payments */}
          <div className="bg-white dark:bg-gray-800 border-2 border-amber-100 dark:border-amber-900 rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all cursor-pointer" onClick={() => setSummaryModal({ title: isUrdu ? 'زیر التوا ادائیگیاں' : 'Pending Payments', type: 'pending' })}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2 py-1 rounded-full">
                {isUrdu ? 'زیر التوا' : 'Pending'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isUrdu ? 'زیر التوا ادائیگیاں' : 'Pending Payments'}</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{isUrdu ? 'متاثرہ گاہک' : 'Affected Customers'}</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{pendingCustomers}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{isUrdu ? 'بقایا رقم' : 'Pending Amount'}</span>
                <span className="text-sm font-bold text-gray-900 dark:text-white">Rs. {(pendingTotal || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Monthly Revenue */}
          <div className="bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900 rounded-2xl p-5 sm:p-6 hover:shadow-lg transition-all cursor-pointer" onClick={() => setSummaryModal({ title: isUrdu ? 'ماہانہ آمدنی' : 'Monthly Revenue', type: 'month' })}>
            <div className="flex items-start justify-between mb-4">
              <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
              </div>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-full">
                {isUrdu ? 'ماہانہ' : 'Monthly'}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isUrdu ? 'ماہانہ آمدنی' : 'Monthly Revenue'}</p>
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{isUrdu ? 'آمدنی' : 'Revenue'}</span>
                <span className="text-sm font-bold text-blue-600 dark:text-blue-400">Rs. {(monthRevenue || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-gray-400">{isUrdu ? 'منافع' : 'Profit'}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Rs. {(monthProfit || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Today's Installments Card */}
        <div className="lg:col-span-2">
          <TodayInstallmentsCard isUrdu={isUrdu} />
        </div>

        {/* Quick Stats */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{isUrdu ? 'فوری اعداد و شمار' : 'Quick Stats'}</h3>
            <div className="space-y-1">
              <button onClick={() => setModal({ title: isUrdu ? 'کل گاہک' : 'Total Customers', endpoint: '/dashboard/customers-with-finance' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'کل گاہک' : 'Total Customers'}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{totalCustomers}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'فعال منصوبے' : 'Active Plans', endpoint: '/dashboard/active-installments' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'فعال منصوبے' : 'Active Plans'}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{activePlans}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'فعال اقساط' : 'Active Installments', endpoint: '/dashboard/active-installments' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'فعال اقساط' : 'Active Installments'}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{activeInstallments}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'مکمل اقساط' : 'Completed', endpoint: '/dashboard/completed-installments' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'مکمل اقساط' : 'Completed'}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{completedInstallments}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'تاخیر شدہ' : 'Overdue', endpoint: '/dashboard/overdue-installments' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'تاخیر شدہ' : 'Overdue'}</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{overdueCustomers}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'آج کی واجبی' : 'Due Today', endpoint: '/dashboard/today-installments' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'آج کی واجبی' : 'Due Today'}</span>
                </div>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{todayDue}</span>
              </button>
            </div>
          </div>

          {/* Inventory Quick View */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">{isUrdu ? 'انوینٹری' : 'Inventory'}</h3>
            <div className="space-y-1">
              <button onClick={() => setModal({ title: isUrdu ? 'کل مصنوعات' : 'Total Products', endpoint: '/products?limit=200' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'کل مصنوعات' : 'Total Products'}</span>
                </div>
                <span className="text-sm font-bold text-gray-900 dark:text-white">{totalProducts}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'کم اسٹاک' : 'Low Stock', endpoint: '/dashboard/low-stock' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'کم اسٹاک' : 'Low Stock'}</span>
                </div>
                <span className="text-sm font-bold text-red-600 dark:text-red-400">{lowStockItems}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'انوینٹری ویلیو' : 'Inventory Value', endpoint: '/products?limit=200' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'انوینٹری ویلیو' : 'Inventory Value'}</span>
                </div>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Rs. {(inventoryValue || 0).toLocaleString()}</span>
              </button>
              <button onClick={() => setModal({ title: isUrdu ? 'پرانا اسٹاک' : 'Ageing Stock', endpoint: '/products?limit=200' })} className="w-full flex items-center justify-between py-2.5 px-2 border-b border-gray-100 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg transition-colors cursor-pointer">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500" />
                  <span className="text-xs text-gray-600 dark:text-gray-300">{isUrdu ? 'پرانا اسٹاک' : 'Ageing Stock'}</span>
                </div>
                <span className="text-sm font-bold text-orange-600 dark:text-orange-400">{ageingStock}</span>
              </button>
            </div>
          </div>
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
      {showPromiseModal && (
        <AddPromiseModal onClose={() => setShowPromiseModal(false)} isUrdu={isUrdu} onSuccess={handleRefresh} />
      )}
      {showPromisesList && (
        <PromisesModal onClose={() => setShowPromisesList(false)} isUrdu={isUrdu} onSuccess={handleRefresh} />
      )}
    </div>
  );
};

export default DashboardPage;
