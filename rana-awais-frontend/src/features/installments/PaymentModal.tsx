import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { recordPayment, advancePayment } from '../../utils/api';
import FormField from '../../components/forms/FormField';
import PaymentReceipt from './PaymentReceipt';
import { useAuthStore } from '../../store/useAuthStore';

interface Props {
  planId: string;
  installmentNo?: number;
  dueAmount?: number;
  finePerDay?: number;
  graceDays?: number;
  dueDate?: string;
  fineAmount?: number;
  mode?: 'single' | 'advance';
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<Props> = ({
  planId,
  installmentNo,
  dueAmount,
  finePerDay = 10,
  graceDays = 2,
  dueDate,
  fineAmount = 0,
  mode = 'single',
  onClose,
  onSuccess,
}) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);

  // ✅ State
  const [amount, setAmount] = useState(mode === 'single' ? dueAmount || 0 : 0);
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [installmentDueDate, setInstallmentDueDate] = useState(
    dueDate ? new Date(dueDate).toISOString().split('T')[0] : ''
  );
  const [collectedBy, setCollectedBy] = useState(currentUser?.displayName || currentUser?.username || '');
  const [collectedById, setCollectedById] = useState(currentUser?.id || '');
  const [remarks, setRemarks] = useState('');
  const [collectFine, setCollectFine] = useState(true);

  // ✅ Calculate fine if overdue
  const calculateFine = useCallback(() => {
    if (!dueDate || !dueAmount) return 0;
    const today = new Date();
    const due = new Date(dueDate);
    const graceEnd = new Date(due);
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    
    if (today <= graceEnd) return 0;
    
    const daysOverdue = Math.floor((today.getTime() - graceEnd.getTime()) / (1000 * 60 * 60 * 24));
    if (daysOverdue <= 0) return 0;
    
    const fine = daysOverdue * finePerDay;
    return Math.min(fine, dueAmount * 0.5); // Max fine = 50% of amount
  }, [dueDate, dueAmount, finePerDay, graceDays]);

  const calculatedFine = calculateFine();
  const effectiveFine = fineAmount > 0 ? fineAmount : calculatedFine;
  const fineToApply = collectFine ? effectiveFine : 0;
  const totalDue = (dueAmount || 0) + fineToApply;

  // ✅ Payment methods
  const paymentMethods = [
    { value: 'cash', label: isUrdu ? 'نقد' : 'Cash' },
    { value: 'bank_transfer', label: isUrdu ? 'بینک ٹرانسفر' : 'Bank Transfer' },
    { value: 'jazzcash', label: 'JazzCash' },
    { value: 'easypaisa', label: 'Easypaisa' },
  ];

  // ✅ Handle payment
  const handlePayment = useCallback(async () => {
    if (amount <= 0) {
      setError(isUrdu ? 'رقم درست نہیں' : t('invalid_amount'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (mode === 'advance') {
        await advancePayment({
          plan_id: planId,
          amount,
          method,
          payment_date: paymentDate,
          collected_by: collectedBy || currentUser?.displayName || currentUser?.username || '',
          collected_by_id: collectedById || currentUser?.id || '',
        });
        toast.success(isUrdu ? 'ایڈوانس ادائیگی کامیاب' : t('advance_payment_success'));
      } else {
        await recordPayment({
          plan_id: planId,
          installment_no: installmentNo!,
          amount,
          method,
          payment_date: paymentDate,
          due_date: installmentDueDate || undefined,
          collected_by: collectedBy || currentUser?.displayName || currentUser?.username || '',
          collected_by_id: collectedById || currentUser?.id || '',
          remarks: remarks || '',
        });
        toast.success(isUrdu ? 'ادائیگی ریکارڈ ہو گئی' : t('payment_recorded'));
      }

      setPaymentDone(true);
      onSuccess();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 
                     (isUrdu ? 'ادائیگی ناکام' : t('payment_failed'));
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setLoading(false);
    }
  }, [
    amount,
    mode,
    planId,
    method,
    paymentDate,
    collectedBy,
    collectedById,
    remarks,
    installmentNo,
    installmentDueDate,
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
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {isUrdu ? 'ادائیگی کامیاب' : t('payment_recorded')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
            Rs. {amount.toFixed(2)} {isUrdu ? 'کے ذریعے' : 'via'} {paymentMethods.find(m => m.value === method)?.label || method}
          </p>
          {effectiveFine > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-4">
              {isUrdu ? 'جرمانہ' : 'Fine'}: Rs. {effectiveFine.toFixed(2)}
            </p>
          )}
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl text-sm font-semibold transition-colors">
              {isUrdu ? 'بند کریں' : t('close')}
            </button>
            <button onClick={() => setShowReceipt(true)} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {mode === 'advance' ? (isUrdu ? 'ایڈوانس ادائیگی' : t('advance_payment')) : (isUrdu ? 'ادائیگی ریکارڈ کریں' : t('record_payment'))}
          </h2>
          <button onClick={onClose} className="p-1.5 sm:p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl sm:text-2xl">✕</button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          {/* ✅ Single Payment Details */}
          {mode === 'single' && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">#{installmentNo}</span>
                <span className="font-semibold text-gray-800 dark:text-white">Rs. {dueAmount?.toFixed(2)}</span>
              </div>
              {effectiveFine > 0 && (
                <>
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>{isUrdu ? 'جرمانہ' : 'Fine'}</span>
                    <span>Rs. {effectiveFine.toFixed(2)}</span>
                  </div>
                  {/* ✅ Fine Skip/Collect Toggle */}
                  <div className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 rounded-lg px-3 py-2 mt-1">
                    <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
                      {isUrdu ? 'جرمانہ وصول کریں' : 'Collect Fine'}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCollectFine(!collectFine)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                        collectFine ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                          collectFine ? 'translate-x-4.5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-200 dark:border-gray-600">
                <span className="text-gray-800 dark:text-white">{isUrdu ? 'کل' : 'Total'}</span>
                <span className="text-gray-800 dark:text-white">Rs. {totalDue.toFixed(2)}</span>
              </div>
              {dueAmount && effectiveFine > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  💡 {isUrdu ? 'اگر آپ زیادہ ادائیگی کریں گے تو اضافی رقم اگلی قسط میں منتقل ہو جائے گی' : t('pay_more_will_forward', 'If you pay more, excess will go to next installment')}
                </p>
              )}
            </div>
          )}

          {/* ✅ Amount */}
          <FormField
            label={mode === 'advance' ? (isUrdu ? 'ایڈوانس رقم' : t('advance_amount')) : (isUrdu ? 'ادائیگی کی رقم' : t('pay_amount'))}
            name="amount"
            type="number"
            value={amount}
            onChange={e => setAmount(Number(e.target.value))}
            required
            min={0}
            step="0.01"
          />

          {/* ✅ Installment Due Date (Single mode) */}
          {mode === 'single' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                {isUrdu ? 'قسط کی تاریخ' : t('installment_due_date', 'Installment Due Date')}
              </label>
              <input
                type="date"
                value={installmentDueDate}
                onChange={e => setInstallmentDueDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
              />
            </div>
          )}

          {/* ✅ Payment Date */}
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

          {/* ✅ Collected By */}
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

          {/* ✅ Remarks */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
              {isUrdu ? 'ریمارکس' : 'Remarks'}
            </label>
            <input
              type="text"
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder={isUrdu ? 'مثال: ادائیگی' : 'e.g. Payment'}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            />
          </div>

          {/* ✅ Payment Method */}
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
              onClick={onClose}
              className="px-4 sm:px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-200 transition-all"
            >
              {isUrdu ? 'منسوخ کریں' : t('cancel')}
            </button>
            <button
              onClick={handlePayment}
              disabled={loading}
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

export default PaymentModal;