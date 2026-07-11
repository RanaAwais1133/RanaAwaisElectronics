import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface EditInstallmentModalProps {
  planId: string;
  installment: {
    installmentNo: number;
    dueDate: string;
    amount: number;
    paid: boolean;
    paidDate?: string | null;
    fine: number;
    partialPaid: number;
    remaining: number;
    collectedBy: string;
    collectedById: string;
    remarks: string;
    finePerDay: number;
    daysLate: number;
    fineApplied: number;
    totalPayable: number;
  };
  onClose: () => void;
  onSuccess: () => void;
}

const formatDate = (d: string) => {
  if (!d) return '';
  try { return new Date(d).toISOString().split('T')[0]; } catch { return d; }
};

const EditInstallmentModal: React.FC<EditInstallmentModalProps> = ({ planId, installment, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';

  const [dueDate, setDueDate] = useState(formatDate(installment.dueDate));
  const [amount, setAmount] = useState(installment.amount.toString());
  const [paid, setPaid] = useState(installment.paid);
  const [paidDate, setPaidDate] = useState(installment.paidDate ? formatDate(installment.paidDate) : '');
  const [fine, setFine] = useState(installment.fine.toString());
  const [partialPaid, setPartialPaid] = useState((installment.partialPaid || 0).toString());
  const [remaining, setRemaining] = useState((installment.remaining || 0).toString());
  const [collectedBy, setCollectedBy] = useState(installment.collectedBy || '');
  const [remarks, setRemarks] = useState(installment.remarks || '');
  const [loading, setLoading] = useState(false);

  const handleSave = useCallback(async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error(isUrdu ? 'درست رقم درج کریں' : 'Enter valid amount');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        installmentNo: installment.installmentNo,
        dueDate: new Date(dueDate).toISOString(),
        amount: amt,
        paid,
        paidDate: paid && paidDate ? new Date(paidDate).toISOString() : null,
        fine: parseFloat(fine) || 0,
        partialPaid: parseFloat(partialPaid) || 0,
        remaining: parseFloat(remaining) || 0,
        collectedBy,
        collectedById: installment.collectedById || '',
        remarks,
        finePerDay: installment.finePerDay || 0,
        daysLate: installment.daysLate || 0,
        fineApplied: installment.fineApplied || 0,
        totalPayable: installment.totalPayable || 0,
      };

      await api.put(`/admin/installments/${planId}/installment/${installment.installmentNo}`, payload);
      toast.success(isUrdu ? 'قسط اپ ڈیٹ ہو گئی' : 'Installment updated');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isUrdu ? 'اپ ڈیٹ ناکام' : 'Update failed'));
    } finally {
      setLoading(false);
    }
  }, [installment.installmentNo, planId, dueDate, amount, paid, paidDate, fine, partialPaid, remaining, collectedBy, remarks, installment, onSuccess, onClose, isUrdu]);

  const handleUndo = useCallback(async () => {
    if (!confirm(isUrdu ? 'کیا آپ واقعی یہ قسط واپس کرنا چاہتے ہیں؟' : 'Are you sure you want to undo this installment?')) return;

    setLoading(true);
    try {
      await api.post(`/admin/installments/${planId}/installment/${installment.installmentNo}/undo`);
      toast.success(isUrdu ? 'قسط واپس کر دی گئی' : 'Installment undone');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isUrdu ? 'واپسی ناکام' : 'Undo failed'));
    } finally {
      setLoading(false);
    }
  }, [planId, installment.installmentNo, onSuccess, onClose, isUrdu]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
          {isUrdu ? 'قسط میں ترمیم' : 'Edit Installment'} #{installment.installmentNo}
        </h3>

        <div className="space-y-3">
          {/* Due Date */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {isUrdu ? 'تاریخ' : 'Due Date'}
            </label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {isUrdu ? 'رقم' : 'Amount'}
            </label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Paid Status */}
          <div className="flex items-center gap-2">
            <input type="checkbox" id="edit-paid" checked={paid} onChange={e => setPaid(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="edit-paid" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {isUrdu ? 'ادا شدہ' : 'Paid'}
            </label>
          </div>

          {/* Paid Date */}
          {paid && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                {isUrdu ? 'ادائیگی کی تاریخ' : 'Paid Date'}
              </label>
              <input type="date" value={paidDate} onChange={e => setPaidDate(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
            </div>
          )}

          {/* Fine */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {isUrdu ? 'جرمانہ' : 'Fine'}
            </label>
            <input type="number" value={fine} onChange={e => setFine(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Partial Paid */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {isUrdu ? 'جزوی ادائیگی' : 'Partial Paid'}
            </label>
            <input type="number" value={partialPaid} onChange={e => setPartialPaid(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Remaining */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {isUrdu ? 'باقی' : 'Remaining'}
            </label>
            <input type="number" value={remaining} onChange={e => setRemaining(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Collected By */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {isUrdu ? 'وصول کنندہ' : 'Collected By'}
            </label>
            <input type="text" value={collectedBy} onChange={e => setCollectedBy(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
              {isUrdu ? 'نوٹس' : 'Remarks'}
            </label>
            <input type="text" value={remarks} onChange={e => setRemarks(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
          </div>
        </div>

        {/* Undo Button (only if paid) */}
        {installment.paid && (
          <button onClick={handleUndo} disabled={loading}
            className="w-full mt-4 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors">
            {loading ? (isUrdu ? '...براہ کرم انتظار' : 'Please wait...') : (isUrdu ? 'واپس کریں (Unpaid)' : 'Undo (Mark Unpaid)')}
          </button>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm">
            {isUrdu ? 'منسوخ' : 'Cancel'}
          </button>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white transition-colors text-sm font-semibold">
            {loading ? (isUrdu ? 'محفوظ ہو رہا...' : 'Saving...') : (isUrdu ? 'محفوظ کریں' : 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditInstallmentModal;