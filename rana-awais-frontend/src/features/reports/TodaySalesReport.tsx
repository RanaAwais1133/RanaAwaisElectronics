import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

const TodaySalesReport: React.FC = () => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore(s => s.user);
  const clientInfo = useClientStore(s => s.info);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = `${isUrdu ? 'آج کی فروخت' : "Today's Sales"} | ${clientInfo.name}`;
  }, [isUrdu, clientInfo.name]);

  useEffect(() => { fetchTodaySales(); }, []);

  const fetchTodaySales = async () => {
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get(`/inventory/sold?start=${today}&end=${today}T23:59:59`);
      const d = res.data;
      let list: any[] = [];
      if (Array.isArray(d)) list = d;
      else if (d?.data && Array.isArray(d.data)) list = d.data;
      setItems(list);
    } catch (err) {
      setError(isUrdu ? 'فروخت کا ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load sales data');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter((i: any) =>
      (i.product_name || '').toLowerCase().includes(q) ||
      (i.product_name_urdu || '').includes(q) ||
      (i.serialNumber || '').toLowerCase().includes(q) ||
      (i.company || '').toLowerCase().includes(q) ||
      (i.model || '').toLowerCase().includes(q)
    );
  }, [items, search]);

  const totalSalesValue = useMemo(() => {
    return filteredItems.reduce((sum: number, i: any) => sum + (i.selling_price || i.sellingPrice || 0), 0);
  }, [filteredItems]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredItems.map((item: any, idx: number) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${isUrdu && item.product_name_urdu ? item.product_name_urdu : item.product_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${item.serialNumber || item.serial_number || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${item.model || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${item.color || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:right;">Rs. ${(item.selling_price || item.sellingPrice || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:right;">Rs. ${(item.purchase_price || item.purchasePrice || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${item.sold_date ? new Date(item.sold_date).toLocaleDateString() : '—'}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
      <head><title>${isUrdu ? 'آج کی فروخت' : "Today's Sales"}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1f2937; }
        h1 { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 5px; color: #111827; }
        .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 20px; }
        .summary { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; }
        .summary-item { text-align: center; }
        .summary-item .label { font-size: 11px; color: #6b7280; }
        .summary-item .value { font-size: 16px; font-weight: 700; color: #111827; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; }
        th { background: #f3f4f6; border:1px solid #e5e7eb; padding: 8px 6px; font-weight: 600; color: #374151; font-size: 11px; }
        td { border:1px solid #e5e7eb; padding: 6px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #9ca3af; }
        @media print { body { padding: 15px; } }
      </style>
      </head>
      <body>
        <h1>${clientInfo.name}</h1>
        <div class="subtitle">${isUrdu ? 'آج کی فروخت' : "Today's Sales"} — ${new Date().toLocaleDateString()}</div>
        <div class="summary">
          <div class="summary-item"><div class="label">${isUrdu ? 'کل آئٹمز' : 'Total Items'}</div><div class="value">${filteredItems.length}</div></div>
          <div class="summary-item"><div class="label">${isUrdu ? 'کل فروخت' : 'Total Sales'}</div><div class="value">Rs. ${totalSalesValue.toLocaleString()}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>${isUrdu ? 'پروڈکٹ' : 'Product'}</th>
            <th>${isUrdu ? 'سیریل' : 'Serial'}</th>
            <th>${isUrdu ? 'ماڈل' : 'Model'}</th>
            <th>${isUrdu ? 'رنگ' : 'Color'}</th>
            <th>${isUrdu ? 'فروخت قیمت' : 'Sale Price'}</th>
            <th>${isUrdu ? 'خرید قیمت' : 'Cost'}</th>
            <th>${isUrdu ? 'تاریخ' : 'Date'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          ${isUrdu ? (clientInfo.nameUr || clientInfo.name) : clientInfo.name} — ${isUrdu ? 'پرنٹ کی تاریخ' : 'Print Date'}: ${new Date().toLocaleDateString()} | ${isUrdu ? 'تیار کردہ' : 'Generated By'}: ${currentUser?.displayName || currentUser?.username || '—'}
        </div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            {isUrdu ? 'آج کی فروخت' : "Today's Sales"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString()} — {filteredItems.length} {isUrdu ? 'آئٹمز' : 'items'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrint}
            disabled={filteredItems.length === 0}
            className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {isUrdu ? 'پرنٹ کریں' : 'Print'}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'آج فروخت شدہ' : 'Sold Today'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{filteredItems.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'کل فروخت' : 'Total Sales'}
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Rs. {totalSalesValue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'تاریخ' : 'Date'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={isUrdu ? 'پروڈکٹ، سیریل، کمپنی تلاش کریں...' : 'Search product, serial, company...'}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Report Content */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
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
            <button onClick={fetchTodaySales} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm">
              {isUrdu ? 'دوبارہ کوشش کریں' : 'Retry'}
            </button>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">{isUrdu ? 'آج کوئی فروخت نہیں' : 'No sales today'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'پروڈکٹ' : 'Product'}
                  </th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'سیریل' : 'Serial'}</th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'ماڈل' : 'Model'}</th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'رنگ' : 'Color'}</th>
                  <th className="px-4 py-3.5 text-end text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'فروخت قیمت' : 'Sale Price'}</th>
                  <th className="px-4 py-3.5 text-end text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'خرید قیمت' : 'Cost'}</th>
                  <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">{isUrdu ? 'تاریخ' : 'Date'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredItems.map((item: any, idx: number) => (
                  <tr key={item.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {isUrdu && item.product_name_urdu ? item.product_name_urdu : item.product_name || '—'}
                      </span>
                      {item.company && <span className="text-xs text-gray-400 block">{item.company}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{item.serialNumber || item.serial_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.model || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.color || '—'}</td>
                    <td className="px-4 py-3 text-end font-semibold text-gray-800 dark:text-white">Rs. {(item.selling_price || item.sellingPrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-end text-xs text-gray-500">Rs. {(item.purchase_price || item.purchasePrice || 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-center text-xs text-gray-500">
                      {item.sold_date ? new Date(item.sold_date).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaySalesReport;