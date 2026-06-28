import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useCustomerStore } from '../../store/useCustomerStore';
import FormField from '../../components/forms/FormField';
import PhoneField from '../../components/forms/PhoneField';
import CNICField from '../../components/forms/CNICField';
import SelectField from '../../components/forms/SelectField';
import { validatePhone } from '../../components/forms/PhoneField';
import { validateCNIC } from '../../components/forms/CNICField';

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  initialData?: any; // âœ… NEW: Edit mode support
}

const GuarantorCreate: React.FC<Props> = ({ onClose, onSuccess, initialData }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  const { customers, fetchCustomers } = useCustomerStore();
  
  // âœ… State
  const [name, setName] = useState(initialData?.name || '');
  const [nameUrdu, setNameUrdu] = useState(initialData?.nameUrdu || '');
  const [fatherName, setFatherName] = useState(initialData?.fatherName || initialData?.father_name || '');
  const [fatherNameUrdu, setFatherNameUrdu] = useState(initialData?.fatherNameUrdu || initialData?.father_name_urdu || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [officePhone, setOfficePhone] = useState(initialData?.officePhone || '');
  const [cnic, setCnic] = useState(initialData?.cnic || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [officeAddress, setOfficeAddress] = useState(initialData?.officeAddress || '');
  const [occupation, setOccupation] = useState(initialData?.occupation || '');
  const [relation, setRelation] = useState(initialData?.relation || initialData?.relationToCustomer || '');
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [verificationStatus, setVerificationStatus] = useState(initialData?.verificationStatus || 'pending');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isEditMode] = useState(!!initialData?.id);

  // âœ… Fetch customers if not loaded
  useEffect(() => {
    if (customers.length === 0) {
      fetchCustomers();
    }
  }, [customers.length, fetchCustomers]);

  // âœ… Customer options
  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${isUrdu ? (c.nameUrdu || c.name) : c.name} (${c.phone})`,
  }));

  // âœ… Verification status options
  const verificationOptions = [
    { value: 'pending', label: isUrdu ? 'Ø²ÛŒØ± Ø§Ù„ØªÙˆØ§Ø¡' : 'Pending' },
    { value: 'verified', label: isUrdu ? 'ØªØµØ¯ÛŒÙ‚ Ø´Ø¯Û' : 'Verified' },
    { value: 'rejected', label: isUrdu ? 'Ù…Ø³ØªØ±Ø¯' : 'Rejected' },
  ];

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
    if (!customerId) {
      setError(isUrdu ? 'Ú¯Ø§ÛÚ© Ù…Ù†ØªØ®Ø¨ Ú©Ø±ÛŒÚº' : 'Please select a customer');
      return false;
    }
    if (!relation) {
      setError(isUrdu ? 'Ø±Ø´ØªÛ Ø¶Ø±ÙˆØ±ÛŒ ÛÛ’' : 'Relation is required');
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
  }, [name, nameUrdu, phone, customerId, relation, cnic, t, isUrdu]);

  // âœ… Auto-fill helper
  const autoFillFromName = () => {
    if (name && !nameUrdu) {
      setNameUrdu(name);
    }
    if (nameUrdu && !name) {
      setName(nameUrdu);
    }
  };

  // âœ… Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    const rawPhone = phone.replace(/\D/g, '');
    const rawOfficePhone = officePhone.replace(/\D/g, '');
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
      officePhone: rawOfficePhone,
      cnic: rawCnic,
      
      // Address
      address: address || '',
      officeAddress: officeAddress || '',
      
      // Other fields
      occupation: occupation || '',
      relation: relation || '',
      customerId: customerId || '',
      verificationStatus: verificationStatus || 'pending',
    };

    try {
      if (isEditMode) {
        // âœ… Edit mode - update guarantor
        await api.put(`/guarantors/${initialData.id}`, payload);
        toast.success(isUrdu ? 'Ø¶Ø§Ù…Ù† Ø§Ù¾ ÚˆÛŒÙ¹ ÛÙˆ Ú¯ÛŒØ§' : 'Guarantor updated successfully');
      } else {
        // âœ… Create mode
        await api.post('/guarantors', payload);
        toast.success(isUrdu ? 'Ø¶Ø§Ù…Ù† Ø¨Ù† Ú¯ÛŒØ§' : 'Guarantor created successfully');
      }
      
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'Ø¶Ø§Ù…Ù† Ø¨Ù†Ø§Ù†Û’ Ù…ÛŒÚº Ù†Ø§Ú©Ø§Ù…ÛŒ' : t('error_creating_guarantor'));
      setError(errorMsg);
    } finally {
      setLoading(false);
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
            {isEditMode ? (isUrdu ? 'Ø¶Ø§Ù…Ù† Ù…ÛŒÚº ØªØ±Ù…ÛŒÙ…' : 'Edit Guarantor') : (isUrdu ? 'Ù†ÛŒØ§ Ø¶Ø§Ù…Ù†' : t('add_guarantor'))}
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
            <PhoneField
              label={isUrdu ? 'Ø¯ÙØªØ± ÙÙˆÙ† Ù†Ù…Ø¨Ø±' : 'Office Phone'}
              name="officePhone"
              value={officePhone}
              onChange={e => setOfficePhone(e.target.value)}
              placeholder="0313-XXXXXXX"
            />
          </div>

          {/* CNIC & Occupation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CNICField
              label={isUrdu ? 'Ø´Ù†Ø§Ø®ØªÛŒ Ú©Ø§Ø±Úˆ' : 'CNIC'}
              name="cnic"
              value={cnic}
              onChange={e => setCnic(e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
            />
            <FormField
              label={isUrdu ? 'Ù¾ÛŒØ´Û' : 'Occupation'}
              name="occupation"
              value={occupation}
              onChange={e => setOccupation(e.target.value)}
              placeholder={isUrdu ? 'Ù…Ø«Ø§Ù„: owner' : 'e.g., owner'}
            />
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'Ø±ÛØ§Ø¦Ø´ÛŒ Ù¾ØªÛ' : 'Residential Address'}
              name="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'Ø¯ÙØªØ± Ú©Ø§ Ù¾ØªÛ' : 'Office Address'}
              name="officeAddress"
              value={officeAddress}
              onChange={e => setOfficeAddress(e.target.value)}
            />
          </div>

          {/* Relation & Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'Ø±Ø´ØªÛ' : 'Relation'}
              name="relation"
              value={relation}
              onChange={e => setRelation(e.target.value)}
              placeholder={isUrdu ? 'Ù…Ø«Ø§Ù„: Ø¨Ú¾Ø§Ø¦ÛŒ' : 'e.g., Brother'}
              required
            />
            <SelectField
              label={isUrdu ? 'Ú¯Ø§ÛÚ©' : 'Customer'}
              name="customerId"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              options={customerOptions}
              placeholder={isUrdu ? 'Ú¯Ø§ÛÚ© Ù…Ù†ØªØ®Ø¨ Ú©Ø±ÛŒÚº' : 'Select customer'}
              required
            />
          </div>

          {/* âœ… Verification Status (Edit mode only) */}
          {isEditMode && (
            <SelectField
              label={isUrdu ? 'ØªØµØ¯ÛŒÙ‚ Ú©ÛŒ Ø­ÛŒØ«ÛŒØª' : 'Verification Status'}
              name="verificationStatus"
              value={verificationStatus}
              onChange={e => setVerificationStatus(e.target.value)}
              options={verificationOptions}
            />
          )}

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

export default GuarantorCreate;
