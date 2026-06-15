import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useProductStore } from '../../store/useProductStore';
import SearchableSelect from '../../components/forms/SearchableSelect';
import FormField from '../../components/forms/FormField';
import DateField from '../../components/forms/DateField';

interface Props {
  itemId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const InventoryEditModal: React.FC<Props> = ({ itemId, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const { products, fetchProducts } = useProductStore();
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
  const [status, setStatus] = useState('in_stock');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchProducts();
    api.get(`/inventory/${itemId}`)
      .then(res => {
        const i = res.data;
        setProductId(i.productId || '');
        setSerialNumber(i.serialNumber || '');
        setColor(i.color || '');
        setModel(i.model || '');
        setEngineNo(i.engineNo || '');
        setChassisNo(i.chassisNo || '');
        setImei(i.imei || '');
        setCompany(i.company || '');
        setPurchaseDate(i.purchaseDate ? i.purchaseDate.split('T')[0] : '');
        setPurchasePrice(i.purchasePrice ? String(i.purchasePrice) : '');
        setStatus(i.status || 'in_stock');
        setError('');
      })
      .catch(() => setError(t('item_not_found')))
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, t]);

  const isUrdu = i18n.language === 'ur';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      setError(t('select_product'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.put(`/inventory/${itemId}`, {
        product_id: productId,
        serialNumber,
        color,
        model,
        engineNo,
        chassisNo,
        imei,
        company,
        purchase_date: purchaseDate,
        purchase_price: Number(purchasePrice) || 0,
        status,
      });
      toast.success(t('inventory_item_updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t('error_updating_inventory'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"><div className="bg-white dark:bg-gray-800 rounded-2xl p-6">{t('loading')}</div></div>;
  }

  const productOptions = products.map(p => ({
    value: p.id,
    label: isUrdu ? `${p.nameUrdu || p.name} - Rs. ${p.price}` : `${p.name} - Rs. ${p.price}`,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('edit_inventory')}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <SearchableSelect
            label={t('product')}
            name="productId"
            value={productId}
            onChange={setProductId}
            options={productOptions}
            placeholder={t('select_product')}
            required
          />
          <FormField label={t('serial_number')} name="serialNumber" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} placeholder="IMEI / Serial" />
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('color')} name="color" value={color} onChange={e => setColor(e.target.value)} placeholder="Optional" />
            <FormField label={t('model')} name="model" value={model} onChange={e => setModel(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('engine_no')} name="engineNo" value={engineNo} onChange={e => setEngineNo(e.target.value)} placeholder="Optional" />
            <FormField label={t('chassis_no')} name="chassisNo" value={chassisNo} onChange={e => setChassisNo(e.target.value)} placeholder="Optional" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('imei')} name="imei" value={imei} onChange={e => setImei(e.target.value)} placeholder="Optional" />
            <FormField label={t('company')} name="company" value={company} onChange={e => setCompany(e.target.value)} placeholder="Brand" />
          </div>
          <DateField label={t('purchase_date')} name="purchaseDate" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
          <FormField label={t('purchase_price')} name="purchasePrice" type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} placeholder="0" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('status')}</label>
            <select value={status} onChange={e => setStatus(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm">
              <option value="in_stock">{t('in_stock')}</option>
              <option value="sold">{t('sold')}</option>
              <option value="returned">{t('returned')}</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-lg">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm font-medium">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">{loading ? t('saving') : t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryEditModal;
