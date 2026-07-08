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
import { offlineCreateCustomer } from '../../db/offlineActions';

interface Props {
  onClose: () => void;
  onSuccess?: () => void;
  initialData?: any; // âœ… NEW: Edit mode support
}

const CustomerCreateModal: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  // âœ… State
  const [name, setName] = useState(initialData?.name || '');
  const [nameUrdu, setNameUrdu] = useState(initialData?.nameUrdu || '');
  const [fatherName, setFatherName] = useState(initialData?.fatherName || initialData?.father_name || '');
  const [fatherNameUrdu, setFatherNameUrdu] = useState(initialData?.fatherNameUrdu || initialData?.father_name_urdu || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [cnic, setCnic] = useState(initialData?.cnic || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [addressUrdu, setAddressUrdu] = useState(initialData?.addressUrdu || initialData?.address_urdu || '');
  
  // âœ… NEW: Additional fields for receipt
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
  const [isEditMode] = useState(!!initialData?.id);
  
  const fetchCustomers = useCustomerStore(s => s.fetchCustomers);
  const addCustomer = useCustomerStore(s => s.addCustomer);
  const formRef = useRef<HTMLFormElement>(null);

  // âœ… Validation
  const validateForm = useCallback(() => {
    if (!name && !nameUrdu) {
      setError(isUrdu ? 'Ù†Ø§Ù… Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’' : t('name_required'));
      return false;
    }
    if (!phone) {
      setError(isUrdu ? 'ÙÙˆÙ† Ù†Ù…Ø¨Ø± Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’' : t('phone_required'));
      return false;
    }
    const rawPhone = phone.replace(/\D/g, '');
    if (!validatePhone(rawPhone)) {
      setError(isUrdu ? 'ÙÙˆÙ† Ù†Ù…Ø¨Ø± ØºÙ„Ø· ÛÛ’ (Ù…Ø«Ø§Ù„: 0313-1234567)' : 'Invalid phone number (e.g., 0313-1234567)');
      return false;
    }
    if (cnic) {
      const rawCnic = cnic.replace(/-/g, '');
      if (!validateCNIC(rawCnic)) {
        setError(isUrdu ? 'Ø´Ù†Ø§Ø®ØªÛŒ Ú©Ø§Ø±Úˆ ØºÙ„Ø· ÛÛ’ (13 ÛÙ†Ø¯Ø³Û’)' : 'Invalid CNIC (13 digits)');
        return false;
      }
    }
    return true;
  }, [name, nameUrdu, phone, cnic, t, isUrdu]);

  // âœ… Submit handler
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
      
      // âœ… NEW: Additional fields
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
        // âœ… Edit mode - update customer
        try {
          await api.put(`/customers/${initialData.id}`, payload);
          toast.success(isUrdu ? 'Ú¯Ø§ÛÚ© Ø§Ù¾ ÚˆÛŒÙ¹ ÛÙˆ Ú¯ÛŒØ§' : 'Customer updated successfully');
        } catch {
          // OFFLINE FALLBACK
          console.log('📦 Offline: Caching customer update locally');
          await offlineCreateCustomer({ ...payload, id: initialData.id });
          addCustomer({ ...payload, id: initialData.id } as any);
          toast.success(isUrdu ? 'Ú¯Ø§ÛÚ© Ø¢Ù Ù„Ø§Ø¦Ù† Ø§Ù¾ ÚˆÛŒÙ¹ ÛÙˆ Ú¯ÛŒØ§' : 'Customer updated offline');
        }
      } else {
        // âœ… Create mode
        try {
          await createCustomer(payload);
          toast.success(isUrdu ? 'Ú¯Ø§ÛÚ© Ø¨Ù† Ú¯ÛŒØ§' : 'Customer created successfully');
        } catch {
          // OFFLINE FALLBACK: Create locally and queue for sync
          console.log('📦 Offline: Caching customer locally');
          const tempId = 'offline_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
          const offlineCustomer = { ...payload, id: tempId };
          await offlineCreateCustomer(offlineCustomer);
          addCustomer(offlineCustomer as any);
          toast.success(isUrdu ? 'Ú¯Ø§ÛÚ© Ø¢Ù Ù„Ø§Ø¦Ù† Ø¨Ù† Ú¯ÛŒØ§' : 'Customer created offline');
        }
      }
      
      await fetchCustomers(true);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'Ú¯Ø§ÛÚ© Ø¨Ù†Ø§Ù†Û’ Ù…ÛŒÚº Ù†Ø§Ú©Ø§Ù…ÛŒ' : t('error_creating_customer'));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // âœ… Helper to auto-fill fields
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
        {/* âœ… Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isEditMode ? (isUrdu ? 'Ú¯Ø§ÛÚ© Ù…ÛŒÚº ØªØ±Ù…ÛŒÙ…' : 'Edit Customer') : (isUrdu ? 'Ù†ÛŒØ§ Ú¯Ø§ÛÚ©' : t('add_customer'))}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
          >
            &times;
          </button>
        </div>

        {/* âœ… Form */}
        <form ref={formRef} onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'Ù†Ø§Ù… (Ø§Ù†Ú¯Ø±ÛŒØ²ÛŒ)' : 'Name (English)'}
              name="name"
              value={name}
              onChange={e => setName(e.target.value)}
              onBlur={autoFillFromName}
              required
            />
            <FormField
              label={isUrdu ? 'Ù†Ø§Ù… (Ø§Ø±Ø¯Ùˆ)' : 'Name (Urdu)'}
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
              label={isUrdu ? 'ÙˆØ§Ù„Ø¯ Ú©Ø§ Ù†Ø§Ù… (Ø§Ù†Ú¯Ø±ÛŒØ²ÛŒ)' : 'Father Name (English)'}
              name="fatherName"
              value={fatherName}
              onChange={e => setFatherName(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'ÙˆØ§Ù„Ø¯ Ú©Ø§ Ù†Ø§Ù… (Ø§Ø±Ø¯Ùˆ)' : 'Father Name (Urdu)'}
              name="fatherNameUrdu"
              value={fatherNameUrdu}
              onChange={e => setFatherNameUrdu(e.target.value)}
            />
          </div>

          {/* Phone & CNIC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneField
              label={isUrdu ? 'ÙÙˆÙ† Ù†Ù…Ø¨Ø±' : 'Phone Number'}
              name="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <CNICField
              label={isUrdu ? 'Ø´Ù†Ø§Ø®ØªÛŒ Ú©Ø§Ø±Úˆ' : 'CNIC'}
              name="cnic"
              value={cnic}
              onChange={e => setCnic(e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
            />
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'Ù¾ØªÛ (Ø§Ù†Ú¯Ø±ÛŒØ²ÛŒ)' : 'Address (English)'}
              name="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'Ù¾ØªÛ (Ø§Ø±Ø¯Ùˆ)' : 'Address (Urdu)'}
              name="addressUrdu"
              value={addressUrdu}
              onChange={e => setAddressUrdu(e.target.value)}
            />
          </div>

          {/* âœ… NEW: Additional Fields (Optional - for receipt) */}
          <details className="text-sm text-gray-500 dark:text-gray-400">
            <summary className="cursor-pointer hover:text-gray-700 dark:hover:text-gray-200">
              {isUrdu ? 'Ø§Ø¶Ø§ÙÛŒ Ù…Ø¹Ù„ÙˆÙ…Ø§Øª' : 'Additional Info'}
            </summary>
            <div className="mt-3 space-y-3 p-3 border border-gray-200 dark:border-gray-700 rounded-xl">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label={isUrdu ? 'Ø±ÛØ§Ø¦Ø´ÛŒ' : 'Residential'}
                  name="residential"
                  value={residential}
                  onChange={e => setResidential(e.target.value)}
                  placeholder="Personal"
                />
                <FormField
                  label={isUrdu ? 'Ù‚Ø§Ø¨Ø¶' : 'Occupant'}
                  name="occupant"
                  value={occupant}
                  onChange={e => setOccupant(e.target.value)}
                  placeholder="Own"
                />
              </div>
              <FormField
                label={isUrdu ? 'Ø±ÛØ§Ø¦Ø´ÛŒ Ù¾ØªÛ' : 'Residential Address'}
                name="residentialAddress"
                value={residentialAddress}
                onChange={e => setResidentialAddress(e.target.value)}
              />
              <FormField
                label={isUrdu ? 'Ø¯ÙØªØ± Ú©Ø§ Ù¾ØªÛ' : 'Office Address'}
                name="officeAddress"
                value={officeAddress}
                onChange={e => setOfficeAddress(e.target.value)}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <FormField
                  label={isUrdu ? 'Ø§Ú©Ø§Ø¤Ù†Ù¹ Ù†Ù…Ø¨Ø±' : 'Account No.'}
                  name="accountNo"
                  value={accountNo}
                  onChange={e => setAccountNo(e.target.value)}
                />
                <FormField
                  label={isUrdu ? 'Ú©ÙˆØ³Ù¹ Ù†Ù…Ø¨Ø±' : 'Cost No.'}
                  name="costNo"
                  value={costNo}
                  onChange={e => setCostNo(e.target.value)}
                />
                <FormField
                  label={isUrdu ? 'Ù¾Ø±ÙˆØ³Ø³ Ù†Ù…Ø¨Ø±' : 'Process No.'}
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

export default CustomerCreateModal;
