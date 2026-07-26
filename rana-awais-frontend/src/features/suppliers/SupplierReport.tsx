import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSupplierStore } from '../../store/useSupplierStore';
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
  const [payErr, setPayErr] = useState('');

  const supplier = suppliers.find(s => s.id === supplierId);
  const supplierPromises = promises.filter(p => p.supplierId === supplierId);
  const supplierPurchases = purchases.filter(p => p.supplierId === supplierId);
  const supplierPayments = payments.filter(p => p.supplierId === supplierId);

  const loadData = useCallback(() => {
    if (supplierId) {
      fetchPurchases(supplierId);
      fetchPayments(supplierId);
      fetchPromises(supplierId);
    }
  }, [supplierId, fetchPurchases, fetchPayments, fetchPromises]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalPurchased = supplierPurchases.reduce((s, p) => s + (p.totalAmount || 0), 0);
  const totalPaid = supplierPurchases.reduce((s, p) => s + (p.paidAmount || 0), 0);
  const totalRemaining = totalPurchased - totalPaid;

  const handlePayment = async () => {
    const amt = parseFloat(paidAmount);
    if (!amt || amt <= 0) { setPayErr(isUrdu ? 'رقم درج کریں' : 'Enter amount'); return; }
    setPayLoading(true); setPayErr('');
    try {
      await api.post('/supplier-payments', {
        supplierId, amount: amt, method: paymentMethod,
        paymentDate: new Date().toISOString().split('T')[0],
      });
      toast.success(isUrdu ? 'ادائیگی محفوظ' : 'Payment saved');
      loadData();
      setShowPayModal(false); setPaidAmount('');
    } catch { toast.error(isUrdu ? 'ناکام' : 'Failed'); }
    finally { setPayLoading(false); }
  };

  const handlePayPromise = async (promiseId: string) => {
    const pr = promises.find(p => p.id === promiseId);
    if (!pr) return;
    try {
      await api.put(`/supplier-promises/${promiseId}`, { status: 'paid', paidAmount: pr.amount });
      toast.success(isUrdu ? 'ادا شدہ' : 'Marked paid');
      loadData();
    } catch { toast.error(isUrdu ? 'ناکام' : 'Failed'); }
  };

  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-5 py-3 border-b rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{supplier.name}</h2>
            <p className="text-xs text-gray-500">{supplier.phone} {supplier.company ? `| ${supplier.company}` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowPayModal(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
              + {isUrdu ? 'ادائیگی' : 'Add Payment'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-xl">&times;</button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{isUrdu ? 'کل خریداری' : 'Total Purchased'}</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">Rs. {totalPurchased.toLocaleString()}</p>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 dark:text-gray-400">{isUrdu ? 'ادا شدہ' : 'Total Paid'}</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">Rs. {totalPaid.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl p-3 text-center ${totalRemaining > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
              <p className="text-xs text-gray-500 dark:text-gray-400">{isUrdu ? 'بقایا' : 'Remaining'}</p>
              <p className={`text-lg font-bold ${totalRemaining > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600'}`}>Rs. {totalRemaining.toLocaleString()}</p>
            </div>
          </div>

          {/* Purchases Table */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">{isUrdu ? 'خریداریاں' : 'Purchases'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{isUrdu ? 'تاریخ' : 'Date'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'ٹوٹل' : 'Total'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'ادا' : 'Paid'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'بقایا' : 'Left'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'موڈ' : 'Mode'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'سٹیٹس' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                  {supplierPurchases.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400 text-xs">{isUrdu ? 'کوئی خریداری نہیں' : 'No purchases yet'}</td></tr>
                  ) : supplierPurchases.map(p => (
                    <tr key={p.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap">{p.totalAmount?.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap text-emerald-600">{p.paidAmount?.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap text-red-500">{p.remainingAmount?.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center capitalize">{p.paymentMode}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : p.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                          {p.status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Promises Table */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">{isUrdu ? 'وعدے' : 'Payment Promises'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs min-w-[500px]">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{isUrdu ? 'آخری تاریخ' : 'Due Date'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'رقم' : 'Amount'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'سٹیٹس' : 'Status'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'ایکشن' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                  {supplierPromises.length === 0 ? (
                    <tr><td colSpan={4} className="px-3 py-6 text-center text-gray-400 text-xs">{isUrdu ? 'کوئی وعدہ نہیں' : 'No promises'}</td></tr>
                  ) : supplierPromises.map(pr => (
                    <tr key={pr.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{new Date(pr.dueDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap">{pr.amount?.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {pr.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {pr.status !== 'paid' && (
                          <button onClick={() => handlePayPromise(pr.id)} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-medium transition-colors">
                            {isUrdu ? 'ادا کریں' : 'Pay Now'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment History Table */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">{isUrdu ? 'ادائیگی کی ہسٹری' : 'Payment History'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs min-w-[400px]">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{isUrdu ? 'تاریخ' : 'Date'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'رقم' : 'Amount'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'طریقہ' : 'Method'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                  {supplierPayments.length === 0 ? (
                    <tr><td colSpan={3} className="px-3 py-6 text-center text-gray-400 text-xs">{isUrdu ? 'کوئی ادائیگی نہیں' : 'No payments yet'}</td></tr>
                  ) : supplierPayments.map(pay => (
                    <tr key={pay.id} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{new Date(pay.paymentDate).toLocaleDateString()}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap text-emerald-600 font-medium">{pay.amount?.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center capitalize">{pay.method || 'cash'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Add Payment Modal */}
        {showPayModal && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/40 rounded-3xl" onClick={() => setShowPayModal(false)}>
            <div className="bg-white dark:bg-gray-700 rounded-2xl p-5 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">{isUrdu ? 'ادائیگی شامل کریں' : 'Add Payment'}</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{isUrdu ? 'رقم' : 'Amount'} *</label>
                  <input type="number" placeholder="0" value={paidAmount} onChange={e => setPaidAmount(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{isUrdu ? 'طریقہ' : 'Method'}</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-600">
                    <option value="cash">{isUrdu ? 'نقد' : 'Cash'}</option>
                    <option value="bank">{isUrdu ? 'بینک' : 'Bank'}</option>
                  </select>
                </div>
                {payErr && <p className="text-red-500 text-xs">{payErr}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => { setShowPayModal(false); setPayErr(''); }} className="flex-1 py-2 bg-gray-100 dark:bg-gray-600 rounded-lg text-sm font-medium">{isUrdu ? 'منسوخ' : 'Cancel'}</button>
                  <button onClick={handlePayment} disabled={payLoading} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-medium">
                    {payLoading ? '...' : isUrdu ? 'ادا کریں' : 'Pay'}
                  </button>
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