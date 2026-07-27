import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useSupplierStore, SupplierPromise } from '../../store/useSupplierStore';
import api from '../../utils/api';

interface Props {
  onClose: () => void;
  onViewSupplier?: (supplierId: string) => void;
}

const SupplierReminders: React.FC<Props> = ({ onClose, onViewSupplier }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const { suppliers, promises, fetchPromises, fetchSuppliers } = useSupplierStore();
  const [payLoading, setPayLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchPromises();
    fetchSuppliers();
  }, [fetchPromises, fetchSuppliers]);

  const supplierMap = new Map(suppliers.map(s => [s.id, s]));

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const overdue: SupplierPromise[] = [];
  const dueToday: SupplierPromise[] = [];
  const upcoming: SupplierPromise[] = [];

  for (const pr of promises) {
    if (pr.status === 'paid') continue;
    const due = new Date(pr.dueDate);
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const diffDays = Math.floor((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      overdue.push(pr);
    } else if (diffDays === 0) {
      dueToday.push(pr);
    } else if (diffDays <= 7) {
      upcoming.push(pr);
    }
  }

  // Sort: oldest first
  overdue.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  dueToday.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  upcoming.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const formatDate = (d: string) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString();
    } catch { return '-'; }
  };

  const handlePayNow = async (pr: SupplierPromise) => {
    if (payLoading) return;
    setPayLoading(pr.id);
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
      await api.put(`/supplier-promises/${pr.id}`, { status: 'paid', paidAmount: pr.amount });
      toast.success(isUrdu ? 'ادائیگی کامیاب' : 'Payment successful');
      fetchPromises();
    } catch (err: any) {
      const msg = err?.response?.data?.error || (isUrdu ? 'ناکام' : 'Failed');
      toast.error(msg);
    }
    finally { setPayLoading(null); }
  };

  const totalOverdue = overdue.reduce((s, p) => s + (p.amount - p.paidAmount), 0);
  const totalDueToday = dueToday.reduce((s, p) => s + (p.amount - p.paidAmount), 0);
  const totalUpcoming = upcoming.reduce((s, p) => s + (p.amount - p.paidAmount), 0);
  const grandTotal = totalOverdue + totalDueToday + totalUpcoming;

  const renderTable = (list: SupplierPromise[], label: string, color: string, total: number) => (
    <div className="mb-4">
      <div className={`flex justify-between items-center mb-2`}>
        <h4 className={`text-sm font-bold ${color}`}>{label} ({list.length})</h4>
        <span className={`text-xs font-bold ${color}`}>Rs. {total.toLocaleString()}</span>
      </div>
      {list.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-3">{isUrdu ? 'کوئی نہیں' : 'None'}</p>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 uppercase">
              <tr>
                <th className="px-2 py-1.5 text-start">{isUrdu ? 'سپلائر' : 'Supplier'}</th>
                <th className="px-2 py-1.5 text-start">{isUrdu ? 'تاریخ' : 'Due Date'}</th>
                <th className="px-2 py-1.5 text-end">{isUrdu ? 'رقم' : 'Amount'}</th>
                <th className="px-2 py-1.5 text-center">{isUrdu ? 'ایکشن' : 'Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
              {list.map(pr => {
                const sup = supplierMap.get(pr.supplierId);
                return (
                  <tr key={pr.id} className="hover:bg-blue-50/30">
                    <td className="px-2 py-1.5 font-medium whitespace-nowrap">
                      {sup ? sup.name : pr.supplierId.slice(0, 8)}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">{formatDate(pr.dueDate)}</td>
                    <td className="px-2 py-1.5 text-end whitespace-nowrap">Rs. {(pr.amount - pr.paidAmount).toLocaleString()}</td>
                    <td className="px-2 py-1.5 text-center">
                      <button
                        onClick={() => handlePayNow(pr)}
                        disabled={payLoading === pr.id}
                        className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded text-xs"
                      >
                        {payLoading === pr.id ? '...' : isUrdu ? 'ادا کریں' : 'Pay'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-5 py-3 border-b rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{isUrdu ? 'ادائیگی کی یاد دہانی' : 'Payment Reminders'}</h2>
            <p className="text-xs text-gray-500">
              {isUrdu ? 'کل بقایا' : 'Total Pending'}: Rs. {grandTotal.toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-xl">&times;</button>
        </div>

        <div className="p-5 space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-red-500">{isUrdu ? 'زیر التواء' : 'Overdue'}</p>
              <p className="text-lg font-bold text-red-600">Rs. {totalOverdue.toLocaleString()}</p>
              <p className="text-xs text-red-400">{overdue.length} {isUrdu ? 'وعدے' : 'promises'}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-500">{isUrdu ? 'آج کی' : "Today's"}</p>
              <p className="text-lg font-bold text-amber-600">Rs. {totalDueToday.toLocaleString()}</p>
              <p className="text-xs text-amber-400">{dueToday.length} {isUrdu ? 'وعدے' : 'promises'}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-500">{isUrdu ? 'آنے والے' : 'Upcoming (7 days)'}</p>
              <p className="text-lg font-bold text-blue-600">Rs. {totalUpcoming.toLocaleString()}</p>
              <p className="text-xs text-blue-400">{upcoming.length} {isUrdu ? 'وعدے' : 'promises'}</p>
            </div>
          </div>

          {/* Overdue */}
          <div className="border-l-4 border-red-500 pl-3">
            {renderTable(overdue, isUrdu ? 'زیر التواء وعدے' : 'Overdue Promises', 'text-red-600', totalOverdue)}
          </div>

          {/* Today */}
          <div className="border-l-4 border-amber-500 pl-3">
            {renderTable(dueToday, isUrdu ? 'آج کے وعدے' : "Today's Promises", 'text-amber-600', totalDueToday)}
          </div>

          {/* Upcoming */}
          <div className="border-l-4 border-blue-500 pl-3">
            {renderTable(upcoming, isUrdu ? 'آنے والے وعدے (7 دن)' : 'Upcoming Promises (7 days)', 'text-blue-600', totalUpcoming)}
          </div>

          <div className="text-center pt-2">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium">
              {isUrdu ? 'بند کریں' : 'Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierReminders;