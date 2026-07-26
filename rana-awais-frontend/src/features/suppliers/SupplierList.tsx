import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSupplierStore, Supplier } from '../../store/useSupplierStore';
import { APP_CONFIG } from '../../config/app';
import SupplierCreate from './SupplierCreate';
import SupplierReport from './SupplierReport';
import BulkPurchase from './BulkPurchase';

const SupplierList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const { suppliers, loading, fetchSuppliers, deleteSupplier } = useSupplierStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showBulkPurchase, setShowBulkPurchase] = useState(false);

  useEffect(() => {
    document.title = `${t('suppliers') || 'Suppliers'} | ${APP_CONFIG.companyName}`;
    fetchSuppliers();
  }, [fetchSuppliers, t]);

  const filtered = suppliers.filter(s =>
    s.name?.toLowerCase().includes(search.toLowerCase()) ||
    s.phone?.includes(search) ||
    s.company?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = useCallback(async (id: string) => {
    const ok = await deleteSupplier(id);
    if (ok) toast.success(isUrdu ? 'سپلائر ڈیلیٹ ہو گیا' : 'Supplier deleted');
    else toast.error(isUrdu ? 'ڈیلیٹ ناکام' : 'Delete failed');
    setDeleteConfirm(null);
  }, [deleteSupplier, isUrdu]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      {loading && suppliers.length === 0 && (
        <div className="flex justify-center py-20">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {(!loading || suppliers.length > 0) && (<>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white">{t('suppliers') || 'Suppliers'}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} {t('suppliers')?.toLowerCase() || 'suppliers'}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowBulkPurchase(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-2xl text-sm font-semibold shadow-lg">
            🛒 {isUrdu ? 'بلک خریداری' : 'Bulk Purchase'}
          </button>
          <button onClick={() => setShowCreate(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl text-sm font-semibold shadow-lg">
            + {t('add_supplier') || 'Add Supplier'}
          </button>
        </div>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
          </svg>
        </div>
        <input type="text" placeholder={isUrdu ? 'سپلائر تلاش کریں...' : 'Search suppliers...'}
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-12 pr-4 py-3.5 border rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 shadow-sm" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed">
          <h3 className="text-lg font-semibold text-gray-500">{isUrdu ? 'کوئی سپلائر نہیں' : 'No suppliers'}</h3>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700 sticky top-0">
                <tr>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'نام' : 'Name'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{t('phone') || 'Phone'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'کمپنی' : 'Company'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{t('address') || 'Address'}</th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase">{t('actions') || 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((s, idx) => (
                  <tr key={s.id} className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
                    <td className="px-5 py-4 font-semibold whitespace-nowrap cursor-pointer hover:text-blue-600" onClick={() => setSelectedSupplier(s)}>
                      {isUrdu ? s.nameUrdu || s.name : s.name}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap font-mono text-xs" dir="ltr">{s.phone || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">{s.company || '—'}</td>
                    <td className="px-5 py-4 max-w-[200px] truncate">{s.address || '—'}</td>
                    <td className="px-5 py-4 text-center">
                      <div className="flex justify-center gap-1.5">
                        <button onClick={() => setEditSupplier(s)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100" title={t('edit')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => setDeleteConfirm(s.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100" title={t('delete')}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <SupplierCreate onClose={() => setShowCreate(false)} onSuccess={() => { fetchSuppliers(); setShowCreate(false); }} />}
      {editSupplier && <SupplierCreate onClose={() => setEditSupplier(null)} onSuccess={() => { fetchSuppliers(); setEditSupplier(null); }} initialData={editSupplier} />}
      {selectedSupplier && <SupplierReport supplierId={selectedSupplier.id} onClose={() => setSelectedSupplier(null)} />}
      {showBulkPurchase && <BulkPurchase onClose={() => setShowBulkPurchase(false)} onSuccess={() => { fetchSuppliers(); setShowBulkPurchase(false); }} />}

      </>)}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4">{isUrdu ? 'ڈیلیٹ کی تصدیق' : 'Confirm Delete'}</h3>
            <p className="text-sm text-gray-500 mb-6">{isUrdu ? 'کیا آپ واقعی ڈیلیٹ کرنا چاہتے ہیں؟' : 'Are you sure?'}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm">{isUrdu ? 'منسوخ' : 'Cancel'}</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm">{isUrdu ? 'ڈیلیٹ' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(SupplierList);