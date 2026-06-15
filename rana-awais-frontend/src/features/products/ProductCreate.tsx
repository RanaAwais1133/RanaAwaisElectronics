import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import FormField from '../../components/forms/FormField';

interface Props { onClose: () => void; onSuccess: () => void; }

const ProductCreate: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [company, setCompany] = useState('');
  const [companyUrdu, setCompanyUrdu] = useState('');
  const [category, setCategory] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !nameUrdu) {
      setError(t('name_required'));
      return;
    }
    if (!sellingPrice) {
      setError(t('name_price_required'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const productRes = await api.post('/products', {
        name: name || nameUrdu,
        nameUrdu: nameUrdu || name,
        company,
        companyUrdu,
        category,
        price: Math.round(parseFloat(sellingPrice) * 100) / 100,
        purchasePrice: purchasePrice ? Math.round(parseFloat(purchasePrice) * 100) / 100 : 0,
        description,
      });
      const productId = productRes.data.id;
      if (Number(quantity) > 0) {
        await api.post('/inventory/add-stock', {
          product_id: productId,
          quantity: Number(quantity),
          purchase_price: Number(purchasePrice) || 0,
        });
      }
      toast.success(t('product_created'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t('error_creating_product'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('add_product')}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <FormField label={t('name')} name="name" value={name} onChange={e => setName(e.target.value)} />
          <FormField label={t('name_urdu')} name="nameUrdu" value={nameUrdu} onChange={e => setNameUrdu(e.target.value)} />
          <FormField label={t('company')} name="company" value={company} onChange={e => setCompany(e.target.value)} />
          <FormField label={t('company_urdu')} name="companyUrdu" value={companyUrdu} onChange={e => setCompanyUrdu(e.target.value)} />
          <FormField label={t('category')} name="category" value={category} onChange={e => setCategory(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <FormField label={t('selling_price')} name="sellingPrice" type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} required />
            <FormField label={t('purchase_price')} name="purchasePrice" type="number" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} />
          </div>
          <FormField label={t('quantity')} name="quantity" type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
          <FormField label={t('description')} name="description" value={description} onChange={e => setDescription(e.target.value)} />
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

export default ProductCreate;
