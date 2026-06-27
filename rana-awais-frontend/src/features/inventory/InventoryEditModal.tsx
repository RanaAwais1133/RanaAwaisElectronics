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
  itemId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const InventoryEditModal: React.FC<Props> = ({ itemId, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  const { products, fetchProducts } = useProductStore();
  
  // ✅ State
  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [color, setColor] = useState('');
  const [model, setModel] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [imei, setImei] = useState('');
  const [company, setCompany] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [status, setStatus] = useState('in_stock');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ✅ Page title
  useEffect(() => {
    document.title = `${isUrdu ? 'انوینٹری میں ترمیم' : 'Edit Inventory'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  // ✅ Fetch products
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // ✅ Fetch inventory item
  useEffect(() => {
    api.get(`/inventory/${itemId}`)
      .then(res => {
        const i = res.data;
        setProductId(i.productId || i.product_id || '');
        setSerialNumber(i.serialNumber || i.serial_number || '');
        setColor(i.color || '');
        setModel(i.model || '');
        setEngineNo(i.engineNo || i.engine_no || '');
        setChassisNo(i.chassisNo || i.chassis_no || '');
        setImei(i.imei || '');
        setCompany(i.company || '');
        setPurchaseDate(i.purchaseDate ? i.purchaseDate.split('T')[0] : (i.purchase_date ? i.purchase_date.split('T')[0] : ''));
        setPurchasePrice(i.purchasePrice ? String(i.purchasePrice) : (i.purchase_price ? String(i.purchase_price) : ''));
        setSellingPrice(i.sellingPrice ? String(i.sellingPrice) : (i.selling_price ? String(i.selling_price) : ''));
        setStatus(i.status || 'in_stock');
        setError('');
      })
      .catch(() => {
        setError(isUrdu ? 'آئٹم نہیں ملا' : t('item_not_found'));
      })
      .finally(() => setFetching(false));
  }, [itemId, t, isUrdu]);

  // ✅ Product options
  const productOptions = products.map(p => ({
    value: p.id,
    label: isUrdu ? `${p.nameUrdu || p.name} - Rs. ${p.price}` : `${p.name} - Rs. ${p.price}`,
    labelUrdu: `${p.nameUrdu || p.name} - Rs. ${p.price}`,
  }));

  // ✅ Validation
  const validateForm = useCallback(() => {
    if (!productId) {
      setError(isUrdu ? 'براہ کرم پروڈکٹ منتخب کریں' : t('select_product'));
      return false;
    }
    const price = parseFloat(purchasePrice);
    if (purchasePrice && isNaN(price) || price < 0) {
      setError(isUrdu ? 'خریداری کی قیمت درست نہیں' : 'Invalid purchase price');
      return false;
    }
    return true;
  }, [productId, purchasePrice, t, isUrdu]);

  // ✅ Submit handler
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      await api.put(`/inventory/${itemId}`, {
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
        status: status || 'in_stock',
        updated_by: currentUser?.displayName || currentUser?.username || '',
      });
      
      toast.success(isUrdu ? 'انوینٹری اپ ڈیٹ ہو گئی' : t('inventory_item_updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'انوینٹری اپ ڈیٹ کرنے میں ناکامی' : t('error_updating_inventory'));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [
    itemId,
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
    status,
    currentUser,
    onSuccess,
    onClose,
    t,
    isUrdu,
    validateForm,
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
            {isUrdu ? 'انوینٹری میں ترمیم' : t('edit_inventory')}
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
          {/* Product Selection */}
          <SearchableSelect
            label={isUrdu ? 'پروڈکٹ' : t('product')}
            name="productId"
            value={productId}
            onChange={setProductId}
            options={productOptions}
            placeholder={isUrdu ? 'پروڈکٹ منتخب کریں' : t('select_product')}
            required
          />

          {/* Serial Number & Company */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'سیریل نمبر' : t('serial_number')}
              name="serialNumber"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="IMEI / Serial"
            />
            <FormField
              label={isUrdu ? 'کمپنی' : t('company')}
              name="company"
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder={isUrdu ? 'برانڈ' : 'Brand'}
            />
          </div>

          {/* Color & Model */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'رنگ' : t('color')}
              name="color"
              value={color}
              onChange={e => setColor(e.target.value)}
              placeholder={isUrdu ? 'اختیاری' : 'Optional'}
            />
            <FormField
              label={isUrdu ? 'ماڈل' : t('model')}
              name="model"
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder={isUrdu ? 'اختیاری' : 'Optional'}
            />
          </div>

          {/* Engine & Chassis */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'انجن نمبر' : t('engine_no')}
              name="engineNo"
              value={engineNo}
              onChange={e => setEngineNo(e.target.value)}
              placeholder={isUrdu ? 'اختیاری' : 'Optional'}
            />
            <FormField
              label={isUrdu ? 'شاسی نمبر' : t('chassis_no')}
              name="chassisNo"
              value={chassisNo}
              onChange={e => setChassisNo(e.target.value)}
              placeholder={isUrdu ? 'اختیاری' : 'Optional'}
            />
          </div>

          {/* IMEI */}
          <FormField
            label={isUrdu ? 'آئی ایم ای آئی' : t('imei')}
            name="imei"
            value={imei}
            onChange={e => setImei(e.target.value)}
            placeholder={isUrdu ? 'اختیاری' : 'Optional'}
          />

          {/* Purchase Date & Prices */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <DateField
              label={isUrdu ? 'خریداری کی تاریخ' : t('purchase_date')}
              name="purchaseDate"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'خریداری قیمت' : t('purchase_price')}
              name="purchasePrice"
              type="number"
              value={purchasePrice}
              onChange={e => setPurchasePrice(e.target.value)}
              placeholder="0"
              min={0}
              step="0.01"
            />
            <FormField
              label={isUrdu ? 'فروخت قیمت' : 'Selling Price'}
              name="sellingPrice"
              type="number"
              value={sellingPrice}
              onChange={e => setSellingPrice(e.target.value)}
              placeholder="0"
              min={0}
              step="0.01"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isUrdu ? 'حالت' : t('status')}
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            >
              <option value="in_stock">{isUrdu ? 'اسٹاک میں' : t('in_stock')}</option>
              <option value="sold">{isUrdu ? 'فروخت' : t('sold')}</option>
              <option value="returned">{isUrdu ? 'واپس' : t('returned')}</option>
            </select>
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
    </div>
  );
};

export default InventoryEditModal;