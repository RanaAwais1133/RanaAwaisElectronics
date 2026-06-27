import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api, { createCustomer } from '../../utils/api';
import { useCustomerStore } from '../../store/useCustomerStore';
import FormField from '../../components/forms/FormField';
import PhoneField from '../../components/forms/PhoneField';
import CNICField from '../../components/forms/CNICField';
import { validatePhone } from '../../components/forms/PhoneField';
import { validateCNIC } from '../../components/forms/CNICField';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any; // ✅ NEW: Edit mode support
}

const CustomerCreateModal: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  // ✅ State
  const [name, setName] = useState(initialData?.name || '');
  const [nameUrdu, setNameUrdu] = useState(initialData?.nameUrdu || '');
  const [fatherName, setFatherName] = useState(initialData?.fatherName || initialData?.father_name || '');
  const [fatherNameUrdu, setFatherNameUrdu] = useState(initialData?.fatherNameUrdu || initialData?.father_name_urdu || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [cnic, setCnic] = useState(initialData?.cnic || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [addressUrdu, setAddressUrdu] = useState(initialData?.addressUrdu || initialData?.address_urdu || '');
  
  // ✅ NEW: Additional fields for receipt
  const [residential, setResidential] = useState(initialData?.residential || 'Personal');
  const [occupant, setOccupant] = useState(initialData?.occupant || 'Own');
  const [residentialAddress, setResidentialAddress] = useState(initialData?.residentialAddress || '');
  const [officeAddress, setOfficeAddress] = useState(initialData?.officeAddress || '');
  const [accountNo, setAccountNo] = useState(initialData?.accountNo || '');
  const [costNo, setCostNo] = useState(initialData?.costNo || '');
  const [processNo, setProcessNo] = useState(initialData?.processNo || '');
  const [reprAsCost, setReprAsCost] = useState(initialData?.reprAsCost || '1: (0 - C: 0)');
  const [reprAsGar, setReprAsGar] = useState(initialData?.reprAsGar || '1: (0 - C: 0)');
  const [prepAC, setPrepAC] = useState(initialData?.prepAC || 'N/A');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(!!initialData?.id);
  
  const fetchCustomers = useCustomerStore(s => s.fetchCustomers);
  const formRef = useRef<HTMLFormElement>(null);

  // ✅ Validation
  const validateForm = useCallback(() => {
    if (!name && !nameUrdu) {
      setError(isUrdu ? 'نام ضروری ہے' : t('name_required'));
      return false;
    }
    if (!phone) {
      setError(isUrdu ? 'فون نمبر ضروری ہے' : t('phone_required'));
      return false;
    }
    const rawPhone = phone.replace(/\D/g, '');
    if (!validatePhone(rawPhone)) {
      setError(isUrdu ? 'فون نمبر غلط ہے (مثال: 0313-1234567)' : 'Invalid phone number (e.g., 0313-1234567)');
      return false;
    }
    if (cnic) {
      const rawCnic = cnic.replace(/-/g, '');
      if (!validateCNIC(rawCnic)) {
        setError(isUrdu ? 'شناختی کارڈ غلط ہے (13 ہندسے)' : 'Invalid CNIC (13 digits)');
        return false;
      }
    }
    return true;
  }, [name, nameUrdu, phone, cnic, t, isUrdu]);

  // ✅ Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    const rawPhone = phone.replace(/\D/g, '');
    const rawCnic = cnic.replace(/-/g, '');

    const payload = {
      // If edit mode, include ID
      ...(isEditMode && { id: initialData.id }),
      
      // Name fields
      name: name || nameUrdu,
      nameUrdu: nameUrdu || name,
      fatherName: fatherName || fatherNameUrdu,
      fatherNameUrdu: fatherNameUrdu || fatherName,
      
      // Contact
      phone: rawPhone,
      cnic: rawCnic,
      
      // Address
      address: address || addressUrdu,
      addressUrdu: addressUrdu || address,
      
      // ✅ NEW: Additional fields
      residential: residential || 'Personal',
      occupant: occupant || 'Own',
      residentialAddress: residentialAddress || address || addressUrdu,
      officeAddress: officeAddress || '',
      accountNo: accountNo || '',
      costNo: costNo || '',
      processNo: processNo || '',
      reprAsCost: reprAsCost || '1: (0 - C: 0)',
      reprAsGar: reprAsGar || '1: (0 - C: 0)',
      prepAC: prepAC || 'N/A',
    };

    try {
      if (isEditMode) {
        // ✅ Edit mode - update customer
        const response = await api.put(`/customers/${initialData.id}`, payload);
        toast.success(isUrdu ? 'گاہک اپ ڈیٹ ہو گیا' : 'Customer updated successfully');
      } else {
        // ✅ Create mode
        const response = await createCustomer(payload);
        toast.success(isUrdu ? 'گاہک بن گیا' : 'Customer created successfully');
      }
      
      await fetchCustomers();
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'گاہک بنانے میں ناکامی' : t('error_creating_customer'));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Helper to auto-fill fields
  const autoFillFromName = () => {
    if (name && !nameUrdu) {
      setNameUrdu(name);
    }
    if (nameUrdu && !name) {
      setName(nameUrdu);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-2"
        onClick={e => e.stopPropagation()}
      >
        {/* ✅ Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isEditMode ? (isUrdu ? 'گاہک میں ترمیم' : 'Edit Customer') : (isUrdu ? 'نیا گاہک' : t('add_customer'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
          >
            &times;
          </button>
        </div>

        {/* ✅ Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'نام (انگریزی)' : 'Name (English)'}
              name="name"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={autoFillFromName}
              required
            />
            <FormField
              label={isUrdu ? 'نام (اردو)' : 'Name (Urdu)'}
              name="nameUrdu"
              value={nameUrdu}
              onChange={e => setNameUrdu(e.target.value)}
              onBlur={autoFillFromName}
              required
            />
          </div>

          {/* Father Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'والد کا نام (انگریزی)' : 'Father Name (English)'}
              name="fatherName"
              value={fatherName}
              onChange={e => setFatherName(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'والد کا نام (اردو)' : 'Father Name (Urdu)'}
              name="fatherNameUrdu"
              value={fatherNameUrdu}
              onChange={e => setFatherNameUrdu(e.target.value)}
            />
          </div>

          {/* Phone & CNIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneField
              label={isUrdu ? 'فون نمبر' : 'Phone Number'}
              name="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <CNICField
              label={isUrdu ? 'شناختی کارڈ' : 'CNIC'}
              name="cnic"
              value={cnic}
              onChange={e => setCnic(e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
            />
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'پتہ (انگریزی)' : 'Address (English)'}
              name="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'پتہ (اردو)' : 'Address (Urdu)'}
              name="addressUrdu"
              value={addressUrdu}
              onChange={e => setAddressUrdu(e.target.value)}
            />
          </div>

          {/* ✅ NEW: Additional Fields (Optional - for receipt) */}
          <details className="text-sm text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
              {isUrdu ? 'اضافی معلومات' : 'Additional Info'}
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
                isEditMode ? (isUrdu ? 'اپ ڈیٹ کریں' : 'Update') : (isUrdu ? 'محفوظ کریں' : t('save'))
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerCreateModal;