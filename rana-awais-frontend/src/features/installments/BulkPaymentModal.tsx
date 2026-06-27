import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { bulkPayment } from '../../utils/api';
import PaymentReceipt from './PaymentReceipt';
import { useAuthStore } from '../../store/useAuthStore';
import { APP_CONFIG } from '../../config/app';

interface SelectedInstallment {
  installment_no: number;
  amount: number;
  fine?: number;
  totalPayable?: number;
}

interface Props {
  planId: string;
  selectedInstallments: SelectedInstallment[];
  onClose: () => void;
  onSuccess: () => void;
}

const BulkPaymentModal: React.FC<Props> = ({ planId, selectedInstallments, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);

  // ✅ State
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectedBy, setCollectedBy] = useState(currentUser?.displayName || currentUser?.username || '');
  const [collectedById, setCollectedById] = useState(currentUser?.id || '');
  const [remarks, setRemarks] = useState('');

  // ✅ Calculate totals
  const { total, totalFine, totalPayable } = useMemo(() => {
    let totalAmount = 0;
    let totalFineAmount = 0;
    let totalPayableAmount = 0;
    
    selectedInstallments.forEach(inst => {
      totalAmount += inst.amount || 0;
      totalFineAmount += inst.fine || 0;
      totalPayableAmount += inst.totalPayable || inst.amount || 0;
    });
    
    return {
      total: totalAmount,
      totalFine: totalFineAmount,
      totalPayable: totalPayableAmount,
    };
  }, [selectedInstallments]);

  // ✅ Payment methods
  const paymentMethods = [
    { value: 'cash', label: isUrdu ? 'نقد' : 'Cash' },
    { value: 'bank_transfer', label: isUrdu ? 'بینک ٹرانسفر' : 'Bank Transfer' },
    { value: 'jazzcash', label: 'JazzCash' },
    { value: 'easypaisa', label: 'Easypaisa' },
  ];

  // ✅ Handle bulk payment
  const handleBulkPay = useCallback(async () => {
    if (selectedInstallments.length === 0) {
      toast.error(isUrdu ? 'کوئی قسط منتخب نہیں' : 'No installments selected');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        plan_id: planId,
        method,
        payment_date: paymentDate,
        collected_by: collectedBy || currentUser?.displayName || currentUser?.username || '',
        collected_by_id: collectedById || currentUser?.id || '',
        remarks: remarks || '',
        payments: selectedInstallments.map(i => ({
          installment_no: i.installment_no,
          amount: i.totalPayable || i.amount || 0,
        })),
      };

      await bulkPayment(payload);

      toast.success(isUrdu ? 'بلک ادائیگی کامیاب' : t('bulk_payment_success'));
      onSuccess();
      setPaymentDone(true);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'ادائیگی ناکام' : t('payment_failed'));
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [
    selectedInstallments,
    planId,
    method,
    paymentDate,
    collectedBy,
    collectedById,
    remarks,
    currentUser,
    onSuccess,
    t,
    isUrdu,
  ]);

  // ✅ Success view
  if (paymentDone && showReceipt) {
    return <PaymentReceipt planId={planId} onClose={onClose} />;
  }

  if (paymentDone) {
    return (
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <div 
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
          onClick={e => e.stopPropagation()}
        >
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {isUrdu ? 'بلک ادائیگی کامیاب' : t('bulk_payment_success')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            {isUrdu ? 'کل رقم' : 'Total Amount'}: Rs. {totalPayable.toFixed(2)}
          </p>
          {totalFine > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">
              {isUrdu ? 'جرمانہ' : 'Fine'}: Rs. {totalFine.toFixed(2)}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-6">
            {isUrdu ? 'طریقہ' : 'Method'}: {paymentMethods.find(m => m.value === method)?.label || method}
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl text-sm font-semibold transition-all"
            >
              {isUrdu ? 'بند کریں' : (t('close') || 'Close')}
            </button>
            <button
              onClick={() => setShowReceipt(true)}
              className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {t('view_receipt')}
            </button>
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
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto mx-2"
        onClick={e => e.stopPropagation()}
      >
        {/* ✅ Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isUrdu ? 'بلک ادائیگی' : t('bulk_payment')}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl"
          >
            &times;
          </button>
        </div>

        {/* ✅ Content */}
        <div className="p-4 sm:p-6 space-y-4">
          {/* Selected Installments */}
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">
              {isUrdu ? 'منتخب اقساط' : t('selected_installments')} ({selectedInstallments.length})
            </h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {selectedInstallments.map(inst => (
                <div key={inst.installment_no} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                  <span>#{inst.installment_no}</span>
                  <div className="flex gap-3">
                    {inst.fine && inst.fine > 0 && (
                      <span className="text-amber-600 dark:text-amber-400">+{inst.fine.toFixed(2)}</span>
                    )}
                    <span className="font-medium">Rs. {(inst.totalPayable || inst.amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="mt-3 space-y-1 text-right border-t border-gray-200 dark:border-gray-700 pt-3">
              {totalFine > 0 && (
                <p className="text-sm text-amber-600 dark:text-amber-400">
                  {isUrdu ? 'جرمانہ' : 'Fine'}: Rs. {totalFine.toFixed(2)}
                </p>
              )}
              <p className="font-semibold text-gray-800 dark:text-white">
                {t('total')}: Rs. {totalPayable.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'ادائیگی کی تاریخ' : t('payment_date', 'Payment Date')}
            </label>
            <input
              type="date"
              value={paymentDate}
              onChange={e => setPaymentDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* Collected By */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'وصول کنندہ' : (t('collected_by') || 'Collected By')}
            </label>
            <input
              type="text"
              value={collectedBy}
              onChange={e => setCollectedBy(e.target.value)}
              placeholder={isUrdu ? 'مثال: حذیفہ' : 'e.g. Huzaifa'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'ریمارکس' : 'Remarks'}
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder={isUrdu ? 'مثال: بلک ادائیگی' : 'e.g. Bulk payment'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'ادائیگی کا طریقہ' : t('payment_method')}
            </label>
            <select
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
              value={method}
              onChange={e => setMethod(e.target.value)}
            >
              {paymentMethods.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

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
              onClick={handleBulkPay}
              disabled={loading || selectedInstallments.length === 0}
              className="px-4 sm:px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  {isUrdu ? 'ادائیگی ہو رہی...' : t('processing')}
                </span>
              ) : (
                isUrdu ? 'ادائیگی کریں' : t('pay')
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPaymentModal;