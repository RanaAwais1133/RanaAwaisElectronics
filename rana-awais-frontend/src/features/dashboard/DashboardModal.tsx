import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { formatPhone } from '../../utils/helpers';

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
    setError('');
    api.get(endpoint)
      .then(res => {
        // Handle different response structures:
        // 1. res.data.data (paginated responses)
        // 2. res.data (array directly)
        // 3. res.data (object with records/data field)
        const d = res.data;
        let items: any[] = [];

        if (Array.isArray(d)) {
          items = d;
        } else if (d?.data && Array.isArray(d.data)) {
          items = d.data;
        } else if (d?.records && Array.isArray(d.records)) {
          items = d.records;
        } else if (d?.results && Array.isArray(d.results)) {
          items = d.results;
        } else if (d?.items && Array.isArray(d.items)) {
          items = d.items;
        } else if (d?.installments && Array.isArray(d.installments)) {
          items = d.installments;
        } else if (d?.payments && Array.isArray(d.payments)) {
          items = d.payments;
        } else if (d?.customers && Array.isArray(d.customers)) {
          items = d.customers;
        } else if (d?.products && Array.isArray(d.products)) {
          items = d.products;
        } else if (d?.inventory && Array.isArray(d.inventory)) {
          items = d.inventory;
        } else if (typeof d === 'object' && d !== null) {
          // Try to find any array field in the response
          const arrayField = Object.values(d).find(v => Array.isArray(v));
          if (arrayField) {
            items = arrayField as any[];
          }
        }

        setData(items);
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
      const name = isUrdu ? item.customer_urdu || item.customer_name || item.name || item.product_name || item.item_name : item.customer_name || item.name || item.product_name || item.item_name;
      const phone = item.phone || item.customer_phone || '—';
      const amount = item.amount || item.total || item.pending_amount || item.price || item.purchase_price || 0;
      const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString() : item.date || item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';
      
      return `<tr>
        <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;">${name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;">${phone}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;text-align:right;">Rs. ${Number(amount).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:8px;text-align:center;">${dueDate}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
      <head><title>${title}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1f2937; }
        h1 { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 20px; color: #111827; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th { background: #f3f4f6; border:1px solid #e5e7eb; padding: 10px 8px; font-weight: 600; color: #374151; }
        td { border:1px solid #e5e7eb; padding: 8px; }
        .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #9ca3af; }
        @media print { body { padding: 15px; } }
      </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table><thead><tr>
          <th>#</th><th>${isUrdu ? 'نام' : 'Name'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th>
          <th>${isUrdu ? 'رقم' : 'Amount'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th>
        </tr></thead><tbody>${rows}</tbody></table>
        <div class="footer">${isUrdu ? 'رانا عويس الیکٹرانکس' : 'Rana Awais Electronics'} — ${new Date().toLocaleDateString()}</div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">{title}</h2>
            {!loading && (
              <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold rounded-full">
                {data.length} {isUrdu ? 'ریکارڈز' : 'records'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {data.length > 0 && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {isUrdu ? 'پرنٹ کریں' : 'Print'}
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
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-full">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">
                {isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {isUrdu ? 'نام' : 'Name'}
                    </th>
                    <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {isUrdu ? 'فون' : 'Phone'}
                    </th>
                    <th className="px-4 py-3.5 text-end text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {isUrdu ? 'رقم' : 'Amount'}
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {isUrdu ? 'تاریخ' : 'Date'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {data.map((item: any, idx: number) => {
                    const name = isUrdu ? item.customer_urdu || item.customer_name || item.name || item.product_name || item.item_name : item.customer_name || item.name || item.product_name || item.item_name;
                    const phone = item.phone || item.customer_phone || '—';
                    const amount = item.amount || item.total || item.pending_amount || item.price || item.purchase_price || 0;
                    const dueDate = item.due_date ? new Date(item.due_date).toLocaleDateString() : item.date || item.created_at ? new Date(item.created_at).toLocaleDateString() : '—';
                    
                    return (
                      <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                        <td className="px-4 py-3.5 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                        <td className="px-4 py-3.5">
                          <div className="font-semibold text-gray-800 dark:text-white">
                            {name || '—'}
                          </div>
                          {item.father_name && (
                            <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                              {isUrdu ? 'والد: ' : 'Father: '}{item.father_name}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">
                            {phone !== '—' ? formatPhone(phone) : '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-end">
                          <span className="font-bold text-gray-800 dark:text-white">
                            Rs. {Number(amount).toLocaleString()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">
                            {dueDate}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
