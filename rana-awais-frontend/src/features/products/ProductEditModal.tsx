import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import FormField from '../../components/forms/FormField';
import { useAuthStore } from '../../store/useAuthStore';
import { useProductStore } from '../../store/useProductStore';
import { APP_CONFIG } from '../../config/app';
import AddStockModal from './AddStockModal';

interface Props {
  productId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const ProductEditModal: React.FC<Props> = ({ productId, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  // ✅ State
  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [company, setCompany] = useState('');
  const [companyUrdu, setCompanyUrdu] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [stockCount, setStockCount] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [showAddStock, setShowAddStock] = useState(false);

  // ✅ Page title
  useEffect(() => {
    document.title = `${isUrdu ? 'پروڈکٹ میں ترمیم' : 'Edit Product'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  // ✅ Fetch product from store first (instant), then refresh from API
  useEffect(() => {
    const products = useProductStore.getState().products;
    const cached = products.find(p => p.id === productId);
    
    if (cached) {
      setName(cached.name || '');
      setNameUrdu(cached.nameUrdu || '');
      setCompany(cached.company || '');
      setCompanyUrdu(cached.companyUrdu || '');
      setCategory(cached.category || '');
      setSellingPrice(cached.price ? String(cached.price) : '');
      setPurchasePrice(cached.purchasePrice ? String(cached.purchasePrice) : '');
      setDescription(cached.description || '');
      setSku(cached.sku || '');
      setStockCount(cached.stockCount || 0);
      setError('');
      setFetching(false);
    }

    // Refresh from API in background
    api.get(`/products/${productId}`)
      .then(res => {
        const p = res.data;
        setName(p.name || '');
        setNameUrdu(p.nameUrdu || '');
        setCompany(p.company || '');
        setCompanyUrdu(p.companyUrdu || '');
        setCategory(p.category || '');
        setSellingPrice(p.price ? String(p.price) : '');
        setPurchasePrice(p.purchasePrice ? String(p.purchasePrice) : '');
        setDescription(p.description || '');
        setSku(p.sku || '');
        setStockCount(p.stockCount || 0);
        setError('');
      })
      .catch(() => {
        // If no cached data and API fails, show error
        if (!cached) {
          setError(isUrdu ? 'پروڈکٹ نہیں ملی' : t('product_not_found'));
        }
      })
      .finally(() => setFetching(false));
  }, [productId, t, isUrdu]);

  // ✅ Auto-fill helper
  const autoFillFromName = () => {
    if (name && !nameUrdu) {
      setNameUrdu(name);
    }
    if (nameUrdu && !name) {
      setName(nameUrdu);
    }
  };

  const autoFillCompany = () => {
    if (company && !companyUrdu) {
      setCompanyUrdu(company);
    }
    if (companyUrdu && !company) {
      setCompany(companyUrdu);
    }
  };

  // ✅ Validation
  const validateForm = useCallback(() => {
    if (!name && !nameUrdu) {
      setError(isUrdu ? 'نام ضروری ہے' : t('name_required'));
      return false;
    }
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      setError(isUrdu ? 'فروخت قیمت ضروری ہے' : t('name_price_required'));
      return false;
    }
    return true;
  }, [name, nameUrdu, sellingPrice, t, isUrdu]);

  const updateProduct = useProductStore(s => s.updateProduct);

  // ✅ Submit handler with OPTIMISTIC UI
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    const payload = {
      name: name || nameUrdu,
      nameUrdu: nameUrdu || name,
      company: company || companyUrdu,
      companyUrdu: companyUrdu || company,
      category: category || '',
      price: Math.round(parseFloat(sellingPrice) * 100) / 100,
      purchasePrice: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) / 100 : 0,
      description: description || '',
      sku: sku || '',
      updated_by: currentUser?.displayName || currentUser?.username || '',
    };

    // ✅ OPTIMISTIC: Update UI immediately
    updateProduct(productId, payload);

    try {
      await api.put(`/products/${productId}`, payload);
      toast.success(isUrdu ? 'پروڈکٹ اپ ڈیٹ ہو گئی' : t('product_updated'));
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'پروڈکٹ اپ ڈیٹ کرنے میں ناکامی' : t('error_updating_product'));
      setError(errorMsg);
    } finally {
      setLoading(false);
      onSuccess();
      onClose();
    }
  }, [
    productId,
    name,
    nameUrdu,
    company,
    companyUrdu,
    category,
    sellingPrice,
    purchasePrice,
    description,
    sku,
    currentUser,
    onSuccess,
    onClose,
    t,
    isUrdu,
    validateForm,
    updateProduct,
  ]);

  // ✅ Loading state
  if (fetching) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-gray-600 dark:text-gray-300">
              {isUrdu ? 'لوڈ ہو رہا ہے...' : t('loading')}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto mx-2"
        onClick={e => e.stopPropagation()}
      >
        {/* ✅ Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isUrdu ? 'پروڈکٹ میں ترمیم' : t('edit_product')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
          >
            &times;
          </button>
        </div>

        {/* ✅ Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'نام (انگریزی)' : 'Name (English)'}
              name="name"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={autoFillFromName}
              required
            />
            <FormField
              label={isUrdu ? 'نام (اردو)' : 'Name (Urdu)'}
              name="nameUrdu"
              value={nameUrdu}
              onChange={e => setNameUrdu(e.target.value)}
              onBlur={autoFillFromName}
              required
            />
          </div>

          {/* Company Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'کمپنی (انگریزی)' : 'Company (English)'}
              name="company"
              value={company}
              onChange={e => setCompany(e.target.value)}
              onBlur={autoFillCompany}
            />
            <FormField
              label={isUrdu ? 'کمپنی (اردو)' : 'Company (Urdu)'}
              name="companyUrdu"
              value={companyUrdu}
              onChange={e => setCompanyUrdu(e.target.value)}
              onBlur={autoFillCompany}
            />
          </div>

          {/* Category & SKU */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'کیٹیگری' : t('category')}
              name="category"
              value={category}
              onChange={e => setCategory(e.target.value)}
              placeholder={isUrdu ? 'مثال: موبائل' : 'e.g., Mobile'}
            />
            <FormField
              label="SKU"
              name="sku"
              value={sku}
              onChange={e => setSku(e.target.value)}
              placeholder="SKU-12345"
            />
          </div>

          {/* Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'فروخت قیمت' : t('selling_price')}
              name="sellingPrice"
              type="number"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              required
              min={0}
              step="0.01"
              placeholder="0"
            />
            <FormField
              label={isUrdu ? 'خریداری قیمت' : t('purchase_price')}
              name="purchasePrice"
              type="number"
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              min={0}
              step="0.01"
              placeholder="0"
            />
          </div>

          {/* Description */}
          <FormField
            label={isUrdu ? 'تفصیل' : t('description')}
            name="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={isUrdu ? 'اختیاری' : 'Optional'}
          />

          {/* ✅ Stock Info + Add Stock Button */}
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {isUrdu ? 'اسٹاک کی مقدار' : t('quantity')}:
                <span className="font-bold ml-2 text-gray-800 dark:text-white">{stockCount}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAddStock(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
            >
              + {isUrdu ? 'اسٹاک شامل کریں' : 'Add Stock'}
            </button>
          </div>

          {/* ✅ Error */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* ✅ Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
            >
              {isUrdu ? 'منسوخ کریں' : t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {isUrdu ? 'محفوظ ہو رہا...' : t('saving')}
                </span>
              ) : (
                isUrdu ? 'اپ ڈیٹ کریں' : t('save')
              )}
            </button>
          </div>
        </form>
      </div>

      {/* ✅ Add Stock Modal */}
      {showAddStock && (
        <AddStockModal
          productId={productId}
          productName={isUrdu ? nameUrdu || name : name}
          currentPrice={parseFloat(sellingPrice) || 0}
          currentPurchasePrice={parseFloat(purchasePrice) || 0}
          onClose={() => setShowAddStock(false)}
          onSuccess={() => {
            // Refresh product data
            api.get(`/products/${productId}`)
              .then(res => {
                const p = res.data;
                setStockCount(p.stockCount || 0);
                if (p.price) setSellingPrice(String(p.price));
                if (p.purchasePrice) setPurchasePrice(String(p.purchasePrice));
              })
              .catch(() => {
                // Silently ignore fetch errors
              });
            setShowAddStock(false);
          }}
        />
      )}
    </div>
  );
};

export default ProductEditModal;