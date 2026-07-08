// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Product Create/Edit Modal
// ✅ Merged create + edit mode
// ✅ Optimistic updates with rollback
// ✅ Real-time SSE sync
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import FormField from '../../components/forms/FormField';
import { useAuthStore } from '../../store/useAuthStore';
import { useProductStore, Product } from '../../store/useProductStore';
import { APP_CONFIG } from '../../config/app';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Product;
}

const ProductCreate: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);

  // State
  const [name, setName] = useState(initialData?.name || '');
  const [nameUrdu, setNameUrdu] = useState(initialData?.nameUrdu || '');
  const [company, setCompany] = useState(initialData?.company || '');
  const [companyUrdu, setCompanyUrdu] = useState(initialData?.companyUrdu || '');
  const [category, setCategory] = useState(initialData?.category || '');
  const [sellingPrice, setSellingPrice] = useState(initialData?.price ? String(initialData.price) : '');
  const [purchasePrice, setPurchasePrice] = useState(initialData?.purchasePrice ? String(initialData.purchasePrice) : '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [quantity, setQuantity] = useState(initialData?.stockCount || 1);
  const [sku, setSku] = useState(initialData?.sku || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditMode = !!initialData?.id;

  // Store actions
  const storeCreateProduct = useProductStore(s => s.createProduct);
  const storeUpdateProduct = useProductStore(s => s.updateProduct);

  // Page title
  useEffect(() => {
    document.title = `${isEditMode ? (isUrdu ? 'پروڈکٹ میں ترمیم' : 'Edit Product') : (isUrdu ? 'نیا پروڈکٹ' : t('add_product'))} | ${APP_CONFIG.companyName}`;
  }, [isEditMode, t, isUrdu]);

  // Auto-fill helper
  const autoFillFromName = () => {
    if (name && !nameUrdu) setNameUrdu(name);
    if (nameUrdu && !name) setName(nameUrdu);
  };

  const autoFillCompany = () => {
    if (company && !companyUrdu) setCompanyUrdu(company);
    if (companyUrdu && !company) setCompany(companyUrdu);
  };

  // Validation
  const validateForm = useCallback(() => {
    if (!name && !nameUrdu) {
      setError(isUrdu ? 'نام ضروری ہے' : t('name_required'));
      return false;
    }
    if (!sellingPrice || parseFloat(sellingPrice) <= 0) {
      setError(isUrdu ? 'فروخت قیمت ضروری ہے' : t('name_price_required'));
      return false;
    }
    if (quantity < 0) {
      setError(isUrdu ? 'مقدار منفی نہیں ہو سکتی' : 'Quantity cannot be negative');
      return false;
    }
    return true;
  }, [name, nameUrdu, sellingPrice, quantity, t, isUrdu]);

  // Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    const productData = {
      name: name || nameUrdu,
      nameUrdu: nameUrdu || name,
      company: company || companyUrdu,
      companyUrdu: companyUrdu || company,
      category: category || '',
      price: Math.round(parseFloat(sellingPrice) * 100) / 100,
      purchasePrice: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) / 100 : 0,
      description: description || '',
      sku: sku || '',
      stockCount: Number(quantity) || 0,
      in_stock: Number(quantity) > 0,
      created_by: currentUser?.displayName || currentUser?.username || '',
    };

    try {
      if (isEditMode && initialData?.id) {
        // Edit mode - use store's optimistic update
        const success = await storeUpdateProduct(initialData.id, productData);
        if (!success) {
          setError(isUrdu ? 'اپ ڈیٹ ناکام' : 'Update failed');
          return;
        }
        toast.success(isUrdu ? 'پروڈکٹ اپ ڈیٹ ہو گئی' : 'Product updated successfully');
      } else {
        // Create mode - use store's optimistic create
        const result = await storeCreateProduct(productData);
        if (!result) {
          setError(isUrdu ? 'پروڈکٹ بنانے میں ناکامی' : 'Failed to create product');
          return;
        }
        toast.success(isUrdu ? 'پروڈکٹ بن گئی' : t('product_created'));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message ||
        (isUrdu ? 'پروڈکٹ بنانے میں ناکامی' : t('error_creating_product'));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [
    name, nameUrdu, company, companyUrdu, category,
    sellingPrice, purchasePrice, description, quantity, sku,
    isEditMode, initialData, currentUser, onSuccess, onClose,
    t, isUrdu, validateForm, storeCreateProduct, storeUpdateProduct,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto mx-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isEditMode ? (isUrdu ? 'پروڈکٹ میں ترمیم' : 'Edit Product') : (isUrdu ? 'نیا پروڈکٹ' : t('add_product'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Form */}
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

          {/* Quantity (only for new products) */}
          {!isEditMode && (
            <FormField
              label={isUrdu ? 'مقدار (اسٹاک)' : t('quantity')}
              name="quantity"
              type="number"
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              min={0}
              step={1}
              placeholder="1"
            />
          )}

          {/* Description */}
          <FormField
            label={isUrdu ? 'تفصیل' : t('description')}
            name="description"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={isUrdu ? 'اختیاری' : 'Optional'}
          />

          {/* Error */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* Actions */}
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
                isEditMode ? (isUrdu ? 'اپ ڈیٹ کریں' : 'Update') : (isUrdu ? 'محفوظ کریں' : t('save'))
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductCreate;
