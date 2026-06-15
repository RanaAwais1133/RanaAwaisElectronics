import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import FormField from '../../components/forms/FormField';
import PhoneField from '../../components/forms/PhoneField';
import CNICField from '../../components/forms/CNICField';

const formatPhoneForDisplay = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return digits.slice(0, 4) + '-' + digits.slice(4);
};

interface Props { customerId: string; onClose: () => void; onSuccess: () => void; }

const CustomerEditModal: React.FC<Props> = ({ customerId, onClose, onSuccess }) => {
  const { t } = useTranslation();

  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherNameUrdu, setFatherNameUrdu] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [addressUrdu, setAddressUrdu] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {

    api.get(`/customers/${customerId}`)
      .then(res => {
        const c = res.data;
        setName(c.name || '');
        setNameUrdu(c.nameUrdu || '');
        setFatherName(c.fatherName || c.father_name || '');
        setFatherNameUrdu(c.fatherNameUrdu || c.father_name_urdu || '');
        setPhone(formatPhoneForDisplay(c.phone || ''));
        setCnic(c.cnic || '');
        setAddress(c.address || '');
        setAddressUrdu(c.addressUrdu || '');
        setError('');
      })
      .catch(() => setError(t('customer_not_found')))
      .finally(() => setFetching(false));
  }, [customerId, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !nameUrdu) { setError(t('name_required')); return; }
    if (!phone) { setError(t('phone_required')); return; }
    setLoading(true);
    setError('');
    const rawPhone = phone.replace(/\D/g, '');
    try {
      await api.put(`/customers/${customerId}`, {
        name: name || nameUrdu,
        nameUrdu: nameUrdu || name,
        fatherName: fatherName || fatherNameUrdu,
        fatherNameUrdu: fatherNameUrdu || fatherName,
        phone: rawPhone,
        cnic,
        address: address || addressUrdu,
        addressUrdu: addressUrdu || address,
      });
      toast.success(t('customer_updated'));
      onSuccess(); onClose();
    } catch (err: any) { setError(err.response?.data?.error || t('error_updating_customer')); }
    finally { setLoading(false); }
  };

  if (fetching) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl">{t('loading')}</div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('edit_customer')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Always show both English and Urdu fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={t('name')} name="name" value={name} onChange={e => setName(e.target.value)} />
            <FormField label={t('name_urdu')} name="nameUrdu" value={nameUrdu} onChange={e => setNameUrdu(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={t('father_name') || 'Father Name'} name="fatherName" value={fatherName} onChange={e => setFatherName(e.target.value)} />
            <FormField label={t('father_name_urdu') || 'Father Name (Urdu)'} name="fatherNameUrdu" value={fatherNameUrdu} onChange={e => setFatherNameUrdu(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label={t('address')} name="address" value={address} onChange={e => setAddress(e.target.value)} />
            <FormField label={t('address_urdu')} name="addressUrdu" value={addressUrdu} onChange={e => setAddressUrdu(e.target.value)} />
          </div>
          <PhoneField label={t('phone')} name="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
          <CNICField label={t('cnic')} name="cnic" value={cnic} onChange={e => setCnic(e.target.value)} />
          {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium transition-all">{t('cancel')}</button>
            <button type="submit" disabled={loading} className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50">{loading ? t('saving') : t('save')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerEditModal;
