// ═══════════════════════════════════════════════════════════════
// ✅ Inventory (Simple list - each item is unique)
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { Product } from '../../store/useProductStore';
import InventoryCreate from '../inventory/InventoryCreate';
import InventoryEditModal from '../inventory/InventoryEditModal';
import { APP_CONFIG } from '../../config/app';
import api from '../../utils/api';

// ✅ Product Row
const ProductRow: React.FC<{
  product: Product;
  isUrdu: boolean;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  index: number;
}> = ({ product, isUrdu, onEdit, onDelete, index }) => (
  <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-all duration-200 ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-800/50'}`}>
    <td className="px-5 py-3 font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap">
      {isUrdu ? product.nameUrdu || product.name : product.name}
    </td>
    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{product.category || '—'}</td>
    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{isUrdu ? (product.companyUrdu || product.company || '—') : (product.company || '—')}</td>
    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs">{product.serialNumber || product.chassisNo || product.engineNo || '—'}</td>
    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{product.model || '—'}</td>
    <td className="px-5 py-3 text-gray-600 dark:text-gray-300 whitespace-nowrap">{product.color || '—'}</td>
    <td className="px-5 py-3 font-bold text-gray-800 dark:text-gray-100 whitespace-nowrap">Rs. {product.price?.toLocaleString()}</td>
    <td className="px-5 py-3 font-bold text-gray-500 dark:text-gray-400 whitespace-nowrap">Rs. {(product.purchasePrice || 0)?.toLocaleString()}</td>
    <td className="px-5 py-3 text-center">
      <div className="flex justify-center gap-1.5">
        <button onClick={() => onEdit(product)} className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/50" title="Edit">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
        </button>
        <button onClick={() => onDelete(product.id)} className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/50" title="Delete">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
    </td>
  </tr>
);

// Map inventory API response to Product type for display
const mapInventoryToProduct = (item: any): Product => ({
  id: item.id,
  name: item.product_name || '—',
  nameUrdu: item.product_name_urdu || '',
  category: item.category || '',
  company: item.company || '',
  serialNumber: item.serialNumber || '',
  model: item.model || '',
  color: item.color || '',
  price: item.selling_price || 0,
  purchasePrice: item.purchase_price || 0,
  stockCount: 1,
  in_stock: item.status === 'in_stock',
  chassisNo: item.chassisNo,
  engineNo: item.engineNo,
  imei: item.imei,
});

const ProductList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch inventory items (individual items, not grouped)
  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/inventory?limit=500&show_all=true', { headers: { 'Cache-Control': 'no-cache' } });
      const data = res.data?.data || res.data || [];
      const items = (Array.isArray(data) ? data : []).map(mapInventoryToProduct);
      setProducts(items);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const categories: string[] = useMemo(() => {
    const cats = new Set<string>();
    products.forEach(p => { if (p.category) cats.add(p.category); });
    return ['all', ...Array.from(cats)];
  }, [products]);

  useEffect(() => { document.title = `${t('products')} | ${APP_CONFIG.companyName}`; }, [t]);
  useEffect(() => { fetchItems(); }, [fetchItems]);

  // Also refresh when inventoryUpdated event fires
  useEffect(() => {
    const handler = () => fetchItems();
    window.addEventListener('inventoryUpdated', handler);
    return () => window.removeEventListener('inventoryUpdated', handler);
  }, [fetchItems]);

  const filtered = useMemo(() => {
    let result = products;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p => p.name?.toLowerCase().includes(q) || p.nameUrdu?.includes(q) || p.category?.toLowerCase().includes(q) || p.company?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.serialNumber?.toLowerCase().includes(q) || p.model?.toLowerCase().includes(q));
    }
    if (categoryFilter !== 'all') result = result.filter(p => p.category === categoryFilter);
    return result;
  }, [products, search, categoryFilter]);

  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true); setDeleteConfirm(null);
    try {
      await api.delete(`/inventory/${id}`);
      toast.success(isUrdu ? 'ڈیلیٹ ہو گیا' : 'Deleted');
      fetchItems();
      // Notify dashboard to refresh
      window.dispatchEvent(new CustomEvent('inventoryUpdated'));
      // Clear cache
      try { localStorage.removeItem('products_cache'); localStorage.removeItem('dashboard_summary_cache'); } catch {}
    } catch {
      toast.error(isUrdu ? 'ناکام' : 'Failed');
    }
    setIsDeleting(false);
  }, [isUrdu, fetchItems]);

  if (loading && products.length === 0) return <div className="flex justify-center py-20"><div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div><h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white">{isUrdu ? 'انونٹری' : 'Inventory'}</h1><p className="text-sm text-gray-500 mt-1">{filtered.length} items</p></div>
        <button onClick={() => setShowCreate(true)} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl text-sm font-semibold shadow-lg">+ {isUrdu ? 'نیا آئٹم' : 'Add Item'}</button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center"><svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg></div>
          <input type="text" placeholder={isUrdu ? 'تلاش کریں...' : 'Search...'} value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-12 pr-4 py-3.5 border rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 shadow-sm" />
        </div>
        <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="border rounded-2xl px-4 py-3.5 bg-white dark:bg-gray-800 text-sm">
          <option value="all">{isUrdu ? 'تمام' : 'All'}</option>
          {categories.filter(c => c !== 'all').map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-dashed"><h3 className="text-lg font-semibold text-gray-500">{isUrdu ? 'کوئی آئٹم نہیں' : 'No items'}</h3></div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-gray-700 sticky top-0 z-10">
                <tr>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{t('name')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{t('category')}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'کمپنی' : 'Company'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'سیریل' : 'Serial'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'ماڈل' : 'Model'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'رنگ' : 'Color'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'قیمت' : 'Price'}</th>
                  <th className="px-5 py-4 text-start text-xs font-bold uppercase">{isUrdu ? 'لاگت' : 'Cost'}</th>
                  <th className="px-5 py-4 text-center text-xs font-bold uppercase">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filtered.map((p, idx) => (
                  <ProductRow key={p.id} product={p} isUrdu={isUrdu} onEdit={setEditProduct} onDelete={setDeleteConfirm} index={idx} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && <InventoryCreate onClose={() => setShowCreate(false)} onSuccess={() => { fetchItems(); setShowCreate(false); window.dispatchEvent(new CustomEvent('inventoryUpdated')); }} />}
      {editProduct && <InventoryEditModal itemId={editProduct.id} onClose={() => setEditProduct(null)} onSuccess={() => { fetchItems(); setEditProduct(null); window.dispatchEvent(new CustomEvent('inventoryUpdated')); }} />}

      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4">{isUrdu ? 'ڈیلیٹ کی تصدیق' : 'Confirm Delete'}</h3>
            <p className="text-sm text-gray-500 mb-6">{isUrdu ? 'کیا آپ واقعی ڈیلیٹ کرنا چاہتے ہیں؟' : 'Are you sure?'}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm">{isUrdu ? 'منسوخ' : 'Cancel'}</button>
              <button onClick={() => handleDelete(deleteConfirm)} disabled={isDeleting} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm">{isUrdu ? 'ڈیلیٹ' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProductList);