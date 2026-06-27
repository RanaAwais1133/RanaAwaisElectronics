import React, { useState, useEffect, useCallback } from 'react';
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

// ✅ Format phone for display
const formatPhoneForDisplay = (phone: string): string => {
  const digits = (phone || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 4) return digits;
  return digits.slice(0, 4) + '-' + digits.slice(4);
};

// ✅ Format CNIC for display
const formatCNICForDisplay = (cnic: string): string => {
  const digits = (cnic || '').replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 5) return digits;
  if (digits.length <= 12) return digits.slice(0, 5) + '-' + digits.slice(5);
  return digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12);
};

interface Props {
  guarantorId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const GuarantorEditModal: React.FC<Props> = ({ guarantorId, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  const { customers, fetchCustomers } = useCustomerStore();
  
  // ✅ State
  const [name, setName] = useState('');
  const [nameUrdu, setNameUrdu] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [fatherNameUrdu, setFatherNameUrdu] = useState('');
  const [phone, setPhone] = useState('');
  const [officePhone, setOfficePhone] = useState('');
  const [cnic, setCnic] = useState('');
  const [address, setAddress] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [occupation, setOccupation] = useState('');
  const [relation, setRelation] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('pending');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // ✅ Verification status options
  const verificationOptions = [
    { value: 'pending', label: isUrdu ? 'زیر التواء' : 'Pending' },
    { value: 'verified', label: isUrdu ? 'تصدیق شدہ' : 'Verified' },
    { value: 'rejected', label: isUrdu ? 'مسترد' : 'Rejected' },
  ];

  // ✅ Fetch data
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
        setOfficePhone(g.officePhone || '');
        setCnic(g.cnic ? formatCNICForDisplay(g.cnic) : '');
        setAddress(g.address || '');
        setOfficeAddress(g.officeAddress || '');
        setOccupation(g.occupation || '');
        setRelation(g.relation || g.relationToCustomer || '');
        setCustomerId(g.customerId || '');
        setVerificationStatus(g.verificationStatus || 'pending');
        setError('');
      })
      .catch(() => {
        setError(isUrdu ? 'ضامن نہیں ملا' : t('guarantor_not_found'));
      })
      .finally(() => setFetching(false));
  }, [guarantorId, t, isUrdu, fetchCustomers]);

  // ✅ Customer options
  const customerOptions = customers.map(c => ({
    value: c.id,
    label: `${isUrdu ? (c.nameUrdu || c.name) : c.name} (${c.phone})`,
  }));

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
    if (!customerId) {
      setError(isUrdu ? 'گاہک منتخب کریں' : 'Please select a customer');
      return false;
    }
    if (!relation) {
      setError(isUrdu ? 'رشتہ ضروری ہے' : 'Relation is required');
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
  }, [name, nameUrdu, phone, customerId, relation, cnic, t, isUrdu]);

  // ✅ Auto-fill helper
  const autoFillFromName = () => {
    if (name && !nameUrdu) {
      setNameUrdu(name);
    }
    if (nameUrdu && !name) {
      setName(nameUrdu);
    }
  };

  // ✅ Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    const rawPhone = phone.replace(/\D/g, '');
    const rawOfficePhone = officePhone.replace(/\D/g, '');
    const rawCnic = cnic.replace(/-/g, '');

    try {
      await api.put(`/guarantors/${guarantorId}`, {
        name: name || nameUrdu,
        nameUrdu: nameUrdu || name,
        fatherName: fatherName || fatherNameUrdu,
        fatherNameUrdu: fatherNameUrdu || fatherName,
        phone: rawPhone,
        officePhone: rawOfficePhone,
        cnic: rawCnic,
        address: address || '',
        officeAddress: officeAddress || '',
        occupation: occupation || '',
        relation: relation || '',
        customerId: customerId || '',
        verificationStatus: verificationStatus || 'pending',
      });
      
      toast.success(isUrdu ? 'ضامن اپ ڈیٹ ہو گیا' : t('guarantor_updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'ضامن اپ ڈیٹ کرنے میں ناکامی' : t('error_updating_guarantor'));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

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
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[95vh] overflow-y-auto mx-2"
        onClick={e => e.stopPropagation()}
      >
        {/* ✅ Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isUrdu ? 'ضامن میں ترمیم' : t('edit_guarantor')}
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

          {/* Phone & Office Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <PhoneField
              label={isUrdu ? 'فون نمبر' : 'Phone Number'}
              name="phone"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              required
            />
            <PhoneField
              label={isUrdu ? 'دفتر فون نمبر' : 'Office Phone'}
              name="officePhone"
              value={officePhone}
              onChange={e => setOfficePhone(e.target.value)}
              placeholder="0313-XXXXXXX"
            />
          </div>

          {/* CNIC & Occupation */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <CNICField
              label={isUrdu ? 'شناختی کارڈ' : 'CNIC'}
              name="cnic"
              value={cnic}
              onChange={e => setCnic(e.target.value)}
              placeholder="XXXXX-XXXXXXX-X"
            />
            <FormField
              label={isUrdu ? 'پیشہ' : 'Occupation'}
              name="occupation"
              value={occupation}
              onChange={e => setOccupation(e.target.value)}
              placeholder={isUrdu ? 'مثال: owner' : 'e.g., owner'}
            />
          </div>

          {/* Address Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'رہائشی پتہ' : 'Residential Address'}
              name="address"
              value={address}
              onChange={e => setAddress(e.target.value)}
            />
            <FormField
              label={isUrdu ? 'دفتر کا پتہ' : 'Office Address'}
              name="officeAddress"
              value={officeAddress}
              onChange={e => setOfficeAddress(e.target.value)}
            />
          </div>

          {/* Relation & Customer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label={isUrdu ? 'رشتہ' : 'Relation'}
              name="relation"
              value={relation}
              onChange={e => setRelation(e.target.value)}
              placeholder={isUrdu ? 'مثال: بھائی' : 'e.g., Brother'}
              required
            />
            <SelectField
              label={isUrdu ? 'گاہک' : 'Customer'}
              name="customerId"
              value={customerId}
              onChange={e => setCustomerId(e.target.value)}
              options={customerOptions}
              placeholder={isUrdu ? 'گاہک منتخب کریں' : 'Select customer'}
              required
            />
          </div>

          {/* ✅ Verification Status */}
          <SelectField
            label={isUrdu ? 'تصدیق کی حیثیت' : 'Verification Status'}
            name="verificationStatus"
            value={verificationStatus}
            onChange={e => setVerificationStatus(e.target.value)}
            options={verificationOptions}
          />

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

export default GuarantorEditModal;