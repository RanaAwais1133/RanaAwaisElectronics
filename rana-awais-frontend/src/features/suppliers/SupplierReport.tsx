import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSupplierStore, Purchase, PurchaseItem } from '../../store/useSupplierStore';
import api from '../../utils/api';
import SupplierLedger from './SupplierLedger';
import SupplierReminders from './SupplierReminders';

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
  const [expandedPurchase, setExpandedPurchase] = useState<string | null>(null);
  const [showPurchaseHistory, setShowPurchaseHistory] = useState(false);
  const [selectedPurchaseForHistory, setSelectedPurchaseForHistory] = useState<Purchase | null>(null);
  const [showLedger, setShowLedger] = useState(false);
  const [showReminders, setShowReminders] = useState(false);

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

  // Collect all product names from purchases for the summary
  const allProductNames = supplierPurchases
    .flatMap(p => p.items || [])
    .map(i => i.productName)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(', ');

  const formatDate = (dateStr: string | Date | undefined | null): string => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '-';
      return d.toLocaleDateString();
    } catch {
      return '-';
    }
  };

  const handlePayment = async () => {
    if (payLoading) return;
    const amt = parseFloat(paidAmount);
    if (!amt || amt <= 0) { setPayErr(isUrdu ? 'رقم درج کریں' : 'Enter amount'); return; }
    if (totalPurchased > 0 && amt > totalRemaining) {
      setPayErr(isUrdu ? `زیادہ سے زیادہ ${totalRemaining.toLocaleString()}` : `Max Rs. ${totalRemaining.toLocaleString()}`);
      return;
    }
    setPayLoading(true); setPayErr('');
    try {
      // Get today's date in YYYY-MM-DD format
      const today = new Date();
      const paymentDate = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      await api.post('/supplier-payments', {
        supplierId, amount: amt, method: paymentMethod,
        paymentDate,
      });
      toast.success(isUrdu ? 'ادائیگی محفوظ' : 'Payment saved');
      loadData();
      setShowPayModal(false); setPaidAmount('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || (isUrdu ? 'ناکام' : 'Failed');
      toast.error(msg);
    }
    finally { setPayLoading(false); }
  };

  const handlePayPromise = async (promiseId: string) => {
    if (payLoading) return;
    const pr = promises.find(p => p.id === promiseId);
    if (!pr || pr.status === 'paid') return;
    setPayLoading(true);
    try {
      const today = new Date();
      const paymentDate = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');

      await api.post('/supplier-payments', {
        supplierId: pr.supplierId,
        purchaseId: pr.purchaseId,
        amount: pr.amount,
        method: 'cash',
        paymentDate,
      });
      await api.put(`/supplier-promises/${promiseId}`, { status: 'paid', paidAmount: pr.amount });
      toast.success(isUrdu ? 'ادا شدہ' : 'Marked paid');
      loadData();
    } catch (err: any) {
      const msg = err?.response?.data?.error || (isUrdu ? 'ناکام' : 'Failed');
      toast.error(msg);
    }
    finally { setPayLoading(false); }
  };

  const toggleItems = (purchaseId: string) => {
    setExpandedPurchase(expandedPurchase === purchaseId ? null : purchaseId);
  };

  const openHistoryModal = (purchase: Purchase) => {
    setSelectedPurchaseForHistory(purchase);
    setShowPurchaseHistory(true);
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
          <div className="flex items-center gap-2">
            <button onClick={() => setShowReminders(true)} className="px-2 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-medium hover:bg-amber-600">
              {isUrdu ? 'یاد دہانی' : 'Reminders'}
            </button>
            <button onClick={() => setShowLedger(true)} className="px-2 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700">
              {isUrdu ? 'لیجر' : 'Ledger'}
            </button>
            <button onClick={() => setShowPayModal(true)} className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700">
              + {isUrdu ? 'ادائیگی' : 'Payment'}
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

          {/* Products Summary - shows all purchased products */}
          {allProductNames && (
            <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{isUrdu ? 'لی گئی مصنوعات' : 'Products Purchased'}</p>
              <div className="flex flex-wrap gap-1">
                {allProductNames.split(', ').map((name, i) => (
                  <span key={i} className="px-2 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-xs">{name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Purchases Table */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">{isUrdu ? 'خریداریاں' : 'Purchases'}</h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs min-w-[800px]">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="px-3 py-2.5 text-start">{isUrdu ? 'تاریخ' : 'Date'}</th>
                    <th className="px-3 py-2.5 text-start">{isUrdu ? 'اشیاء' : 'Items'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'ٹوٹل' : 'Total'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'ادا' : 'Paid'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'بقایا' : 'Left'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'موڈ' : 'Mode'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'سٹیٹس' : 'Status'}</th>
                    <th className="px-3 py-2.5 text-center">{isUrdu ? 'تفصیل' : 'Detail'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                  {supplierPurchases.length === 0 ? (
                    <tr><td colSpan={8} className="px-3 py-6 text-center text-gray-400 text-xs">{isUrdu ? 'کوئی خریداری نہیں' : 'No purchases yet'}</td></tr>
                  ) : supplierPurchases.map(p => (
                    <React.Fragment key={p.id}>
                      <tr className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 cursor-pointer ${expandedPurchase === p.id ? 'bg-blue-50/50' : ''}`} onClick={() => toggleItems(p.id)}>
                        <td className="px-3 py-2.5 font-medium whitespace-nowrap">{formatDate(p.createdAt)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1 flex-wrap">
                            {p.items && p.items.length > 0 ? (
                              p.items.slice(0, 2).map((item, idx) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">{item.productName}</span>
                              ))
                            ) : <span className="text-gray-400">-</span>}
                            {p.items && p.items.length > 2 && <span className="text-blue-500 text-xs">+{p.items.length - 2}</span>}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-end whitespace-nowrap">{p.totalAmount?.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-end whitespace-nowrap text-emerald-600">{p.paidAmount?.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-end whitespace-nowrap text-red-500">{p.remainingAmount?.toLocaleString()}</td>
                        <td className="px-3 py-2.5 text-center capitalize">{p.paymentMode}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : p.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                            {p.status || 'pending'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={(e) => { e.stopPropagation(); openHistoryModal(p); }}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs transition-colors"
                          >
                            {isUrdu ? 'ہسٹری' : 'History'}
                          </button>
                        </td>
                      </tr>
                      {/* Expandable items row */}
                      {expandedPurchase === p.id && p.items && p.items.length > 0 && (
                        <tr className="bg-gray-50/50 dark:bg-gray-700/30">
                          <td colSpan={8} className="px-6 py-3">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-gray-500">
                                  <th className="text-start px-2 py-1">{isUrdu ? 'نام' : 'Product'}</th>
                                  <th className="text-start px-2 py-1">{isUrdu ? 'کمپنی' : 'Company'}</th>
                                  <th className="text-start px-2 py-1">{isUrdu ? 'سیریل' : 'Serial'}</th>
                                  <th className="text-start px-2 py-1">IMEI</th>
                                  <th className="text-start px-2 py-1">{isUrdu ? 'شاصی' : 'Chassis'}</th>
                                  <th className="text-start px-2 py-1">{isUrdu ? 'انجن' : 'Engine'}</th>
                                  <th className="text-end px-2 py-1">{isUrdu ? 'قیمت' : 'Price'}</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {p.items.map((item, idx) => (
                                  <tr key={idx} className="hover:bg-white/50">
                                    <td className="px-2 py-1 font-medium">{item.productName}</td>
                                    <td className="px-2 py-1 text-gray-600">{item.company || '-'}</td>
                                    <td className="px-2 py-1 text-gray-600">{item.serialNumber || '-'}</td>
                                    <td className="px-2 py-1 text-gray-600">{item.imei || '-'}</td>
                                    <td className="px-2 py-1 text-gray-600">{item.chassisNo || '-'}</td>
                                    <td className="px-2 py-1 text-gray-600">{item.engineNo || '-'}</td>
                                    <td className="px-2 py-1 text-end">Rs. {(item.price || 0).toLocaleString()}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{formatDate(pr.dueDate)}</td>
                      <td className="px-3 py-2.5 text-end whitespace-nowrap">{pr.amount?.toLocaleString()}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pr.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                          {pr.status || 'pending'}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-center">
                        {pr.status !== 'paid' && (
                          <button onClick={() => handlePayPromise(pr.id)} disabled={payLoading} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded text-xs font-medium transition-colors">
                            {payLoading ? '...' : isUrdu ? 'ادا کریں' : 'Pay Now'}
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
                      <td className="px-3 py-2.5 font-medium whitespace-nowrap">{formatDate(pay.paymentDate)}</td>
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
                  {totalRemaining > 0 && <p className="text-xs text-gray-400 mt-1">{isUrdu ? 'بقایا' : 'Remaining'}: Rs. {totalRemaining.toLocaleString()}</p>}
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

        {/* Purchase History Modal */}
        {showPurchaseHistory && selectedPurchaseForHistory && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 rounded-3xl" onClick={() => setShowPurchaseHistory(false)}>
            <div className="bg-white dark:bg-gray-700 rounded-2xl p-5 w-[90%] max-w-lg shadow-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-bold text-gray-800 dark:text-white">
                  {isUrdu ? 'خریداری کی تفصیل' : 'Purchase Details'}
                  <span className="text-sm font-normal text-gray-500 ml-2">{formatDate(selectedPurchaseForHistory.createdAt)}</span>
                </h3>
                <button onClick={() => setShowPurchaseHistory(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600">&times;</button>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3 text-xs bg-gray-50 dark:bg-gray-600 rounded-lg p-3">
                <div><span className="text-gray-500">{isUrdu ? 'کل' : 'Total'}:</span> <strong>Rs. {selectedPurchaseForHistory.totalAmount?.toLocaleString()}</strong></div>
                <div><span className="text-gray-500">{isUrdu ? 'ادا' : 'Paid'}:</span> <strong className="text-emerald-600">Rs. {selectedPurchaseForHistory.paidAmount?.toLocaleString()}</strong></div>
                <div><span className="text-gray-500">{isUrdu ? 'بقایا' : 'Left'}:</span> <strong className="text-red-600">Rs. {selectedPurchaseForHistory.remainingAmount?.toLocaleString()}</strong></div>
              </div>

              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b">
                    <th className="text-start px-2 py-1.5">{isUrdu ? 'نام' : 'Product'}</th>
                    <th className="text-start px-2 py-1.5">{isUrdu ? 'کمپنی' : 'Company'}</th>
                    <th className="text-start px-2 py-1.5">{isUrdu ? 'سیریل' : 'Serial'}</th>
                    <th className="text-start px-2 py-1.5">IMEI</th>
                    <th className="text-start px-2 py-1.5">{isUrdu ? 'ماڈل' : 'Model'}</th>
                    <th className="text-end px-2 py-1.5">{isUrdu ? 'قیمت' : 'Price'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {(selectedPurchaseForHistory.items || []).length === 0 ? (
                    <tr><td colSpan={6} className="px-2 py-4 text-center text-gray-400">{isUrdu ? 'کوئی آئٹم نہیں' : 'No items'}</td></tr>
                  ) : selectedPurchaseForHistory.items!.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-2 py-1.5 font-medium">{item.productName}</td>
                      <td className="px-2 py-1.5 text-gray-600">{item.company || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-600">{item.serialNumber || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-600">{item.imei || '-'}</td>
                      <td className="px-2 py-1.5 text-gray-600">{item.model || '-'}</td>
                      <td className="px-2 py-1.5 text-end">Rs. {(item.price || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Payment history for this purchase only */}
              {supplierPayments.filter(pay => pay.purchaseId === selectedPurchaseForHistory.id).length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <h4 className="text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">{isUrdu ? 'ادائیگیاں' : 'Payments'}</h4>
                  {supplierPayments.filter(pay => pay.purchaseId === selectedPurchaseForHistory.id).map(pay => (
                    <div key={pay.id} className="flex justify-between items-center text-xs py-1">
                      <span className="text-gray-500">{formatDate(pay.paymentDate)}</span>
                      <span className="text-emerald-600 font-medium">Rs. {pay.amount?.toLocaleString()}</span>
                      <span className="capitalize text-gray-500">({pay.method || 'cash'})</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-3 flex justify-end">
                <button onClick={() => setShowPurchaseHistory(false)} className="px-4 py-1.5 bg-gray-100 dark:bg-gray-600 rounded-lg text-xs font-medium">{isUrdu ? 'بند کریں' : 'Close'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Supplier Ledger Modal */}
        {showLedger && supplierId && (
          <SupplierLedger supplierId={supplierId} onClose={() => setShowLedger(false)} />
        )}

        {/* Supplier Reminders Modal */}
        {showReminders && (
          <SupplierReminders onClose={() => setShowReminders(false)} />
        )}
      </div>
    </div>
  );
};

export default SupplierReport;
