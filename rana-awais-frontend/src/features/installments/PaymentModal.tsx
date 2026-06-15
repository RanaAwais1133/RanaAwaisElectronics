import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { recordPayment, advancePayment } from '../../utils/api';
import FormField from '../../components/forms/FormField';
import PaymentReceipt from './PaymentReceipt';

interface Props {
  planId: string;
  installmentNo?: number;
  dueAmount?: number;
  finePerDay?: number;
  graceDays?: number;
  dueDate?: string;
  mode?: 'single' | 'advance';
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<Props> = ({
  planId, installmentNo, dueAmount, finePerDay = 10, graceDays = 2, dueDate,
  mode = 'single', onClose, onSuccess,
}) => {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(mode === 'single' ? dueAmount || 0 : 0);
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  // Due date editable - initialize from dueDate prop if available
  const [installmentDueDate, setInstallmentDueDate] = useState(
    dueDate ? new Date(dueDate).toISOString().split('T')[0] : ''
  );

  const [collectedBy, setCollectedBy] = useState('');
  const [fine] = useState(0); // eslint-disable-line @typescript-eslint/no-unused-vars
  const totalDue = (dueAmount || 0) + fine;


  const handlePayment = async () => {
    if (amount <= 0) { setError(t('invalid_amount')); return; }
    setLoading(true); setError('');
    try {
      if (mode === 'advance') {
        await advancePayment({ plan_id: planId, amount, method, payment_date: paymentDate, collected_by: collectedBy || undefined });
        toast.success(t('advance_payment_success'));
      } else {
        await recordPayment({
          plan_id: planId,
          installment_no: installmentNo!,
          amount,
          method,
          payment_date: paymentDate,
          due_date: installmentDueDate || undefined,
          collected_by: collectedBy || undefined,
        });
        toast.success(t('payment_recorded'));
      }

      setPaymentDone(true);
      onSuccess();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || t('payment_failed');
      setError(errMsg);
      // Show toast with the error message
      toast.error(errMsg);
    }
    finally { setLoading(false); }
  };



  if (paymentDone && showReceipt) return <PaymentReceipt planId={planId} onClose={onClose} />;

  if (paymentDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">✅</div>
          <h2 className="text-xl font-bold mb-2">{t('payment_recorded')}</h2>
          <p className="text-sm text-gray-500 mb-6">Rs. {amount.toFixed(2)} via {method}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 rounded-2xl text-sm font-semibold">{t('close')}</button>
            <button onClick={() => setShowReceipt(true)} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl text-sm font-semibold">🧾 {t('view_receipt')}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex justify-between items-center px-6 py-4 border-b rounded-t-3xl">
          <h2 className="text-xl font-bold">{mode === 'advance' ? t('advance_payment') : t('record_payment')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 text-xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {mode === 'single' && (
            <div className="bg-gray-50 rounded-2xl p-4 text-sm space-y-2">
              <div className="flex justify-between"><span>#{installmentNo}</span><span className="font-semibold">Rs. {dueAmount?.toFixed(2)}</span></div>
              {fine > 0 && <div className="flex justify-between text-red-500"><span>Fine</span><span>Rs. {fine.toFixed(2)}</span></div>}
              <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total</span><span>Rs. {totalDue.toFixed(2)}</span></div>
              {dueAmount && dueAmount < (dueAmount + fine) && (
                <p className="text-xs text-amber-600 mt-1">💡 {t('pay_more_will_forward', 'If you pay more, excess will go to next installment')}</p>
              )}
            </div>
          )}
          <FormField label={mode === 'advance' ? t('advance_amount') : t('pay_amount')} name="amount" type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required />
          {mode === 'single' && (
            <div>
              <label className="block text-sm font-semibold mb-1.5">{t('installment_due_date', 'Installment Due Date')}</label>
              <input type="date" value={installmentDueDate} onChange={e => setInstallmentDueDate(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white text-sm" />
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold mb-1.5">{t('payment_date', 'Payment Date')}</label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5">{t('collected_by') || 'Collected By'}</label>
            <input type="text" value={collectedBy} onChange={e => setCollectedBy(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white text-sm" placeholder="e.g. Huzaifa, Ali" />
          </div>
          <div><label className="block text-sm font-semibold mb-1.5">{t('payment_method')}</label><select className="w-full border rounded-xl px-4 py-2.5" value={method} onChange={e => setMethod(e.target.value)}><option value="cash">Cash</option><option value="bank_transfer">Bank</option><option value="jazzcash">JazzCash</option><option value="easypaisa">Easypaisa</option></select></div>

          {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded-xl">{error}</p>}
          <div className="flex justify-end gap-3 pt-2"><button onClick={onClose} className="px-5 py-2.5 bg-gray-100 rounded-xl text-sm font-semibold">{t('cancel')}</button><button onClick={handlePayment} disabled={loading} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50">{loading ? t('processing') : t('pay')}</button></div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;