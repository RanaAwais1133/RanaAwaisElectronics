import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSupplierStore } from '../../store/useSupplierStore';
import api from '../../utils/api';

interface Props {
  supplierId: string;
  onClose: () => void;
}

interface LedgerEntry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  type: string;
  refId: string;
}

const SupplierLedger: React.FC<Props> = ({ supplierId, onClose }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const { suppliers, fetchLedger } = useSupplierStore();
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supplier = suppliers.find(s => s.id === supplierId);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchLedger(supplierId);
      if (data) {
        setEntries(data.entries || []);
        setSummary(data.summary);
      }
      setLoading(false);
    };
    if (supplierId) load();
  }, [supplierId, fetchLedger]);

  const formatDate = (d: string) => {
    if (!d) return '-';
    try {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString();
    } catch { return '-'; }
  };

  const formatRs = (n: number) => {
    if (n == null) return '0';
    return n.toLocaleString();
  };

  if (!supplier) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-5xl max-h-[95vh] overflow-y-auto mx-2" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 flex justify-between items-center px-5 py-3 border-b rounded-t-3xl z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{isUrdu ? 'لیجر' : 'Ledger'} — {supplier.name}</h2>
            <p className="text-xs text-gray-500">{supplier.phone} {supplier.company ? `| ${supplier.company}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-xl">&times;</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Summary Cards */}
          {summary && (
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{isUrdu ? 'کل خریداری' : 'Total Purchased'}</p>
                <p className="text-lg font-bold text-blue-600">Rs. {formatRs(summary.totalPurchased)}</p>
              </div>
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{isUrdu ? 'کل ادائیگی' : 'Total Paid'}</p>
                <p className="text-lg font-bold text-emerald-600">Rs. {formatRs(summary.totalPaid)}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${summary.totalRemaining > 0 ? 'bg-red-50 dark:bg-red-900/20' : 'bg-gray-50 dark:bg-gray-700/30'}`}>
                <p className="text-xs text-gray-500">{isUrdu ? 'بقایا' : 'Remaining'}</p>
                <p className={`text-lg font-bold ${summary.totalRemaining > 0 ? 'text-red-600' : 'text-gray-600'}`}>Rs. {formatRs(summary.totalRemaining)}</p>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{isUrdu ? 'زیر التواء وعدے' : 'Pending Promises'}</p>
                <p className="text-lg font-bold text-amber-600">Rs. {formatRs(summary.pendingPromises)}</p>
              </div>
            </div>
          )}

          {/* Ledger Table */}
          <div>
            <h3 className="text-sm font-bold mb-2 text-gray-700 dark:text-gray-200">
              {isUrdu ? 'لیجر اندراجات' : 'Ledger Entries'}
              <span className="text-xs font-normal text-gray-400 ml-2">({entries.length} {isUrdu ? 'اندراجات' : 'entries'})</span>
            </h3>
            <div className="overflow-x-auto border rounded-xl">
              <table className="w-full text-xs min-w-[600px]">
                <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase">
                  <tr>
                    <th className="px-3 py-2.5 text-start">#</th>
                    <th className="px-3 py-2.5 text-start">{isUrdu ? 'تاریخ' : 'Date'}</th>
                    <th className="px-3 py-2.5 text-start">{isUrdu ? 'تفصیل' : 'Description'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'ڈیبٹ' : 'Debit (Purchase)'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'کریڈٹ' : 'Credit (Payment)'}</th>
                    <th className="px-3 py-2.5 text-end">{isUrdu ? 'بقیہ' : 'Balance'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50 bg-white dark:bg-gray-800">
                  {loading ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</td></tr>
                  ) : entries.length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-6 text-center text-gray-400">{isUrdu ? 'کوئی اندراجات نہیں' : 'No entries'}</td></tr>
                  ) : entries.map((e, i) => (
                    <tr key={i} className={`hover:bg-blue-50/30 ${e.type === 'purchase' ? '' : 'bg-emerald-50/20'}`}>
                      <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${e.type === 'purchase' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'} mr-1`}>
                          {e.type === 'purchase' ? (isUrdu ? 'خریداری' : 'PUR') : (isUrdu ? 'ادائیگی' : 'PAY')}
                        </span>
                        {e.description}
                      </td>
                      <td className="px-3 py-2 text-end text-red-600 font-medium">{e.debit > 0 ? `Rs. ${formatRs(e.debit)}` : '-'}</td>
                      <td className="px-3 py-2 text-end text-emerald-600 font-medium">{e.credit > 0 ? `Rs. ${formatRs(e.credit)}` : '-'}</td>
                      <td className={`px-3 py-2 text-end font-bold ${e.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        Rs. {formatRs(e.balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-400">
            <button onClick={onClose} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-medium">{isUrdu ? 'بند کریں' : 'Close'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierLedger;