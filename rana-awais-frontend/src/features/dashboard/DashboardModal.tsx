import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { formatPhone, formatCNIC } from '../../utils/helpers';
import toast from 'react-hot-toast';

interface DashboardModalProps {
  title: string;
  endpoint: string;
  onClose: () => void;
  isUrdu: boolean;
}

const DashboardModal: React.FC<DashboardModalProps> = ({ title, endpoint, onClose, isUrdu }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.get(endpoint)
      .then(res => {
        const d = res.data?.data || res.data || [];
        setData(Array.isArray(d) ? d : []);
      })
      .catch(() => {
        setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
      })
      .finally(() => setLoading(false));
  }, [endpoint, isUrdu]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = data.map((item: any, idx: number) => {
      const name = isUrdu ? item.customer_urdu || item.customer_name || item.name : item.customer_name || item.name;
      const phone = item.phone || '—';
      const amount = item.amount || item.total || 0;
      const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString() : '—';
      
      return `<tr>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${name}</td>
        <td style="border:1px solid #ccc;padding:6px;">${phone}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">Rs. ${Number(amount).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;">${dueDate}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
      <head><title>${title}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; font-size: 18px; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f0f0f0; border:1px solid #ccc; padding: 7px; }
        td { border:1px solid #ccc; padding: 6px; }
        @media print { body { padding: 10px; } }
      </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table><thead><tr>
          <th>#</th><th>${isUrdu ? 'نام' : 'Name'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th>
          <th>${isUrdu ? 'رقم' : 'Amount'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
          <div className="flex gap-2">
            {data.length > 0 && (
              <button
                onClick={handlePrint}
                className="px-3 py-1.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                🖨️ {isUrdu ? 'پرنٹ کریں' : 'Print'}
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <p className="text-red-500 text-center py-10">{error}</p>
          ) : data.length === 0 ? (
            <p className="text-gray-400 text-center py-10">
              {isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700">
                    <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">#</th>
                    <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">
                      {isUrdu ? 'نام' : 'Name'}
                    </th>
                    <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">
                      {isUrdu ? 'فون' : 'Phone'}
                    </th>
                    <th className="px-4 py-3 text-end text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">
                      {isUrdu ? 'رقم' : 'Amount'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase">
                      {isUrdu ? 'تاریخ' : 'Date'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {data.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-blue-50/30 dark:hover:bg-blue-900/10">
                      <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white">
                        {isUrdu ? item.customer_urdu || item.customer_name || item.name : item.customer_name || item.name}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-300">
                        {item.phone ? formatPhone(item.phone) : '—'}
                      </td>
                      <td className="px-4 py-3 text-end font-semibold text-gray-800 dark:text-white">
                        Rs. {Number(item.amount || item.total || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">
                        {item.due_date ? new Date(item.due_date).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardModal;
