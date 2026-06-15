import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useProductStore } from '../../store/useProductStore';
import ProductCreate from './ProductCreate';
import ProductEditModal from './ProductEditModal';
import AddStockModal from './AddStockModal';
import api from '../../utils/api';

const ProductList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { products, loading, fetchProducts } = useProductStore();
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProductId, setEditProductId] = useState<string | null>(null);
  const [addStockProductId, setAddStockProductId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchProducts(); }, []);

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/products/${id}`);
      toast.success(t('product_deleted'));
      fetchProducts();
    } catch (err) {
      toast.error(t('error_deleting_product'));
    }
    setDeleteConfirm(null);
  };

  const isUrdu = i18n.language === 'ur';

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.nameUrdu?.includes(search) ||
    p.category?.toLowerCase().includes(search.toLowerCase()) ||
    p.company?.toLowerCase().includes(search.toLowerCase()) ||
    p.companyUrdu?.includes(search) ||
    p.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">{t('products')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} {t('products').toLowerCase()}</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all">
          <svg className="w-5 h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          {t('add_product')}
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
          <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg>
        </div>
        <input type="text" placeholder={t('search') + ' ' + t('products') + '...'} value={search} onChange={e => setSearch(e.target.value)} className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm`} />
        {search && (
          <button onClick={() => setSearch('')} className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-gray-400 hover:text-gray-600`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">{search ? t('no_products_found') || 'No products found' : t('no_products')}</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(p => (
            <div key={p.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 relative group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
              {/* Action buttons — RTL aware */}
              <div className={`absolute top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isUrdu ? 'left-3' : 'right-3'}`}>
                <button onClick={() => setEditProductId(p.id)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all" title={t('edit')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                <button onClick={() => setAddStockProductId(p.id)} className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all" title={t('add_stock')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg></button>
                <button onClick={() => setDeleteConfirm(p.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all" title={t('delete')}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
              </div>

              <h3 className="font-bold text-lg mb-1 text-gray-800 dark:text-white pr-16">{isUrdu ? (p.nameUrdu || p.name) : (p.name || p.nameUrdu)}</h3>
              {(p.company || p.companyUrdu) && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isUrdu ? (p.companyUrdu || p.company) : (p.company || p.companyUrdu)}</p>}
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">{p.category || '—'}</p>
              <p className="text-2xl font-bold mb-3 text-gray-800 dark:text-white">Rs. {p.price?.toLocaleString()}</p>

              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${(p.stockCount ?? 0) > 0 ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'}`}>
                  {(p.stockCount ?? 0) > 0 ? '● ' + t('in_stock') : '○ ' + t('out_of_stock')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('quantity')}: {p.stockCount ?? 0}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && <ProductCreate onClose={() => setShowCreate(false)} onSuccess={() => { fetchProducts(); setShowCreate(false); }} />}
      {editProductId && <ProductEditModal productId={editProductId} onClose={() => setEditProductId(null)} onSuccess={() => { fetchProducts(); setEditProductId(null); }} />}
      {addStockProductId && <AddStockModal productId={addStockProductId} currentPrice={products.find(p => p.id === addStockProductId)?.price} onClose={() => setAddStockProductId(null)} onSuccess={() => { fetchProducts(); setAddStockProductId(null); }} />}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4"><div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center"><svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg></div><h3 className="text-lg font-bold text-gray-800 dark:text-white">{t('confirm_delete')}</h3></div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{t('delete_product_confirm')}</p>
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

export default React.memo(ProductList);
