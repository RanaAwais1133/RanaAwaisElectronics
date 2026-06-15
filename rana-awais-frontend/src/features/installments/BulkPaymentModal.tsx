import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { bulkPayment } from '../../utils/api';
import PaymentReceipt from './PaymentReceipt';

interface SelectedInstallment {
  installment_no: number;
  amount: number;
}

interface Props {
  planId: string;
  selectedInstallments: SelectedInstallment[];
  onClose: () => void;
  onSuccess: () => void;
}

const BulkPaymentModal: React.FC<Props> = ({ planId, selectedInstallments, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [method, setMethod] = useState('cash');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectedBy, setCollectedBy] = useState('');

  const total = useMemo(() => selectedInstallments.reduce((sum, i) => sum + i.amount, 0), [selectedInstallments]);


  const handleBulkPay = async () => {
    if (selectedInstallments.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await bulkPayment({
        plan_id: planId,
        method,
        payment_date: paymentDate,
        collected_by: collectedBy || undefined,
        payments: selectedInstallments.map(i => ({
          installment_no: i.installment_no,
          amount: i.amount,
        })),
      });

      toast.success(t('bulk_payment_success'));
      onSuccess();
      setPaymentDone(true);
    } catch (err: any) {
      setError(err.response?.data?.error || t('payment_failed'));
    } finally {
      setLoading(false);
    }
  };

  if (paymentDone && showReceipt) {
    return <PaymentReceipt planId={planId} onClose={onClose} />;
  }

  if (paymentDone) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md p-8 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">{t('bulk_payment_success')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Rs. {total.toFixed(2)} via {method}</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button onClick={onClose} className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-2xl text-sm font-semibold transition-all">{t('close') || 'Close'}</button>
            <button onClick={() => setShowReceipt(true)} className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              {t('view_receipt')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b border-gray-200 dark:border-gray-700 rounded-t-3xl z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">{t('bulk_payment')}</h2>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 transition-all">&times;</button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-300">{t('selected_installments')} ({selectedInstallments.length})</h3>
            <ul className="space-y-1">
              {selectedInstallments.map(inst => (
                <li key={inst.installment_no} className="flex justify-between text-sm bg-gray-50 dark:bg-gray-700/50 px-3 py-2 rounded-lg">
                  <span>#{inst.installment_no}</span>
                  <span className="font-medium">Rs. {inst.amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 font-semibold text-right text-gray-800 dark:text-white">{t('total')}: Rs. {total.toFixed(2)}</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('payment_date', 'Payment Date')}</label>
            <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('collected_by') || 'Collected By'}</label>
            <input type="text" value={collectedBy} onChange={e => setCollectedBy(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" placeholder="e.g. Huzaifa, Ali" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('payment_method')}</label>

            <select className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400" value={method} onChange={e => setMethod(e.target.value)}>
              <option value="cash">{t('cash')}</option>
              <option value="bank_transfer">{t('bank_transfer')}</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">Easypaisa</option>
            </select>
          </div>
          {error && <p className="text-red-500 text-sm bg-red-50 dark:bg-red-900/30 p-3 rounded-xl">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={onClose} className="px-5 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-xl text-sm font-semibold transition-all">{t('cancel')}</button>
            <button onClick={handleBulkPay} disabled={loading} className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-xl text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50">{loading ? t('processing') : t('pay')}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkPaymentModal;