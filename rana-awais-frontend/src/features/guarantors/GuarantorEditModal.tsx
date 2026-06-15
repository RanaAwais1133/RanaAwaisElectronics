import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useCustomerStore } from '../../store/useCustomerStore';
import FormField from '../../components/forms/FormField';
import PhoneField from '../../components/forms/PhoneField';
import CNICField from '../../components/forms/CNICField';
import SelectField from '../../components/forms/SelectField';

const formatPhoneForDisplay = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return digits.slice(0, 4) + '-' + digits.slice(4);
};

interface Props {
  guarantorId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const GuarantorEditModal: React.FC<Props> = ({ guarantorId, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const { customers, fetchCustomers } = useCustomerStore();
  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherNameUrdu, setFatherNameUrdu] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [relation, setRelation] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    fetchCustomers();
    api.get(`/guarantors/${guarantorId}`)
      .then(res => {
        const g = res.data;
        setName(g.name || '');
        setNameUrdu(g.nameUrdu || '');
        setFatherName(g.fatherName || g.father_name || '');
        setFatherNameUrdu(g.fatherNameUrdu || g.father_name_urdu || '');
        setPhone(formatPhoneForDisplay(g.phone || ''));
        setCnic(g.cnic || '');
        setRelation(g.relation || '');
        setCustomerId(g.customerId || '');
        setError('');
      })
      .catch(() => setError(t('guarantor_not_found')))
      .finally(() => setFetching(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guarantorId, t]);

  const isUrdu = i18n.language === 'ur';
  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${isUrdu ? (c.nameUrdu || c.name) : c.name} (${c.phone})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!name && !nameUrdu) || !phone || !customerId || !relation) {
      setError(t('fill_required'));
      return;
    }
    setLoading(true);
    setError('');
    const rawPhone = phone.replace(/\D/g, '');
    try {
      await api.put(`/guarantors/${guarantorId}`, {
        name: name || nameUrdu,
        nameUrdu: nameUrdu || name,
        fatherName: fatherName || fatherNameUrdu,
        fatherNameUrdu: fatherNameUrdu || fatherName,
        phone: rawPhone,
        cnic,
        relation,
        customerId,
      });
      toast.success(t('guarantor_updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || t('error_updating_guarantor'));
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl">{t('loading')}</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('edit_guarantor')}</h2>
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
          <PhoneField label={t('phone')} name="phone" value={phone} onChange={e => setPhone(e.target.value)} required />
          <CNICField label={t('cnic')} name="cnic" value={cnic} onChange={e => setCnic(e.target.value)} />
          <FormField label={t('relation')} name="relation" value={relation} onChange={e => setRelation(e.target.value)} required />
          <SelectField
            label={t('customer')}
            name="customerId"
            value={customerId}
            onChange={e => setCustomerId(e.target.value)}
            options={customerOptions}
            placeholder={t('select_customer')}
            required
          />
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

export default GuarantorEditModal;
