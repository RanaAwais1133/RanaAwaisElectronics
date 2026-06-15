import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import InventoryCreate from './InventoryCreate';
import InventoryEditModal from './InventoryEditModal';

const InventoryList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [ageingDays, setAgeingDays] = useState(90);
  const [ageingReport, setAgeingReport] = useState<any[]>([]);
  const [showAgeing, setShowAgeing] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory?limit=200');
      setItems(res.data?.data || res.data || []);
    } catch (err) { setItems([]); }
    finally { setLoading(false); }
  };

  const fetchAgeing = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/inventory/ageing?older_than_days=${ageingDays}`);
      setAgeingReport(res.data || []);
      setShowAgeing(true);
    } catch (err) {} finally { setLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, []);

  const handleDelete = async (id: string) => {
    try { await api.delete(`/inventory/${id}`); toast.success(t('inventory_item_deleted')); fetchInventory(); }
    catch { toast.error(t('error_deleting_inventory')); }
    setDeleteConfirm(null);
  };

  const isUrdu = i18n.language === 'ur';

  const filtered = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.product_name || '').toLowerCase().includes(q) ||
      (i.product_urdu || '').includes(q) ||
      (i.serialNumber || '').toLowerCase().includes(q) ||
      (i.company || '').toLowerCase().includes(q) ||
      (i.model || '').toLowerCase().includes(q) ||
      (i.color || '').toLowerCase().includes(q) ||
      (i.status || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{t('inventory')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} items</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all">
          <svg className="w-5 h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('add_inventory')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg>
        </div>
        <input type="text" placeholder={t('search') + ' inventory...'} value={search} onChange={e => setSearch(e.target.value)} className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm`} />
        {search && <button onClick={() => setSearch('')} className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-gray-400 hover:text-gray-600`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>}
      </div>

      {/* Ageing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <button onClick={fetchAgeing} className="inline-flex items-center px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
          {t('ageing_report')}
        </button>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">{t('older_than_days')}:</label>
          <input type="number" className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 w-20 text-sm dark:bg-gray-700 dark:text-white" value={ageingDays} onChange={e => setAgeingDays(+e.target.value)} />
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><div className="spinner"></div></div>}

      {showAgeing && !loading && (
        <div className="mb-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
          <h3 className="font-bold text-lg mb-2 text-amber-800 dark:text-amber-300">{t('ageing_report')} ({ageingReport.length})</h3>
          {ageingReport.length === 0 ? <p className="text-sm text-gray-500">{t('no_ageing_items')}</p> : (
            <ul className="space-y-2">
              {ageingReport.map((item: any) => (
                <li key={item.id} className="flex flex-col sm:flex-row sm:gap-3 text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-medium">{item.product_name || item.product_id}</span>
                  <span className="text-gray-500">Serial: {item.serial_number || 'N/A'}</span>
                  <span className="text-gray-500">Purchased: {new Date(item.purchase_date).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900 uppercase text-xs tracking-wider">
                <th className="px-5 py-4 text-start font-bold text-gray-500 dark:text-gray-900">{t('product')}</th>
                <th className="px-5 py-4 text-start font-bold">{t('serial')}</th>
                <th className="px-5 py-4 text-start font-bold">{t('model')}</th>
                <th className="px-5 py-4 text-start font-bold">{t('status')}</th>
                <th className="px-5 py-4 text-start font-bold">{t('purchase_date')}</th>
                <th className="px-5 py-4 text-center font-bold">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {filtered.map((item: any, idx: number) => (
                <tr key={item.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                  <td className="px-5 py-4 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">{isUrdu ? item.product_urdu || item.product_name : item.product_name || '—'}</td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300 font-mono text-xs">{item.serialNumber || '—'}</td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300">{item.model || '—'}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'in_stock' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' :
                      item.status === 'sold' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' :
                      'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {item.status === 'in_stock' ? '● ' + t('in_stock') : item.status === 'sold' ? '○ ' + t('sold') : item.status === 'returned' ? '↩ ' + t('returned') : item.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-gray-600 dark:text-gray-300 text-xs">{(() => { const d = new Date(item.purchaseDate); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}</td>
                  <td className="px-5 py-4 text-center">
                    <div className="flex justify-center gap-1.5">
                      <button onClick={() => setEditItemId(item.id)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all" title={t('edit')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                      <button onClick={() => setDeleteConfirm(item.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all" title={t('delete')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-4 py-16 text-center">
                  <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  <p className="text-gray-500 dark:text-gray-400 font-medium">{t('no_inventory_items')}</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showCreate && <InventoryCreate onClose={() => setShowCreate(false)} onSuccess={() => { fetchInventory(); setShowCreate(false); }} />}
      {editItemId && <InventoryEditModal itemId={editItemId} onClose={() => setEditItemId(null)} onSuccess={() => { fetchInventory(); setEditItemId(null); }} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div><h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('confirm_delete')}</h3></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('delete_inventory_confirm')}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-all">{t('cancel')}</button>
              <button onClick={() => handleDelete(deleteConfirm!)} className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/25">{t('delete')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(InventoryList);
