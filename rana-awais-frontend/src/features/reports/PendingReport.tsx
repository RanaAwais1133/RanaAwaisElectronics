import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { APP_CONFIG } from '../../config/app';
import { useAuthStore } from '../../store/useAuthStore';

interface PendingItem {
  customer_id: string;
  customer_name: string;
  customer_name_urdu: string;
  father_name: string;
  phone: string;
  pending_amount: number;
  installment_count: number;
}

const PendingReport: React.FC = () => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);

  const [items, setItems] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [pendingTotal, setPendingTotal] = useState<number>(0);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = `${isUrdu ? 'زیر التواء رپورٹ' : 'Pending Report'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch pending total with customer details
      const res = await api.get('/accounting/pending-total');

      setPendingTotal(res.data.pending_total || 0);

      const customers = res.data.customers;
      let list: PendingItem[] = [];
      if (Array.isArray(customers)) {
        list = customers;
      }

      setItems(list);
    } catch (err) {
      setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load pending data');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    if (!search) return items;
    const q = search.toLowerCase();
    return items.filter(i =>
      (i.customer_name || '').toLowerCase().includes(q) ||
      (i.customer_name_urdu || '').includes(q) ||
      (i.phone || '').includes(q)
    );
  }, [items, search]);

  const totalPendingAmount = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (item.pending_amount || 0), 0);
  }, [filteredItems]);

  const downloadPDF = useCallback(async () => {
    if (!reportRef.current) return;
    setIsGeneratingPDF(true);
    const loadingToast = toast.loading(isUrdu ? 'پی ڈی ایف بنا رہے ہیں...' : 'Generating PDF...');
    try {
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        allowTaint: true,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      let heightLeft = pdfHeight;
      let position = 0;
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`Pending_Report_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.dismiss(loadingToast);
      toast.success(isUrdu ? 'پی ڈی ایف ڈاؤن لوڈ ہو گئی' : 'PDF downloaded successfully');
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(isUrdu ? 'پی ڈی ایف بنانے میں ناکامی' : 'PDF generation failed');
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [reportRef, isUrdu]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = filteredItems.map((item, idx) => `
      <tr>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${isUrdu && item.customer_name_urdu ? item.customer_name_urdu : item.customer_name || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;">${item.phone || '—'}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:center;">${item.installment_count || 0}</td>
        <td style="border:1px solid #e5e7eb;padding:6px;text-align:right;">Rs. ${(item.pending_amount || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    printWindow.document.write(`
      <html>
      <head><title>${isUrdu ? 'زیر التواء رپورٹ' : 'Pending Report'}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1f2937; }
        h1 { text-align: center; font-size: 20px; font-weight: 700; margin-bottom: 5px; color: #111827; }
        .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 20px; }
        .summary { display: flex; justify-content: center; gap: 30px; margin-bottom: 20px; }
        .summary-item { text-align: center; }
        .summary-item .label { font-size: 11px; color: #6b7280; }
        .summary-item .value { font-size: 16px; font-weight: 700; color: #111827; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f3f4f6; border:1px solid #e5e7eb; padding: 8px 6px; font-weight: 600; color: #374151; font-size: 10px; }
        td { border:1px solid #e5e7eb; padding: 6px; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #9ca3af; }
        @media print { body { padding: 15px; } }
      </style>
      </head>
      <body>
        <h1>${APP_CONFIG.companyName}</h1>
        <div class="subtitle">${isUrdu ? 'زیر التواء رپورٹ' : 'Pending Report'} — ${new Date().toLocaleDateString()}</div>
        <div class="summary">
          <div class="summary-item"><div class="label">${isUrdu ? 'کل زیر التواء' : 'Total Pending'}</div><div class="value">Rs. ${pendingTotal.toLocaleString()}</div></div>
          <div class="summary-item"><div class="label">${isUrdu ? 'گاہک' : 'Customers'}</div><div class="value">${filteredItems.length}</div></div>
          <div class="summary-item"><div class="label">${isUrdu ? 'کل بقایا' : 'Due Amount'}</div><div class="value">Rs. ${totalPendingAmount.toLocaleString()}</div></div>
        </div>
        <table>
          <thead><tr>
            <th>#</th><th>${isUrdu ? 'گاہک' : 'Customer'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th>
            <th>${isUrdu ? 'اقساط' : 'Inst.'}</th>
            <th>${isUrdu ? 'بقایا رقم' : 'Pending Amount'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">
          ${isUrdu ? 'رانا اویس آٹوز اور الیکٹرانکس' : 'Rana Awais Autos and Electronics'} — ${isUrdu ? 'پرنٹ کی تاریخ' : 'Print Date'}: ${new Date().toLocaleDateString()} | ${isUrdu ? 'تیار کردہ' : 'Generated By'}: ${currentUser?.displayName || currentUser?.username || '—'}
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
            {isUrdu ? 'زیر التواء رپورٹ' : 'Pending Report'}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {isUrdu ? 'زیر التواء اقساط اور بقایا جات کی رپورٹ' : 'Pending installments and outstanding report'}
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
          <button
            onClick={downloadPDF}
            disabled={isGeneratingPDF || filteredItems.length === 0}
            className="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {isGeneratingPDF ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {isUrdu ? 'بن رہا ہے...' : 'Generating...'}
              </span>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {isUrdu ? 'پی ڈی ایف' : 'PDF'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'کل بقایا رقم' : 'Total Pending'}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            Rs. {pendingTotal.toLocaleString()}
          </p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'گاہک' : 'Customers'}
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{items.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {isUrdu ? 'کل بقایا' : 'Due Amount'}
          </p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
            Rs. {totalPendingAmount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={isUrdu ? 'گاہک، فون تلاش کریں...' : 'Search customer, phone...'}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none transition-colors"
        />
      </div>

      {/* Report Content */}
      <div ref={reportRef} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="hidden print:block text-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{APP_CONFIG.companyName}</h2>
          <p className="text-sm text-gray-500">{isUrdu ? 'زیر التواء رپورٹ' : 'Pending Report'}</p>
          <p className="text-xs text-gray-400">{new Date().toLocaleDateString()}</p>
        </div>

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
            <button onClick={fetchData} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm">
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
            <p className="text-gray-400 font-medium">{isUrdu ? 'کوئی زیر التواء اقساط نہیں' : 'No pending installments found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">#</th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'گاہک' : 'Customer'}
                  </th>
                  <th className="px-4 py-3.5 text-start text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'فون' : 'Phone'}
                  </th>
                  <th className="px-4 py-3.5 text-center text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'اقساط' : 'Inst.'}
                  </th>
                  <th className="px-4 py-3.5 text-end text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {isUrdu ? 'بقایا رقم' : 'Pending Amount'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {filteredItems.map((item, idx) => (
                  <tr key={item.customer_id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                    <td className="px-4 py-3 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-800 dark:text-white">
                        {isUrdu && item.customer_name_urdu ? item.customer_name_urdu : item.customer_name || '—'}
                      </span>
                      {item.father_name && (
                        <div className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {isUrdu ? 'والد: ' : 'F: '}{item.father_name}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">
                        {item.phone || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">
                        {item.installment_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end">
                      <span className="font-bold text-red-600 dark:text-red-400">
                        Rs. {(item.pending_amount || 0).toLocaleString()}
                      </span>
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

export default PendingReport;
