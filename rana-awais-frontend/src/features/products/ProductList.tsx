// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Product List v2
// ✅ Bulk operations, search, category filter
// ✅ Optimistic updates with rollback
// ✅ Real-time SSE sync
// ✅ Pagination, low stock alerts
// ═══════════════════════════════════════════════════════════════

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useProductStore, Product, getStockStatusColor, getStockStatusLabel, getProductStockStatus } from '../../store/useProductStore';
import ProductCreate from './ProductCreate';
import AddStockModal from './AddStockModal';
import { APP_CONFIG } from '../../config/app';
import { useAuthStore } from '../../store/useAuthStore';

// ✅ Product Card Component
const ProductCard: React.FC<{
  product: Product;
  isUrdu: boolean;
  isSelected: boolean;
  isBulkMode: boolean;
  onEdit: (product: Product) => void;
  onAddStock: (id: string) => void;
  onDelete: (id: string) => void;
  onToggleSelect: (id: string) => void;
  t: (key: string) => string;
}> = ({ product, isUrdu, isSelected, isBulkMode, onEdit, onAddStock, onDelete, onToggleSelect, t }) => {
  const stockStatus = getProductStockStatus(product);
  const statusColor = getStockStatusColor(product);
  const statusLabel = getStockStatusLabel(product, isUrdu);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-2xl shadow-sm border-2 p-4 sm:p-5 relative group hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 ${
      isSelected ? 'border-blue-500 dark:border-blue-400 shadow-blue-200 dark:shadow-blue-900/30' : 'border-gray-200 dark:border-gray-700'
    }`}>
      {/* ✅ Bulk Mode Checkbox */}
      {isBulkMode && (
        <div className={`absolute top-3 z-10 ${isUrdu ? 'right-3' : 'left-3'}`}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelect(product.id)}
            className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          />
        </div>
      )}

      {/* ✅ Action Buttons */}
      {!isBulkMode && (
        <div className={`absolute top-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 ${isUrdu ? 'left-3' : 'right-3'}`}>
          <button
            onClick={() => onEdit(product)}
            className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-all"
            title={t('edit')}
            aria-label={t('edit')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onAddStock(product.id)}
            className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
            title={t('add_stock')}
            aria-label={t('add_stock')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="p-2 rounded-xl bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
            title={t('delete')}
            aria-label={t('delete')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* ✅ Product Info */}
      <h3 className={`font-bold text-base sm:text-lg mb-1 text-gray-800 dark:text-white ${isBulkMode ? 'pl-0' : 'pr-16'}`}>
        {isUrdu ? (product.nameUrdu || product.name) : (product.name || product.nameUrdu)}
      </h3>

      {(product.company || product.companyUrdu) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
          {isUrdu ? (product.companyUrdu || product.company) : (product.company || product.companyUrdu)}
        </p>
      )}

      <p className="text-xs text-gray-400 dark:text-gray-500 mb-3">
        {product.category || '—'}
      </p>

      <p className="text-xl sm:text-2xl font-bold mb-3 text-gray-800 dark:text-white">
        Rs. {product.price?.toLocaleString()}
      </p>

      {/* ✅ Stock Status */}
      <div className="flex items-center justify-between">
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
          {statusLabel}
        </span>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('quantity')}: {product.stockCount ?? 0}
        </span>
      </div>
    </div>
  );
};

const ProductList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);

  // Store
  const {
    products, loading, error, fetchProducts, deleteProduct, bulkDelete,
    searchProducts, setSearchQuery, setSelectedCategory,
    selectedIds, isBulkMode, toggleBulkMode, toggleSelection, selectAll, clearSelection,
    pagination, setPage, getCategories,
  } = useProductStore();

  // Local state
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [addStockProductId, setAddStockProductId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Categories
  const categories = useMemo(() => getCategories(), [products, getCategories]);

  // Page title
  useEffect(() => {
    document.title = `${t('products')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Filter products locally
  const filtered = useMemo(() => {
    let result = products;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(p =>
        p.name?.toLowerCase().includes(q) ||
        p.nameUrdu?.includes(q) ||
        p.category?.toLowerCase().includes(q) ||
        p.company?.toLowerCase().includes(q) ||
        p.companyUrdu?.includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      result = result.filter(p => p.category === categoryFilter);
    }

    return result;
  }, [products, search, categoryFilter]);

  // Handle search with debounce
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setSearchQuery(value);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (value) {
      const timeout = setTimeout(() => {
        searchProducts(value);
      }, 500);
      setSearchTimeout(timeout);
    } else {
      fetchProducts(true);
    }
  }, [fetchProducts, searchProducts, setSearchQuery, searchTimeout]);

  // Handle delete
  const handleDelete = useCallback(async (id: string) => {
    setIsDeleting(true);
    setDeleteConfirm(null);

    const success = await deleteProduct(id);
    if (success) {
      toast.success(isUrdu ? 'پروڈکٹ ڈیلیٹ ہو گئی' : t('product_deleted'));
    } else {
      toast.error(isUrdu ? 'پروڈکٹ ڈیلیٹ کرنے میں ناکامی' : t('error_deleting_product'));
    }
    setIsDeleting(false);
  }, [deleteProduct, t, isUrdu]);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    setIsDeleting(true);
    setBulkDeleteConfirm(false);

    const ids = Array.from(selectedIds);
    const success = await bulkDelete(ids);
    if (success) {
      toast.success(isUrdu ? `${ids.length} پروڈکٹس ڈیلیٹ ہو گئیں` : `${ids.length} products deleted`);
    } else {
      toast.error(isUrdu ? 'ڈیلیٹ کرنے میں ناکامی' : 'Failed to delete');
    }
    setIsDeleting(false);
  }, [selectedIds, bulkDelete, isUrdu]);

  // Loading state
  if (loading && products.length === 0) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            {isUrdu ? 'پروڈکٹس' : t('products')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {filtered.length} {t('products').toLowerCase()}
            {isBulkMode && ` (${selectedIds.size} selected)`}
          </p>
        </div>
        <div className="flex gap-2">
          {/* Bulk Mode Toggle */}
          <button
            onClick={toggleBulkMode}
            className={`inline-flex items-center px-3 sm:px-4 py-2.5 sm:py-3 rounded-2xl text-sm font-semibold transition-all ${
              isBulkMode
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            {isBulkMode ? (isUrdu ? 'منتخب موڈ بند' : 'Exit Bulk') : (isUrdu ? 'بلک موڈ' : 'Bulk')}
          </button>

          {/* Add Product Button */}
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-4 sm:px-5 py-2.5 sm:py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95 transition-all"
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {isUrdu ? 'نیا پروڈکٹ' : t('add_product')}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isBulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-200 dark:border-purple-800">
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            {selectedIds.size} {isUrdu ? 'منتخب' : 'selected'}
          </span>
          <button
            onClick={selectAll}
            className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded-lg text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-900/60 transition-colors"
          >
            {isUrdu ? 'سب منتخب کریں' : 'Select All'}
          </button>
          <button
            onClick={clearSelection}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {isUrdu ? 'صاف کریں' : 'Clear'}
          </button>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="px-3 py-1.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded-lg text-xs font-medium hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors ml-auto"
          >
            {isUrdu ? 'ڈیلیٹ کریں' : 'Delete'}
          </button>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <div className={`absolute inset-y-0 ${isUrdu ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder={isUrdu ? 'پروڈکٹ تلاش کریں...' : `${t('search')} ${t('products')}...`}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className={`w-full ${isUrdu ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-3.5 border border-gray-300 dark:border-gray-600 rounded-2xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent shadow-sm transition-all`}
          />
          {search && (
            <button
              onClick={() => handleSearchChange('')}
              className={`absolute inset-y-0 ${isUrdu ? 'left-0 pl-4' : 'right-0 pr-4'} flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={e => {
            setCategoryFilter(e.target.value);
            setSelectedCategory(e.target.value);
          }}
          className="border border-gray-300 dark:border-gray-600 rounded-2xl px-4 py-3.5 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
        >
          <option value="all">{isUrdu ? 'تمام کیٹیگریز' : 'All Categories'}</option>
          {categories.filter(c => c !== 'all').map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl border border-red-200 dark:border-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">
            {search || categoryFilter !== 'all'
              ? (isUrdu ? 'کوئی پروڈکٹ نہیں ملی' : t('no_products_found') || 'No products found')
              : (isUrdu ? 'کوئی پروڈکٹ نہیں' : t('no_products'))}
          </h3>
          {(search || categoryFilter !== 'all') && (
            <button
              onClick={() => { handleSearchChange(''); setCategoryFilter('all'); setSelectedCategory('all'); }}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isUrdu ? 'تلاش صاف کریں' : (t('clear_search') || 'Clear Search')}
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(p => (
              <ProductCard
                key={p.id}
                product={p}
                isUrdu={isUrdu}
                isSelected={selectedIds.has(p.id)}
                isBulkMode={isBulkMode}
                onEdit={(product) => setEditProduct(product)}
                onAddStock={setAddStockProductId}
                onDelete={setDeleteConfirm}
                onToggleSelect={toggleSelection}
                t={t}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-8">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {isUrdu ? 'پچھلا' : 'Previous'}
              </button>
              <span className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {isUrdu ? 'اگلا' : 'Next'}
              </button>
            </div>
          )}
        </>
      )}

      {/* Create Modal */}
      {showCreate && (
        <ProductCreate
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            fetchProducts(true);
            setShowCreate(false);
          }}
        />
      )}

      {/* Edit Modal */}
      {editProduct && (
        <ProductCreate
          initialData={editProduct}
          onClose={() => setEditProduct(null)}
          onSuccess={() => {
            fetchProducts(true);
            setEditProduct(null);
          }}
        />
      )}

      {/* Add Stock Modal */}
      {addStockProductId && (
        <AddStockModal
          productId={addStockProductId}
          productName={(() => {
            const p = products.find(pr => pr.id === addStockProductId);
            return p ? (isUrdu ? p.nameUrdu || p.name : p.name || p.nameUrdu) : undefined;
          })()}
          currentPrice={products.find(p => p.id === addStockProductId)?.price}
          currentPurchasePrice={products.find(p => p.id === addStockProductId)?.purchasePrice}
          onClose={() => setAddStockProductId(null)}
          onSuccess={() => {
            fetchProducts(true);
            setAddStockProductId(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
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
              {isUrdu ? 'کیا آپ واقعی اس پروڈکٹ کو ڈیلیٹ کرنا چاہتے ہیں؟' : t('delete_product_confirm')}
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
                  isUrdu ? 'ڈیلیٹ کریں' : t('delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {isUrdu ? 'بلک ڈیلیٹ کی تصدیق' : 'Confirm Bulk Delete'}
              </h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isUrdu
                ? `کیا آپ ${selectedIds.size} پروڈکٹس کو ڈیلیٹ کرنا چاہتے ہیں؟`
                : `Are you sure you want to delete ${selectedIds.size} products?`}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-all"
              >
                {isUrdu ? 'منسوخ کریں' : t('cancel')}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-red-500/25"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isUrdu ? 'ڈیلیٹ ہو رہا...' : t('deleting')}
                  </span>
                ) : (
                  isUrdu ? 'ڈیلیٹ کریں' : t('delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(ProductList);
