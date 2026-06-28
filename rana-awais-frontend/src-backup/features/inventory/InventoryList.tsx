import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import InventoryCreate from './InventoryCreate';
import InventoryEditModal from './InventoryEditModal';
import { APP_CONFIG } from '../../config/app';
import { useAuthStore } from '../../store/useAuthStore';

// ✅ Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status?.toLowerCase()) {
      case 'in_stock':
        return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
      case 'sold':
        return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
      case 'returned':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (status?.toLowerCase()) {
      case 'in_stock':
        return '●';
      case 'sold':
        return '○';
      case 'returned':
        return '↩';
      default:
        return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'in_stock':
        return 'in_stock';
      case 'sold':
        return 'sold';
      case 'returned':
        return 'returned';
      default:
        return status || '—';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyles()}`}>
      {getStatusIcon()} {getStatusLabel(status)}
    </span>
  );
};

// ✅ Action Buttons Component
const ActionButtons: React.FC<{
  item: any;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}> = ({ item, onEdit, onDelete, t }) => (
  <div className="flex justify-center gap-1.5">
    <button
      onClick={() => onEdit(item.id)}
      className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all active:scale-95"
      title={t('edit')}
      aria-label={t('edit')}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>
    <button
      onClick={() => onDelete(item.id)}
      className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all active:scale-95"
      title={t('delete')}
      aria-label={t('delete')}
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
);

// ✅ Inventory Row Component
const InventoryRow: React.FC<{
  item: any;
  isUrdu: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
  index: number;
}> = ({ item, isUrdu, onEdit, onDelete, t, index }) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${
      index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'
    }`}>
      <td className="px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
        {isUrdu ? item.product_urdu || item.product_name : item.product_name || '—'}
      </td>
      <td className="px-5 py-4 text-gray-600 dark:text-gray-300 font-mono text-xs">
        {item.serialNumber || item.serial_number || '—'}
      </td>
      <td className="px-5 py-4 text-gray-600 dark:text-gray-300">
        {item.model || '—'}
      </td>
      <td className="px-5 py-4">
        <StatusBadge status={item.status || 'in_stock'} />
      </td>
      <td className="px-5 py-4 text-gray-600 dark:text-gray-300 text-xs">
        {formatDate(item.purchaseDate || item.purchase_date)}
      </td>
      <td className="px-5 py-4 text-center">
        <ActionButtons item={item} onEdit={onEdit} onDelete={onDelete} t={t} />
      </td>
    </tr>
  );
};

// ✅ Mobile Card View
const InventoryCard: React.FC<{
  item: any;
  isUrdu: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  t: (key: string) => string;
}> = ({ item, isUrdu, onEdit, onDelete, t }) => {
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/60 dark:border-gray-700/60 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-bold text-gray-800 dark:text-white">
            {isUrdu ? item.product_urdu || item.product_name : item.product_name || '—'}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {isUrdu ? 'ماڈل' : 'Model'}: {item.model || '—'}
          </p>
        </div>
        <StatusBadge status={item.status || 'in_stock'} />
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'سیریل' : 'Serial'}:</span>
          <span className="ml-1 font-mono">{item.serialNumber || item.serial_number || '—'}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'خریداری کی تاریخ' : 'Purchase Date'}:</span>
          <span className="ml-1">{formatDate(item.purchaseDate || item.purchase_date)}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'کمپنی' : 'Company'}:</span>
          <span className="ml-1">{item.company || '—'}</span>
        </div>
        <div className="col-span-2">
          <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'رنگ' : 'Color'}:</span>
          <span className="ml-1">{item.color || '—'}</span>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <button
          onClick={() => onEdit(item.id)}
          className="px-3 py-1.5 text-xs rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 font-medium transition-all"
        >
          {t('edit')}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="px-3 py-1.5 text-xs rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 font-medium transition-all"
        >
          {t('delete')}
        </button>
      </div>
    </div>
  );
};

const InventoryList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [ageingDays, setAgeingDays] = useState(90);
  const [ageingReport, setAgeingReport] = useState<any[]>([]);
  const [showAgeing, setShowAgeing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ Page title
  useEffect(() => {
    document.title = `${t('inventory')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  // ✅ Fetch inventory
  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory?limit=500');
      setItems(res.data?.data || res.data || []);
    } catch (err) {
      setItems([]);
      toast.error(isUrdu ? 'انوینٹری لوڈ کرنے میں ناکامی' : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  }, [isUrdu]);

  // ✅ Fetch ageing report
  const fetchAgeing = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/ageing?older_than_days=${ageingDays}`);
      setAgeingReport(res.data || []);
      setShowAgeing(true);
      if (res.data.length === 0) {
        toast(isUrdu ? 'کوئی پرانا اسٹاک نہیں' : 'No ageing items found');
      }
    } catch (err) {
      toast.error(isUrdu ? 'ایجنگ رپورٹ نہیں بن سکی' : 'Failed to fetch ageing report');
    } finally {
      setLoading(false);
    }
  }, [ageingDays, isUrdu]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // ✅ Handle delete
  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true);
    try {
      await api.delete(`/inventory/${id}`);
      toast.success(isUrdu ? 'آئٹم ڈیلیٹ ہو گیا' : t('inventory_item_deleted'));
      await fetchInventory();
    } catch {
      toast.error(isUrdu ? 'آئٹم ڈیلیٹ کرنے میں ناکامی' : t('error_deleting_inventory'));
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  }, [fetchInventory, t, isUrdu]);

  // ✅ Filter items
  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.product_name || '').toLowerCase().includes(q) ||
      (i.product_urdu || '').includes(q) ||
      (i.serialNumber || i.serial_number || '').toLowerCase().includes(q) ||
      (i.company || '').toLowerCase().includes(q) ||
      (i.model || '').toLowerCase().includes(q) ||
      (i.color || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  // ✅ Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {isUrdu ? 'لوڈ ہو رہا ہے...' : t('loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      {/* ✅ Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            {isUrdu ? 'انوینٹری' : t('inventory')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filtered.length} {isUrdu ? 'آئٹمز' : 'items'}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {isUrdu ? 'نیا انوینٹری' : t('add_inventory')}
        </button>
      </div>

      {/* ✅ Search */}
      <div className="relative mb-4">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
          </svg>
        </div>
        <input
          type="text"
          placeholder={isUrdu ? 'انوینٹری تلاش کریں...' : `${t('search')} inventory...`}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition-all`}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* ✅ Ageing Report Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <button
          onClick={fetchAgeing}
          className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          {isUrdu ? 'ایجنگ رپورٹ' : t('ageing_report')}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
            {isUrdu ? 'پرانی اشیاء (دن)' : t('older_than_days')}:
          </label>
          <input
            type="number"
            className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 w-20 text-sm dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            value={ageingDays}
            onChange={e => setAgeingDays(Math.max(1, +e.target.value))}
            min={1}
          />
        </div>
      </div>

      {/* ✅ Ageing Report Display */}
      {showAgeing && !loading && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-amber-800">
          <h3 className="font-bold text-lg mb-2 text-amber-800 dark:text-amber-300">
            {isUrdu ? 'ایجنگ رپورٹ' : t('ageing_report')} ({ageingReport.length})
          </h3>
          {ageingReport.length === 0 ? (
            <p className="text-sm text-gray-500">{isUrdu ? 'کوئی پرانا اسٹاک نہیں' : t('no_ageing_items')}</p>
          ) : (
            <ul className="space-y-2 max-h-60 overflow-y-auto">
              {ageingReport.map((item: any) => (
                <li key={item.id} className="flex flex-col sm:flex-row sm:gap-3 text-sm text-gray-700 dark:text-gray-300 p-2 bg-white dark:bg-gray-800 rounded-lg">
                  <span className="font-medium">{item.product_name || item.product_id || '—'}</span>
                  <span className="text-gray-500">{isUrdu ? 'سیریل' : 'Serial'}: {item.serial_number || 'N/A'}</span>
                  <span className="text-gray-500">{isUrdu ? 'خریداری کی تاریخ' : 'Purchased'}: {new Date(item.purchase_date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ✅ Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700 sticky top-0 z-10">
              <tr className="uppercase text-xs tracking-wider">
                <th className="px-5 py-4 text-start font-bold text-gray-500 dark:text-gray-300">{isUrdu ? 'پروڈکٹ' : t('product')}</th>
                <th className="px-5 py-4 text-start font-bold text-gray-500 dark:text-gray-300">{isUrdu ? 'سیریل' : t('serial')}</th>
                <th className="px-5 py-4 text-start font-bold text-gray-500 dark:text-gray-300">{isUrdu ? 'ماڈل' : t('model')}</th>
                <th className="px-5 py-4 text-start font-bold text-gray-500 dark:text-gray-300">{isUrdu ? 'حالت' : t('status')}</th>
                <th className="px-5 py-4 text-start font-bold text-gray-500 dark:text-gray-300">{isUrdu ? 'خریداری کی تاریخ' : t('purchase_date')}</th>
                <th className="px-5 py-4 text-center font-bold text-gray-500 dark:text-gray-300">{isUrdu ? 'عمل' : t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filtered.map((item: any, idx: number) => (
                <InventoryRow
                  key={item.id}
                  item={item}
                  isUrdu={isUrdu}
                  onEdit={setEditItemId}
                  onDelete={setDeleteConfirm}
                  t={t}
                  index={idx}
                />
              ))}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      {isUrdu ? 'کوئی انوینٹری آئٹم نہیں' : t('no_inventory_items')}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ✅ Modals */}
      {showCreate && (
        <InventoryCreate
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            fetchInventory();
            setShowCreate(false);
          }}
        />
      )}
      
      {editItemId && (
        <InventoryEditModal
          itemId={editItemId}
          onClose={() => setEditItemId(null)}
          onSuccess={() => {
            fetchInventory();
            setEditItemId(null);
          }}
        />
      )}

      {/* ✅ Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {isUrdu ? 'ڈیلیٹ کی تصدیق' : t('confirm_delete')}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isUrdu ? 'کیا آپ واقعی اس آئٹم کو ڈیلیٹ کرنا چاہتے ہیں؟' : t('delete_inventory_confirm')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-all"
              >
                {isUrdu ? 'منسوخ کریں' : t('cancel')}
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/25"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isUrdu ? 'ڈیلیٹ ہو رہا...' : t('deleting')}
                  </span>
                ) : (
                  isUrdu ? 'ڈیلیٹ کریں' : t('delete') || 'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(InventoryList);