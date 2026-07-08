// ═══════════════════════════════════════════════════════════════
// ✅ Rana Awais Electronics - Add Stock Modal
// ✅ Optimistic stock update with rollback
// ✅ Real-time SSE sync
// ═══════════════════════════════════════════════════════════════

import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../store/useAuthStore';
import { useProductStore } from '../../store/useProductStore';
import { APP_CONFIG } from '../../config/app';

interface Props {
  productId: string;
  productName?: string;
  currentPrice?: number;
  currentPurchasePrice?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const AddStockModal: React.FC<Props> = ({
  productId,
  productName,
  currentPrice,
  currentPurchasePrice,
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);

  // State
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState(currentPurchasePrice ? String(currentPurchasePrice) : '');
  const [sellingPrice, setSellingPrice] = useState(currentPrice ? String(currentPrice) : '');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Store
  const storeAddStock = useProductStore(s => s.addStock);
  const currentStockCount = useProductStore(s => s.products.find(p => p.id === productId)?.stockCount || 0);

  // Page title
  useEffect(() => {
    document.title = `${isUrdu ? 'اسٹاک شامل کریں' : 'Add Stock'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  // Auto-fill prices from product
  useEffect(() => {
    if (currentPurchasePrice && !purchasePrice) setPurchasePrice(String(currentPurchasePrice));
    if (currentPrice && !sellingPrice) setSellingPrice(String(currentPrice));
  }, [currentPurchasePrice, currentPrice, purchasePrice, sellingPrice]);

  // Validation
  const validateForm = useCallback(() => {
    if (quantity <= 0) {
      setError(isUrdu ? 'مقدار صفر سے زیادہ ہونی چاہیے' : 'Quantity must be greater than 0');
      return false;
    }
    if (quantity > 1000) {
      setError(isUrdu ? 'ایک بار میں 1000 سے زیادہ اسٹاک شامل نہیں کر سکتے' : 'Cannot add more than 1000 items at once');
      return false;
    }
    const price = parseFloat(purchasePrice);
    if (purchasePrice && (isNaN(price) || price < 0)) {
      setError(isUrdu ? 'خریداری کی قیمت درست نہیں' : 'Invalid purchase price');
      return false;
    }
    return true;
  }, [quantity, purchasePrice, isUrdu]);

  // Handle add stock
  const handleAdd = useCallback(async () => {
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      // Use store's optimistic addStock
      const success = await storeAddStock(productId, quantity, note);
      if (!success) {
        setError(isUrdu ? 'اسٹاک شامل کرنے میں ناکامی' : 'Failed to add stock');
        return;
      }

      // Update prices if changed
      const updateData: Record<string, any> = {};
      if (Number(purchasePrice) > 0 && Number(purchasePrice) !== currentPurchasePrice) {
        updateData.purchasePrice = Number(purchasePrice);
      }
      if (Number(sellingPrice) > 0 && Number(sellingPrice) !== currentPrice) {
        updateData.price = Number(sellingPrice);
      }
      if (Object.keys(updateData).length > 0) {
        const { updateProduct } = useProductStore.getState();
        await updateProduct(productId, updateData);
      }

      toast.success(
        isUrdu
          ? `${quantity} آئٹمز اسٹاک میں شامل ہو گئے`
          : `${quantity} item(s) added to stock`
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message ||
        (isUrdu ? 'اسٹاک شامل کرنے میں ناکامی' : t('error_adding_stock'));
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [
    quantity, purchasePrice, sellingPrice, note, productId,
    currentPurchasePrice, currentPrice, currentUser,
    onSuccess, onClose, t, isUrdu, validateForm, storeAddStock,
  ]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-2"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isUrdu ? 'اسٹاک شامل کریں' : t('add_stock')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
          >
            &times;
          </button>
        </div>

        {/* Form */}
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Product Name */}
          {productName && (
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <p className="text-sm text-gray-600 dark:text-gray-300">
                <span className="font-semibold">{isUrdu ? 'پروڈکٹ' : 'Product'}:</span>
                <span className="ml-2 font-medium text-gray-800 dark:text-white">{productName}</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {isUrdu ? 'موجودہ اسٹاک' : 'Current Stock'}: {currentStockCount}
              </p>
            </div>
          )}

          {/* Quantity */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'مقدار' : t('quantity')} *
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onChange={e => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            />
            <p className="text-xs text-gray-400 mt-1">
              {isUrdu ? 'زیادہ سے زیادہ 1000' : 'Maximum 1000'}
            </p>
          </div>

          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'خریداری قیمت' : t('purchase_price')} ({isUrdu ? 'اختیاری' : t('optional')})
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
              placeholder={isUrdu ? '0' : '0'}
            />
            {currentPurchasePrice && (
              <p className="text-xs text-gray-400 mt-1">
                {isUrdu ? 'موجودہ' : 'Current'}: Rs. {currentPurchasePrice}
              </p>
            )}
          </div>

          {/* Selling Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'فروخت قیمت' : t('selling_price')} ({isUrdu ? 'اختیاری' : t('optional')})
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
              placeholder={isUrdu ? '0' : '0'}
            />
            {currentPrice && (
              <p className="text-xs text-gray-400 mt-1">
                {isUrdu ? 'موجودہ' : 'Current'}: Rs. {currentPrice}
              </p>
            )}
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'نوٹ' : 'Note'} ({isUrdu ? 'اختیاری' : t('optional')})
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={isUrdu ? 'مثال: نیا سٹاک آرڈر' : 'e.g., New stock order'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            />
          </div>

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
              onClick={handleAdd}
              disabled={loading}
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {isUrdu ? 'شامل ہو رہا...' : t('adding')}
                </span>
              ) : (
                isUrdu ? 'اسٹاک شامل کریں' : t('add')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStockModal;
