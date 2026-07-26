import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSupplierStore, Supplier } from '../../store/useSupplierStore';
import FormField from '../../components/forms/FormField';
import { APP_CONFIG } from '../../config/app';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: Supplier;
}

const SupplierCreate: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const isEditMode = !!initialData?.id;

  const [name, setName] = useState(initialData?.name || '');
  const [nameUrdu, setNameUrdu] = useState(initialData?.nameUrdu || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [officePhone, setOfficePhone] = useState(initialData?.officePhone || '');
  const [cnic, setCnic] = useState(initialData?.cnic || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [company, setCompany] = useState(initialData?.company || '');
  const [remarks, setRemarks] = useState(initialData?.remarks || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const createSupplier = useSupplierStore(s => s.createSupplier);
  const updateSupplier = useSupplierStore(s => s.updateSupplier);

  useEffect(() => {
    document.title = `${isEditMode ? (isUrdu ? 'سپلائر میں ترمیم' : 'Edit Supplier') : (isUrdu ? 'نیا سپلائر' : 'New Supplier')} | ${APP_CONFIG.companyName}`;
  }, [isEditMode, isUrdu]);

  const validateForm = useCallback(() => {
    if (!name && !nameUrdu) {
      setError(isUrdu ? 'نام ضروری ہے' : 'Name is required');
      return false;
    }
    if (!phone) {
      setError(isUrdu ? 'فون نمبر ضروری ہے' : 'Phone is required');
      return false;
    }
    return true;
  }, [name, nameUrdu, phone, isUrdu]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setLoading(true);
    setError('');

    try {
      if (isEditMode && initialData?.id) {
        await updateSupplier(initialData.id, { name, nameUrdu, phone, officePhone, cnic, address, company, remarks });
        toast.success(isUrdu ? 'سپلائر اپ ڈیٹ ہو گیا' : 'Supplier updated');
      } else {
        await createSupplier({ name, nameUrdu, phone, officePhone, cnic, address, company, remarks });
        toast.success(isUrdu ? 'سپلائر بن گیا' : 'Supplier created');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.error || (isUrdu ? 'ناکام' : 'Failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isEditMode ? (isUrdu ? 'سپلائر میں ترمیم' : 'Edit Supplier') : (isUrdu ? 'نیا سپلائر' : 'Add Supplier')}
          </h2>
          <button onClick={onClose} className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 text-xl">&times;</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={isUrdu ? 'نام (انگریزی)' : 'Name (English)'} name="name" value={name} onChange={e => setName(e.target.value)} required />
            <FormField label={isUrdu ? 'نام (اردو)' : 'Name (Urdu)'} name="nameUrdu" value={nameUrdu} onChange={e => setNameUrdu(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={isUrdu ? 'فون نمبر' : 'Phone'} name="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
            <FormField label={isUrdu ? 'دفتر فون' : 'Office Phone'} name="officePhone" value={officePhone} onChange={e => setOfficePhone(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="CNIC" name="cnic" value={cnic} onChange={e => setCnic(e.target.value)} />
            <FormField label={isUrdu ? 'کمپنی' : 'Company'} name="company" value={company} onChange={e => setCompany(e.target.value)} />
          </div>
          <FormField label={isUrdu ? 'پتہ' : 'Address'} name="address" value={address} onChange={e => setAddress(e.target.value)} />
          <FormField label={isUrdu ? 'نوٹس' : 'Remarks'} name="remarks" value={remarks} onChange={e => setRemarks(e.target.value)} />

          {error && <div className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">{error}</div>}

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm">{isUrdu ? 'منسوخ' : 'Cancel'}</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50">
              {loading ? '...' : isEditMode ? (isUrdu ? 'اپ ڈیٹ' : 'Update') : (isUrdu ? 'محفوظ' : 'Save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SupplierCreate;