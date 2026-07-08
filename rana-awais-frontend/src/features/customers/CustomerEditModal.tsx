import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import FormField from '../../components/forms/FormField';
import PhoneField from '../../components/forms/PhoneField';
import CNICField from '../../components/forms/CNICField';
import { offlineUpdateCustomer } from '../../db/offlineActions';
import { useCustomerStore } from '../../store/useCustomerStore';

const formatPhoneForDisplay = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return digits.slice(0, 4) + '-' + digits.slice(4);
};

interface Props { customerId: string; onClose: () => void; onSuccess: () => void; }

const CustomerEditModal: React.FC<Props> = ({ customerId, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherNameUrdu, setFatherNameUrdu] = useState('');
  const [phone, setPhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [addressUrdu, setAddressUrdu] = useState('');
  
  // ✅ NEW: Additional receipt fields
  const [residential, setResidential] = useState('');
  const [occupant, setOccupant] = useState('');
  const [residentialAddress, setResidentialAddress] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [costNo, setCostNo] = useState('');
  const [processNo, setProcessNo] = useState('');
  const [reprAsCost, setReprAsCost] = useState('');
  const [reprAsGar, setReprAsGar] = useState('');
  const [prepAC, setPrepAC] = useState('');
  
  // ✅ Remarks fields
  const [remarks, setRemarks] = useState('');
  const [completedRemarks, setCompletedRemarks] = useState('');

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
        
        // ✅ NEW: Populate additional fields
        setResidential(c.residential || '');
        setOccupant(c.occupant || '');
        setResidentialAddress(c.residentialAddress || '');
        setOfficeAddress(c.officeAddress || '');
        setAccountNo(c.accountNo || '');
        setCostNo(c.costNo || '');
        setProcessNo(c.processNo || '');
        setReprAsCost(c.reprAsCost || '');
        setReprAsGar(c.reprAsGar || '');
        setPrepAC(c.prepAC || '');
        
        // ✅ Populate remarks
        setRemarks(c.remarks || '');
        setCompletedRemarks(c.completedRemarks || '');
        
        setError('');
      })
      .catch(() => setError(t('customer_not_found')))
      .finally(() => setFetching(false));
  }, [customerId, t]);

  const updateCustomer = useCustomerStore((s) => s.updateCustomer);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !nameUrdu) { setError(t('name_required')); return; }
    if (!phone) { setError(t('phone_required')); return; }
    setLoading(true);
    setError('');
    const rawPhone = phone.replace(/\D/g, '');
    
    const payload = {
      name: name || nameUrdu,
      nameUrdu: nameUrdu || name,
      fatherName: fatherName || fatherNameUrdu,
      fatherNameUrdu: fatherNameUrdu || fatherName,
      phone: rawPhone,
      cnic,
      address: address || addressUrdu,
      addressUrdu: addressUrdu || address,
      // ✅ NEW: Send additional fields
      residential,
      occupant,
      residentialAddress: residentialAddress || address || addressUrdu,
      officeAddress,
      accountNo,
      costNo,
      processNo,
      reprAsCost,
      reprAsGar,
      prepAC,
      // ✅ Send remarks
      remarks,
      completedRemarks,
    };
    
    try {
      // ✅ Try online first
      await api.put(`/customers/${customerId}`, payload);
      toast.success(t('customer_updated'));
    } catch (err: any) {
      // ✅ OFFLINE FALLBACK: Update locally and queue for sync
      console.log('📦 Offline: Caching customer update locally');
      
      // Update IndexedDB cache
      await offlineUpdateCustomer(customerId, payload);
      
      // Update Zustand store (immediate UI update)
      updateCustomer(customerId, payload);
      
      toast.success(isUrdu ? 'گاہک آف لائن اپ ڈیٹ ہو گیا' : 'Customer updated offline');
    }
    finally { 
      setLoading(false);
      onSuccess(); 
      onClose(); 
    }
  };

  if (fetching) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-2xl">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('edit_customer')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all">&times;</button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Basic Fields */}
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

          {/* ✅ NEW: Additional Receipt Fields */}
          <details className="text-sm text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 font-medium">
              {isUrdu ? 'اضافی معلومات (رسید کے لیے)' : 'Additional Info (for Receipt)'}
            </summary>
            <div className="mt-3 space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label={isUrdu ? 'رہائشی' : 'Residential'}
                  name="residential"
                  value={residential}
                  onChange={e => setResidential(e.target.value)}
                  placeholder="Personal"
                />
                <FormField
                  label={isUrdu ? 'قابض' : 'Occupant'}
                  name="occupant"
                  value={occupant}
                  onChange={e => setOccupant(e.target.value)}
                  placeholder="Own"
                />
              </div>
              <FormField
                label={isUrdu ? 'رہائشی پتہ' : 'Residential Address'}
                name="residentialAddress"
                value={residentialAddress}
                onChange={e => setResidentialAddress(e.target.value)}
              />
              <FormField
                label={isUrdu ? 'دفتر کا پتہ' : 'Office Address'}
                name="officeAddress"
                value={officeAddress}
                onChange={e => setOfficeAddress(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  label={isUrdu ? 'اکاؤنٹ نمبر' : 'Account No.'}
                  name="accountNo"
                  value={accountNo}
                  onChange={e => setAccountNo(e.target.value)}
                />
                <FormField
                  label={isUrdu ? 'کوسٹ نمبر' : 'Cost No.'}
                  name="costNo"
                  value={costNo}
                  onChange={e => setCostNo(e.target.value)}
                />
                <FormField
                  label={isUrdu ? 'پروسس نمبر' : 'Process No.'}
                  name="processNo"
                  value={processNo}
                  onChange={e => setProcessNo(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  label="Repr. As Cost."
                  name="reprAsCost"
                  value={reprAsCost}
                  onChange={e => setReprAsCost(e.target.value)}
                />
                <FormField
                  label="Repr. As Gar."
                  name="reprAsGar"
                  value={reprAsGar}
                  onChange={e => setReprAsGar(e.target.value)}
                />
                <FormField
                  label="Prep. AC #"
                  name="prepAC"
                  value={prepAC}
                  onChange={e => setPrepAC(e.target.value)}
                />
              </div>
            </div>
          </details>

          {/* ✅ Remarks Section */}
          <details className="text-sm text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 font-medium">
              {isUrdu ? 'ریمارکس' : 'Remarks'}
            </summary>
            <div className="mt-3 space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {isUrdu ? 'ریمارکس' : 'Remarks'}
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                  placeholder={isUrdu ? 'گاہک کے بارے میں کوئی نوٹ...' : 'Any notes about the customer...'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {isUrdu ? 'مکمل ہونے کے ریمارکس' : 'Completed Remarks'}
                </label>
                <textarea
                  value={completedRemarks}
                  onChange={e => setCompletedRemarks(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none"
                  placeholder={isUrdu ? 'ادائیگی مکمل ہونے پر نوٹ...' : 'Notes when payment is completed...'}
                />
              </div>
            </div>
          </details>

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