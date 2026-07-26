import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSupplierStore } from '../../store/useSupplierStore';
import { APP_CONFIG } from '../../config/app';
import api from '../../utils/api';

interface Props {
  supplierId: string;
  onClose: () => void;
}

const SupplierReport: React.FC<Props> = ({ supplierId, onClose }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const { suppliers, fetchPurchases, fetchPayments, fetchPromises, purchases, payments, promises } = useSupplierStore();
  const [paidAmount, setPaidAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [showPayModal, setShowPayModal] = useState(false);
  const [payLoading, setPayLoading] = useState(false);

  const supplier = suppliers.find(s => s.id === supplierId);

  useEffect(() => {
    if (supplierId) {
      fetchPurchases(supplierId);
      fetchPayments(supplierId);
      fetchPromises();
    }
  }, [supplierId, fetchPurchases, fetchPayments, fetchPromises]);

  const totalPurchased = purchases.reduce((s, p) => s + p.totalAmount, 0);
  const totalPaid = purchases.reduce((s, p) => s + p.paidAmount, 0);
  const totalRemaining = totalPurchased - totalPaid;

  const handlePayment = async () => {
    if (!parseFloat(paidAmount)) return;
    setPayLoading(true);
    try {
      await api.post('/supplier-payments', {
        supplierId, amount: parseFloat(paidAmount), method: paymentMethod,
        paymentDate: new Date().toISOString().split('T')[0],
      });
      toast.success(isUrdu ? 'ادائیگی محفوظ' : 'Payment saved');
      fetchPayments(supplierId);
      fetchPurchases(supplierId);
      setShowPayModal(false);
      setPaidAmount('');
    } catch { toast.error(isUrdu ? 'ناکام' : 'Failed'); }
    finally { setPayLoading(false); }
  };

  const handlePayPromise = async (promiseId: string) => {
    const pr = promises.find(p => p.id === promiseId);
    if (!pr) return;
    try {
      await api.put(`/supplier-promises/${promiseId}`, { status: 'paid', paidAmount: pr.amount });
      toast.success(isUrdu ? 'ادا شدہ' : 'Marked paid');
      fetchPromises();
      fetchPurchases(supplierId);
    } catch { toast.error(isUrdu ? 'ناکام' : 'Failed'); }
  };

  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-6 py-4 border-b rounded-t-3xl z-10">
          <div>
            <h2 className="text-xl font-bold">{supplier.name}</h2>
            <p className="text-xs text-gray-500">{supplier.phone} | {supplier.company || '—'}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-xl">&times;</button>
        </div>

        <div className="p-6 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500">{isUrdu ? 'کل خریداری' : 'Total Purchased'}</p>
              <p className="text-xl font-bold text-blue-600">Rs. {totalPurchased.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500">{isUrdu ? 'ادا شدہ' : 'Total Paid'}</p>
              <p className="text-xl font-bold text-emerald-600">Rs. {totalPaid.toLocaleString()}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 text-center">
              <p className="text-xs text-gray-500">{isUrdu ? 'بقایا' : 'Remaining'}</p>
              <p className="text-xl font-bold text-red-600">Rs. {totalRemaining.toLocaleString()}</p>
            </div>
          </div>

          {/* Purchases */}
          <div>
            <h3 className="text-sm font-bold mb-2">{isUrdu ? 'خریداریاں' : 'Purchases'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-3 py-2 text-start">Date</th><th className="px-3 py-2">Total</th><th className="px-3 py-2">Paid</th><th className="px-3 py-2">Remaining</th><th className="px-3 py-2">Mode</th><th className="px-3 py-2">Status</th></tr></thead>
                <tbody className="divide-y">
                  {purchases.map(p => (
                    <tr key={p.id}><td className="px-3 py-2">{new Date(p.createdAt).toLocaleDateString()}</td><td className="px-3 py-2 text-right">{p.totalAmount.toLocaleString()}</td><td className="px-3 py-2 text-right">{p.paidAmount.toLocaleString()}</td><td className="px-3 py-2 text-right">{p.remainingAmount.toLocaleString()}</td><td className="px-3 py-2 capitalize">{p.paymentMode}</td><td className="px-3 py-2 capitalize">{p.status}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promises */}
          <div>
            <h3 className="text-sm font-bold mb-2">{isUrdu ? 'وعدے' : 'Promises'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-3 py-2 text-start">Due Date</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Status</th><th className="px-3 py-2">Action</th></tr></thead>
                <tbody className="divide-y">
                  {promises.filter(p => p.supplierId === supplierId).map(p => (
                    <tr key={p.id}><td className="px-3 py-2">{new Date(p.dueDate).toLocaleDateString()}</td><td className="px-3 py-2 text-right">{p.amount.toLocaleString()}</td><td className="px-3 py-2 capitalize">{p.status}</td><td className="px-3 py-2">{p.status === 'pending' && <button onClick={() => handlePayPromise(p.id)} className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded">{isUrdu ? 'ادا کریں' : 'Pay'}</button>}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payments History */}
          <div>
            <h3 className="text-sm font-bold mb-2">{isUrdu ? 'ادائیگی کی تاریخ' : 'Payment History'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 dark:bg-gray-700"><tr><th className="px-3 py-2 text-start">Date</th><th className="px-3 py-2">Amount</th><th className="px-3 py-2">Method</th></tr></thead>
                <tbody className="divide-y">
                  {payments.map(p => (
                    <tr key={p.id}><td className="px-3 py-2">{new Date(p.paymentDate).toLocaleDateString()}</td><td className="px-3 py-2 text-right">{p.amount.toLocaleString()}</td><td className="px-3 py-2 capitalize">{p.method}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add Payment Button */}
          <div className="flex justify-end">
            <button onClick={() => setShowPayModal(true)} className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl text-sm font-semibold">
              + {isUrdu ? 'ادائیگی' : 'Add Payment'}
            </button>
          </div>
        </div>

        {/* Payment Modal */}
        {showPayModal && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 rounded-3xl" onClick={() => setShowPayModal(false)}>
            <div className="bg-white dark:bg-gray-700 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold mb-4">{isUrdu ? 'ادائیگی شامل کریں' : 'Add Payment'}</h3>
              <div className="space-y-3">
                <input type="number" placeholder={isUrdu ? 'رقم' : 'Amount'} value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm" />
                <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border rounded-xl px-3 py-2 text-sm"><option value="cash">{isUrdu ? 'نقد' : 'Cash'}</option><option value="bank">{isUrdu ? 'بینک' : 'Bank'}</option></select>
                <div className="flex gap-2">
                  <button onClick={() => setShowPayModal(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-600 rounded-xl text-sm">{isUrdu ? 'منسوخ' : 'Cancel'}</button>
                  <button onClick={handlePayment} disabled={payLoading} className="flex-1 py-2 bg-emerald-600 text-white rounded-xl text-sm">{payLoading ? '...' : isUrdu ? 'ادا کریں' : 'Pay'}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierReport;