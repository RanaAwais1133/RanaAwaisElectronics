import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface Props {
  productId: string;
  currentPrice?: number;
  onClose: () => void;
  onSuccess: () => void;
}

const AddStockModal: React.FC<Props> = ({ productId, currentPrice, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState(1);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (quantity <= 0) {
      toast.error(t('invalid_quantity'));
      return;
    }
    setLoading(true);
    try {
      // Add stock to inventory
      await api.post('/inventory/add-stock', {
        product_id: productId,
        quantity,
        purchase_price: Number(purchasePrice) || 0,
      });

      // Update product prices if provided
      const updateData: Record<string, any> = {};
      if (Number(purchasePrice) > 0) {
        updateData.purchase_price = Number(purchasePrice);
      }
      if (Number(sellingPrice) > 0) {
        updateData.price = Number(sellingPrice);
      }
      if (Object.keys(updateData).length > 0) {
        await api.put(`/products/${productId}`, updateData)
          .catch(() => toast.error(t('price_update_failed')));
      }

      toast.success(t('stock_added'));
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.error || t('error_adding_stock'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('add_stock')}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Quantity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('quantity')} *
            </label>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* Purchase Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('purchase_price')} ({t('optional')})
            </label>
            <input
              type="number"
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder="0"
            />
          </div>

          {/* Selling Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('selling_price')} ({t('optional')})
            </label>
            <input
              type="number"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              placeholder={currentPrice ? `Current: Rs. ${currentPrice}` : 'Enter new selling price'}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
            >
              {t('cancel')}
            </button>
            <button
              onClick={handleAdd}
              disabled={loading}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {loading ? t('adding') : t('add')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddStockModal;
