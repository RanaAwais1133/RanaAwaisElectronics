import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useProductStore } from '../../store/useProductStore';
import SearchableSelect from '../../components/forms/SearchableSelect';
import FormField from '../../components/forms/FormField';
import DateField from '../../components/forms/DateField';
import { useAuthStore } from '../../store/useAuthStore';
import { APP_CONFIG } from '../../config/app';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // âœ… NEW: Edit mode support
}

const InventoryCreate: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  const { products, fetchProducts } = useProductStore();
  
  // âœ… State
  const [productId, setProductId] = useState(initialData?.productId || initialData?.product_id || '');
  const [serialNumber, setSerialNumber] = useState(initialData?.serialNumber || '');
  const [color, setColor] = useState(initialData?.color || '');
  const [model, setModel] = useState(initialData?.model || '');
  const [engineNo, setEngineNo] = useState(initialData?.engineNo || '');
  const [chassisNo, setChassisNo] = useState(initialData?.chassisNo || '');
  const [imei, setImei] = useState(initialData?.imei || '');
  const [company, setCompany] = useState(initialData?.company || '');
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate || initialData?.purchase_date || new Date().toISOString().split('T')[0]
  );
  const [purchasePrice, setPurchasePrice] = useState(
    initialData?.purchasePrice || initialData?.purchase_price || ''
  );
  const [sellingPrice, setSellingPrice] = useState(initialData?.sellingPrice || initialData?.selling_price || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode] = useState(!!initialData?.id);

  // âœ… Page title
  useEffect(() => {
    document.title = `${isEditMode ? (isUrdu ? 'Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ Ù…ÛŒÚº ØªØ±Ù…ÛŒÙ…' : 'Edit Inventory') : (isUrdu ? 'Ù†ÛŒØ§ Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ' : t('add_inventory'))} | ${APP_CONFIG.companyName}`;
  }, [isEditMode, t, isUrdu]);

  // âœ… Fetch products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // âœ… Product options
  const productOptions = products.map(p => ({
    value: p.id,
    label: isUrdu ? `${p.nameUrdu || p.name} - Rs. ${p.price}` : `${p.name} - Rs. ${p.price}`,
    labelUrdu: `${p.nameUrdu || p.name} - Rs. ${p.price}`,
  }));

  // âœ… Auto-fill product details
  const selectedProduct = products.find(p => p.id === productId);
  
  useEffect(() => {
    if (selectedProduct && !isEditMode) {
      // Auto-fill company from product
      if (!company && selectedProduct.company) {
        setCompany(selectedProduct.company);
      }
    }
  }, [selectedProduct, company, isEditMode]);

  // âœ… Validation
  const validateForm = useCallback(() => {
    if (!productId) {
      setError(isUrdu ? 'Ø¨Ø±Ø§Û Ú©Ø±Ù… Ù¾Ø±ÙˆÚˆÚ©Ù¹ Ù…Ù†ØªØ®Ø¨ Ú©Ø±ÛŒÚº' : t('select_product'));
      return false;
    }
    const price = parseFloat(purchasePrice);
    if (purchasePrice && isNaN(price) || price < 0) {
      setError(isUrdu ? 'Ø®Ø±ÛŒØ¯Ø§Ø±ÛŒ Ú©ÛŒ Ù‚ÛŒÙ…Øª Ø¯Ø±Ø³Øª Ù†ÛÛŒÚº' : 'Invalid purchase price');
      return false;
    }
    return true;
  }, [productId, purchasePrice, t, isUrdu]);

  // âœ… Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    const payload = {
      ...(isEditMode && { id: initialData.id }),
      product_id: productId,
      serialNumber: serialNumber || '',
      color: color || '',
      model: model || '',
      engineNo: engineNo || '',
      chassisNo: chassisNo || '',
      imei: imei || '',
      company: company || '',
      purchase_date: purchaseDate,
      purchase_price: Number(purchasePrice) || 0,
      selling_price: Number(sellingPrice) || 0,
      created_by: currentUser?.displayName || currentUser?.username || '',
    };

    try {
      if (isEditMode) {
        await api.put(`/inventory/${initialData.id}`, payload);
        toast.success(isUrdu ? 'Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ Ø§Ù¾ ÚˆÛŒÙ¹ ÛÙˆ Ú¯Ø¦ÛŒ' : 'Inventory item updated successfully');
      } else {
        await api.post('/inventory', payload);
        toast.success(isUrdu ? 'Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ Ø´Ø§Ù…Ù„ ÛÙˆ Ú¯Ø¦ÛŒ' : t('inventory_item_added'));
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ Ø¨Ù†Ø§Ù†Û’ Ù…ÛŒÚº Ù†Ø§Ú©Ø§Ù…ÛŒ' : t('error_creating_inventory'));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [
    productId,
    serialNumber,
    color,
    model,
    engineNo,
    chassisNo,
    imei,
    company,
    purchaseDate,
    purchasePrice,
    sellingPrice,
    isEditMode,
    initialData,
    currentUser,
    onSuccess,
    onClose,
    t,
    isUrdu,
    validateForm,
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
        {/* âœ… Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isEditMode ? (isUrdu ? 'Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ Ù…ÛŒÚº ØªØ±Ù…ÛŒÙ…' : 'Edit Inventory') : (isUrdu ? 'Ù†ÛŒØ§ Ø§Ù†ÙˆÛŒÙ†Ù¹Ø±ÛŒ' : t('add_inventory'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
          >
            &times;
          </button>
        </div>

        {/* âœ… Form */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Product Selection */}
          <SearchableSelect
            label={isUrdu ? 'Ù¾Ø±ÙˆÚˆÚ©Ù¹' : t('product')}
            name="productId"
            value={productId}
            onChange={setProductId}
            options={productOptions}
            placeholder={isUrdu ? 'Ù¾Ø±ÙˆÚˆÚ©Ù¹ Ù…Ù†ØªØ®Ø¨ Ú©Ø±ÛŒÚº' : t('select_product')}
            required
            disabled={isEditMode}
          />

          {/* Serial Number & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'Ø³ÛŒØ±ÛŒÙ„ Ù†Ù…Ø¨Ø±' : t('serial_number')}
              name="serialNumber"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="IMEI / Serial"
            />
            <FormField
              label={isUrdu ? 'Ú©Ù…Ù¾Ù†ÛŒ' : t('company')}
              name="company"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder={isUrdu ? 'Ø¨Ø±Ø§Ù†Úˆ' : 'Brand'}
            />
          </div>

          {/* Color & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'Ø±Ù†Ú¯' : t('color')}
              name="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder={isUrdu ? 'Ø§Ø®ØªÛŒØ§Ø±ÛŒ' : 'Optional'}
            />
            <FormField
              label={isUrdu ? 'Ù…Ø§ÚˆÙ„' : t('model')}
              name="model"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={isUrdu ? 'Ø§Ø®ØªÛŒØ§Ø±ÛŒ' : 'Optional'}
            />
          </div>

          {/* Engine & Chassis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'Ø§Ù†Ø¬Ù† Ù†Ù…Ø¨Ø±' : t('engine_no')}
              name="engineNo"
              value={engineNo}
              onChange={e => setEngineNo(e.target.value)}
              placeholder={isUrdu ? 'Ø§Ø®ØªÛŒØ§Ø±ÛŒ' : 'Optional'}
            />
            <FormField
              label={isUrdu ? 'Ø´Ø§Ø³ÛŒ Ù†Ù…Ø¨Ø±' : t('chassis_no')}
              name="chassisNo"
              value={chassisNo}
              onChange={e => setChassisNo(e.target.value)}
              placeholder={isUrdu ? 'Ø§Ø®ØªÛŒØ§Ø±ÛŒ' : 'Optional'}
            />
          </div>

          {/* IMEI */}
          <FormField
            label={isUrdu ? 'Ø¢Ø¦ÛŒ Ø§ÛŒÙ… Ø§ÛŒ Ø¢Ø¦ÛŒ' : t('imei')}
            name="imei"
            value={imei}
            onChange={e => setImei(e.target.value)}
            placeholder={isUrdu ? 'Ø§Ø®ØªÛŒØ§Ø±ÛŒ' : 'Optional'}
          />

          {/* Purchase Date & Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DateField
              label={isUrdu ? 'Ø®Ø±ÛŒØ¯Ø§Ø±ÛŒ Ú©ÛŒ ØªØ§Ø±ÛŒØ®' : t('purchase_date')}
              name="purchaseDate"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'Ø®Ø±ÛŒØ¯Ø§Ø±ÛŒ Ù‚ÛŒÙ…Øª' : t('purchase_price')}
              name="purchasePrice"
              type="number"
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              placeholder="0"
              min={0}
              step="0.01"
            />
            <FormField
              label={isUrdu ? 'ÙØ±ÙˆØ®Øª Ù‚ÛŒÙ…Øª' : 'Selling Price'}
              name="sellingPrice"
              type="number"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              placeholder="0"
              min={0}
              step="0.01"
            />
          </div>

          {/* âœ… Error */}
          {error && (
            <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {/* âœ… Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
            >
              {isUrdu ? 'Ù…Ù†Ø³ÙˆØ® Ú©Ø±ÛŒÚº' : t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {isUrdu ? 'Ù…Ø­ÙÙˆØ¸ ÛÙˆ Ø±ÛØ§...' : t('saving')}
                </span>
              ) : (
                isEditMode ? (isUrdu ? 'Ø§Ù¾ ÚˆÛŒÙ¹ Ú©Ø±ÛŒÚº' : 'Update') : (isUrdu ? 'Ù…Ø­ÙÙˆØ¸ Ú©Ø±ÛŒÚº' : t('save'))
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryCreate;
