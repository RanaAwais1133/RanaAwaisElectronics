import React, { useEffect, useState, useMemo } from 'react';
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

interface ModalState { title: string; endpoint: string; }
interface SummaryModalState { title: string; type: 'today' | 'pending' | 'month'; }

// Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const s = status?.toLowerCase();
  const styles = s === 'in_stock' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : s === 'sold' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    : s === 'returned' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
    : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${styles}`}>{status || '—'}</span>;
};

// TODAY INSTALLMENTS CARD
const TodayInstallmentsCard: React.FC<{ isUrdu: boolean }> = ({ isUrdu }) => {
  const [installments, setInstallments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getTodayInstallments()
      .then((data: any) => { if (!cancelled) setInstallments(Array.isArray(data) ? data : (data?.data || [])); })
      .catch(() => { if (!cancelled) setInstallments([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const overdueCount = installments.filter((i: any) => i.is_overdue).length;
  const pendingCount = installments.filter((i: any) => !i.is_overdue).length;
  const display = showAll ? installments : installments.slice(0, 10);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-gray-900 dark:text-white text-sm">{isUrdu ? 'آج کی اقساط' : "Today's Installments"}</h3>
      </div>
      {loading ? <div className="p-8 text-center"><div className="w-8 h-8 border-4 border-gray-900 border-t-transparent rounded-full animate-spin inline-block" /></div>
      : installments.length === 0 ? <div className="p-8 text-center text-gray-400 text-sm">{isUrdu ? 'آج کوئی اقساط نہیں' : 'No installments today'}</div>
      : <><div className="grid grid-cols-3 border-b"><div className="p-3 text-center border-r"><p className="text-lg font-bold">{installments.length}</p><p className="text-[10px] text-gray-500">Total</p></div><div className="p-3 text-center border-r"><p className="text-lg font-bold text-amber-600">{pendingCount}</p><p className="text-[10px] text-gray-500">Pending</p></div><div className="p-3 text-center"><p className="text-lg font-bold text-red-600">{overdueCount}</p><p className="text-[10px] text-gray-500">Overdue</p></div></div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 dark:bg-gray-700/50"><th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-start">#</th><th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-start">Name</th><th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-start">Product</th><th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-center">Inst</th><th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-end">Amount</th><th className="px-3 py-2 text-[10px] font-bold text-gray-500 uppercase text-center">Status</th></tr></thead>
        <tbody>{display.map((item: any, idx: number) => (<tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-3 py-2 text-gray-400 text-xs">{idx+1}</td><td className="px-3 py-2 font-semibold text-gray-800 dark:text-white text-xs">{item.customer_name || '—'}</td><td className="px-3 py-2 text-xs text-gray-600">{item.product_name || '—'}</td><td className="px-3 py-2 text-center text-xs">{item.installment_no}/{item.total_installments}</td><td className="px-3 py-2 text-end font-bold text-xs">Rs. {(item.amount||0).toLocaleString()}</td><td className="px-3 py-2 text-center">{item.is_overdue ? <span className="text-red-600 text-[10px] font-semibold">Overdue</span> : <span className="text-amber-600 text-[10px] font-semibold">Pending</span>}</td></tr>))}</tbody></table></div>
        {installments.length > 10 && <div className="px-5 py-3 border-t"><button onClick={() => setShowAll(!showAll)} className="w-full text-center text-xs font-semibold text-blue-600">{showAll ? 'Show Less' : `Show ${installments.length-10} More`}</button></div>}
      </>}
    </div>
  );
};

// PRODUCT GROUPS MODAL
const ProductGroupsModal: React.FC<{ isUrdu: boolean; onClose: () => void; navigate: (path: string) => void }> = ({ isUrdu, onClose, navigate }) => {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [invLoading, setInvLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get('/dashboard/products-grouped')
      .then((res: any) => { if (!cancelled) setGroups(Array.isArray(res.data) ? res.data : []); })
      .catch(() => { if (!cancelled) setGroups([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return groups;
    const q = search.toLowerCase();
    return groups.filter((g: any) => (g.productName||'').toLowerCase().includes(q) || (g.productNameUrdu||'').includes(q) || (g.category||'').toLowerCase().includes(q));
  }, [groups, search]);

  const handleView = async (product: any) => {
    setSelectedProduct(product);
    setInvLoading(true);
    try {
      const res = await api.get('/inventory?limit=500');
      const items = res.data?.data || res.data || [];
      setInventoryItems(items.filter((i: any) => (i.product_name||'').toLowerCase() === (product.productName||'').toLowerCase()));
    } catch { setInventoryItems([]); }
    finally { setInvLoading(false); }
  };

  if (selectedProduct) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={(e: any) => e.stopPropagation()}>
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <div className="flex items-center gap-3">
              <button onClick={() => setSelectedProduct(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg></button>
              <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">{isUrdu ? (selectedProduct.productNameUrdu||selectedProduct.productName) : selectedProduct.productName}</h2><p className="text-xs text-gray-500">{isUrdu ? 'کل' : 'Total'}: {selectedProduct.totalStock||0} | In Stock: {selectedProduct.inStockItems||0} | Sold: {selectedProduct.soldItems||0}</p></div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {invLoading ? <div className="text-center py-16"><div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin inline-block" /></div>
            : inventoryItems.length === 0 ? <div className="text-center py-16 text-gray-400">{isUrdu ? 'کوئی انوینٹری نہیں' : 'No inventory items'}</div>
            : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="bg-gray-50 dark:bg-gray-700/50"><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">#</th><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">Serial</th><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">Model</th><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">Color</th><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">Engine</th><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">Chassis</th><th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Status</th><th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Date</th></tr></thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">{inventoryItems.map((item: any, idx: number) => (<tr key={item.id||idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30"><td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx+1}</td><td className="px-4 py-3 font-mono text-xs text-gray-800 dark:text-gray-200">{item.serialNumber||item.serial_number||'—'}</td><td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{item.model||'—'}</td><td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">{item.color||'—'}</td><td className="px-4 py-3 font-mono text-xs text-gray-600">{item.engineNo||item.engine_no||'—'}</td><td className="px-4 py-3 font-mono text-xs text-gray-600">{item.chassisNo||item.chassis_no||'—'}</td><td className="px-4 py-3 text-center"><StatusBadge status={item.status||'in_stock'} /></td><td className="px-4 py-3 text-center text-xs text-gray-500">{item.purchaseDate||item.purchase_date ? new Date(item.purchaseDate||item.purchase_date).toLocaleDateString() : '—'}</td></tr>))}</tbody></table></div>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={(e: any) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg"><svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg></div>
            <div><h2 className="text-lg font-bold text-gray-900 dark:text-white">{isUrdu ? 'مصنوعات' : 'Products'}</h2><p className="text-xs text-gray-500">{filtered.length} products{search ? ` (${groups.length} total)` : ''}</p></div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"><svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder={isUrdu ? 'نام، زمرہ، کمپنی سے تلاش کریں...' : 'Search by name, category, company...'}
              className="w-full pl-9 pr-8 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
            {search && <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? <div className="text-center py-16"><div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin inline-block" /></div>
          : filtered.length === 0 ? <div className="text-center py-16 text-gray-400">{isUrdu ? (search ? 'کچھ نہیں ملا' : 'کوئی مصنوعات نہیں') : (search ? 'No results' : 'No products')}</div>
          : <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm"><thead><tr className="bg-gray-50 dark:bg-gray-700/50"><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">#</th><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">Name</th><th className="px-4 py-3 text-start text-[10px] font-bold text-gray-500 uppercase">Category</th><th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Total</th><th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">In Stock</th><th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Sold</th><th className="px-4 py-3 text-end text-[10px] font-bold text-gray-500 uppercase">Value</th><th className="px-4 py-3 text-center text-[10px] font-bold text-gray-500 uppercase">Action</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">{filtered.map((g: any, idx: number) => (
                <tr key={g.productId||idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{idx+1}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white text-sm">{isUrdu ? (g.productNameUrdu||g.productName) : g.productName}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{g.category||'—'}</td>
                  <td className="px-4 py-3 text-center text-sm font-bold text-gray-900 dark:text-white">{g.totalStock||0}</td>
                  <td className="px-4 py-3 text-center"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${(g.inStockItems||0)>0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-700'}`}>{g.inStockItems||0}</span></td>
                  <td className="px-4 py-3 text-center text-xs text-gray-500">{(g.soldItems||0)>0 ? g.soldItems : '—'}</td>
                  <td className="px-4 py-3 text-end font-semibold text-gray-800 dark:text-gray-200 text-xs">Rs. {(g.totalValue||0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center"><button onClick={() => handleView(g)} className="px-2.5 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-semibold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all">{isUrdu ? 'دیکھیں' : 'View'}</button></td>
                </tr>
              ))}</tbody></table>
            </div>}
        </div>
      </div>
    </div>
  );
};

// ========== MAIN DASHBOARD ==========
const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const clientInfo = useClientStore((s) => s.info);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [summaryModal, setSummaryModal] = useState<SummaryModalState | null>(null);
  const [showPromiseModal, setShowPromiseModal] = useState(false);
  const [showPromisesList, setShowPromisesList] = useState(false);
  const [showProductGroups, setShowProductGroups] = useState(false);
  const navigate = useNavigate();
  const { data: summary, loading, error, refresh: handleRefresh } = useOfflineDashboard();

  if (loading && !summary) return <div className="p-20 text-center"><div className="w-10 h-10 border-4 border-gray-900 border-t-transparent rounded-full animate-spin inline-block" /></div>;

  const todayCollection = summary?.todayCollection || { total: 0, count: 0 };
  const totalCustomers = summary?.totalCustomers || 0;
  const activeInstallments = summary?.activeInstallments || 0;
  const completedInstallments = summary?.completedInstallments || 0;
  const overdueCustomers = summary?.overdueCount || 0;
  const todayDue = summary?.todayDueCount || 0;
  const totalProducts = summary?.totalProducts || 0;
  const lowStockItems = summary?.lowStock || 0;
  const inventoryValue = summary?.inventoryValue || 0;
  const ageingStock = summary?.ageingInventory || 0;
  const monthRevenue = summary?.monthRevenue || 0;
  const monthProfit = summary?.monthProfit || 0;
  const activePlans = summary?.activeInstallments || 0;
  const pendingCustomers = summary?.pendingCustomers || 0;
  const pendingTotal = summary?.pendingTotal || 0;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{clientInfo?.name || 'Dashboard'}</h1>
          <p className="text-xs sm:text-sm text-gray-500">{new Date().toLocaleDateString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPromiseModal(true)} className="px-3 py-2 bg-amber-500 text-white rounded-xl text-xs font-semibold">{isUrdu ? 'وعدہ شامل کریں' : 'Add Promise'}</button>
          <button onClick={handleRefresh} className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-xs font-semibold">{isUrdu ? 'ریفریش' : 'Refresh'}</button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-xs font-bold text-gray-500 uppercase mb-4">Quick Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 border-2 border-emerald-100 dark:border-emerald-900 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all" onClick={() => setSummaryModal({ title: "Today's Collection", type: 'today' })}>
            <p className="text-xs text-gray-500 mb-1">{isUrdu ? 'آج کی وصولی' : "Today's Collection"}</p>
            <p className="text-2xl font-bold text-emerald-600">Rs. {(todayCollection.total||0).toLocaleString()}</p>
            <p className="text-xs text-gray-400">{todayCollection.count||0} payments</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border-2 border-amber-100 dark:border-amber-900 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all" onClick={() => setSummaryModal({ title: 'Pending Payments', type: 'pending' })}>
            <p className="text-xs text-gray-500 mb-1">Pending Payments</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCustomers} customers</p>
            <p className="text-xs text-gray-400">Rs. {(pendingTotal||0).toLocaleString()}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 border-2 border-blue-100 dark:border-blue-900 rounded-2xl p-5 cursor-pointer hover:shadow-lg transition-all" onClick={() => setSummaryModal({ title: 'Monthly Revenue', type: 'month' })}>
            <p className="text-xs text-gray-500 mb-1">Monthly Revenue</p>
            <p className="text-2xl font-bold text-blue-600">Rs. {(monthRevenue||0).toLocaleString()}</p>
            <p className="text-xs text-gray-400">Profit: Rs. {(monthProfit||0).toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2"><TodayInstallmentsCard isUrdu={isUrdu} /></div>
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Quick Stats</h3>
            <div className="space-y-1">
              <button onClick={() => setModal({ title: 'Total Customers', endpoint: '/dashboard/customers-with-finance' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-lg"><span className="text-xs text-gray-600">Total Customers</span><span className="text-sm font-bold">{totalCustomers}</span></button>
              <button onClick={() => setModal({ title: 'Active Plans', endpoint: '/dashboard/active-installments' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Active Plans</span><span className="text-sm font-bold">{activePlans}</span></button>
              <button onClick={() => setModal({ title: 'Active Installments', endpoint: '/dashboard/active-installments' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Active Installments</span><span className="text-sm font-bold">{activeInstallments}</span></button>
              <button onClick={() => setModal({ title: 'Completed', endpoint: '/dashboard/completed-installments' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Completed</span><span className="text-sm font-bold">{completedInstallments}</span></button>
              <button onClick={() => setModal({ title: 'Overdue', endpoint: '/dashboard/overdue-installments' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Overdue</span><span className="text-sm font-bold text-red-600">{overdueCustomers}</span></button>
              <button onClick={() => setModal({ title: 'Due Today', endpoint: '/dashboard/today-installments' })} className="w-full flex justify-between py-2.5 px-2 hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Due Today</span><span className="text-sm font-bold text-amber-600">{todayDue}</span></button>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-5">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-4">Inventory</h3>
            <div className="space-y-1">
              <button onClick={() => setShowProductGroups(true)} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg bg-indigo-50/50 dark:bg-indigo-900/10"><div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500" /><span className="text-xs font-semibold text-indigo-700">Products (Grouped)</span></div><span className="text-sm font-bold text-indigo-600">{totalProducts}</span></button>
              <button onClick={() => setModal({ title: 'All Products', endpoint: '/products?limit=200' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">All Products List</span><span className="text-sm font-bold">{totalProducts}</span></button>
              <button onClick={() => setModal({ title: 'Low Stock', endpoint: '/dashboard/low-stock' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Low Stock</span><span className="text-sm font-bold text-red-600">{lowStockItems}</span></button>
              <button onClick={() => setModal({ title: 'Inventory Value', endpoint: '/products?limit=200' })} className="w-full flex justify-between py-2.5 px-2 border-b hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Inventory Value</span><span className="text-sm font-bold text-emerald-600">Rs. {(inventoryValue||0).toLocaleString()}</span></button>
              <button onClick={() => setModal({ title: 'Ageing Stock', endpoint: '/products?limit=200' })} className="w-full flex justify-between py-2.5 px-2 hover:bg-gray-50 rounded-lg"><span className="text-xs text-gray-600">Ageing Stock</span><span className="text-sm font-bold text-orange-600">{ageingStock}</span></button>
            </div>
          </div>
        </div>
      </div>

      {modal && <DashboardModal title={modal.title} endpoint={modal.endpoint} onClose={() => setModal(null)} isUrdu={isUrdu} />}
      {summaryModal && <DashboardSummaryModal title={summaryModal.title} type={summaryModal.type} onClose={() => setSummaryModal(null)} isUrdu={isUrdu} />}
      {showPromiseModal && <AddPromiseModal onClose={() => setShowPromiseModal(false)} isUrdu={isUrdu} onSuccess={handleRefresh} />}
      {showPromisesList && <PromisesModal onClose={() => setShowPromisesList(false)} isUrdu={isUrdu} onSuccess={handleRefresh} />}
      {showProductGroups && <ProductGroupsModal isUrdu={isUrdu} onClose={() => setShowProductGroups(false)} navigate={navigate} />}
    </div>
  );
};

export default DashboardPage;