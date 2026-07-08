import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getTodayDueFull, getOverdueFull } from '../../utils/api';
import { useClientStore } from '../../store/useClientStore';

interface InstallmentDetail {
  plan_id: string;
  customer_id: string;
  customer_name: string;
  customer_urdu: string;
  father_name: string;
  phone: string;
  cnic: string;
  address: string;
  address_urdu: string;
  product_name: string;
  product_name_urdu: string;
  installment_no: number;
  due_date: string;
  amount: number;
  fine: number;
  partial_paid: number;
  paid: boolean;
  paid_date: string;
  paid_count: number;
  total_installments: number;
  remaining: number;
  total_amount: number;
  down_payment: number;
  remaining_amount: number;
}

interface InstallmentDetailTableProps {
  type: 'today-due' | 'overdue';
  isUrdu: boolean;
}

const InstallmentDetailTable: React.FC<InstallmentDetailTableProps> = ({ type, isUrdu }) => {
  const { t } = useTranslation();
  const [data, setData] = useState<InstallmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const tableRef = useRef<HTMLDivElement>(null);
  const clientInfo = useClientStore((s) => s.info);

  const title = type === 'today-due'
    ? (isUrdu ? 'آج کی واجب الادا اقساط' : "Today's Due Installments")
    : (isUrdu ? 'تاخیر شدہ اقساط' : 'Overdue Installments');

  const subtitle = type === 'today-due'
    ? (isUrdu ? 'وہ اقساط جو آج ادا کرنی ہیں' : 'Installments due for payment today')
    : (isUrdu ? 'وہ اقساط جن کی تاریخ گزر چکی ہے' : 'Installments past their due date');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    const fetcher = type === 'today-due' ? getTodayDueFull : getOverdueFull;
    fetcher()
      .then((res: any) => {
        if (cancelled) return;
        const items = Array.isArray(res) ? res : (res?.data ? (Array.isArray(res.data) ? res.data : []) : []);
        setData(items);
      })
      .catch(() => {
        // ✅ OFFLINE FALLBACK: Try to load from IndexedDB cached installments
        if (!cancelled) {
          import('../../db/indexeddb').then(({ offlineDB }) => {
            offlineDB.getCachedInstallments().then(cached => {
              if (cached && cached.length > 0 && !cancelled) {
                const today = new Date().toISOString().split('T')[0];
                let filtered;
                if (type === 'today-due') {
                  filtered = cached.filter((inst: any) => 
                    (inst.due_date === today || inst.dueDate === today) && 
                    (inst.status === 'active' || inst.paid === false || inst.paid === 0)
                  );
                } else {
                  filtered = cached.filter((inst: any) => 
                    (inst.due_date < today || inst.dueDate < today) && 
                    (inst.status === 'active' || inst.paid === false || inst.paid === 0)
                  );
                }
                if (filtered.length > 0) {
                  setData(filtered as any);
                } else {
                  setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
                }
              } else if (!cancelled) {
                setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
              }
            }).catch(() => {
              if (!cancelled) setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
            });
          }).catch(() => {
            if (!cancelled) setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [type, isUrdu]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const rows = data.map((item, idx) => {
      const name = isUrdu ? (item.customer_urdu || item.customer_name || '—') : (item.customer_name || '—');
      const father = item.father_name || '—';
      const phone = item.phone || '—';
      const address = isUrdu ? (item.address_urdu || item.address || '—') : (item.address || '—');
      const product = isUrdu ? (item.product_name_urdu || item.product_name || '—') : (item.product_name || '—');
      const dueDate = item.due_date || '—';
      const status = item.paid
        ? (isUrdu ? 'ادا شدہ' : 'Paid')
        : (item.due_date && new Date(item.due_date) < new Date() ? (isUrdu ? 'تاخیر شدہ' : 'Overdue') : (isUrdu ? 'زیر التوا' : 'Pending'));
      const statusColor = item.paid ? '#059669' : (item.due_date && new Date(item.due_date) < new Date() ? '#dc2626' : '#d97706');
      const installmentDisplay = `${item.installment_no ?? '—'}/${item.total_installments ?? '—'}`;

      return `<tr>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;">${idx + 1}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${name}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${father}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${phone}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${address}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;font-size:11px;white-space:nowrap;">${product}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;">${installmentDisplay}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;font-size:11px;white-space:nowrap;">Rs. ${Number(item.amount || 0).toLocaleString()}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;white-space:nowrap;">${dueDate}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:center;font-size:11px;color:${statusColor};font-weight:600;">${status}</td>
        <td style="border:1px solid #e5e7eb;padding:6px 4px;text-align:right;font-size:11px;">Rs. ${Number(item.fine || 0).toLocaleString()}</td>
      </tr>`;
    }).join('');

    printWindow.document.write(`
      <html>
      <head><title>${title}</title>
      <style>
        @page { size: landscape; margin: 10mm; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 15px; color: #1f2937; }
        h1 { text-align: center; font-size: 18px; font-weight: 700; margin-bottom: 5px; color: #111827; }
        .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #1f2937; color: white; border:1px solid #374151; padding: 8px 4px; font-weight: 600; font-size: 10px; text-align: center; }
        td { border:1px solid #e5e7eb; padding: 6px 4px; }
        .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #9ca3af; }
        .summary { display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 12px; }
        .summary span { background: #f3f4f6; padding: 4px 10px; border-radius: 4px; }
        @media print { body { padding: 10px; } }
      </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="subtitle">${subtitle}</div>
        <div class="summary">
          <span>${isUrdu ? 'کل ریکارڈز' : 'Total Records'}: ${data.length}</span>
          <span>${isUrdu ? 'کل رقم' : 'Total Amount'}: Rs. ${data.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString()}</span>
        </div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>${isUrdu ? 'نام' : 'Name'}</th>
            <th>${isUrdu ? 'والد' : 'Father'}</th>
            <th>${isUrdu ? 'فون' : 'Phone'}</th>
            <th>${isUrdu ? 'پتہ' : 'Address'}</th>
            <th>${isUrdu ? 'پراڈکٹ' : 'Product'}</th>
            <th>${isUrdu ? 'قسط' : 'Inst#'}</th>
            <th>${isUrdu ? 'رقم' : 'Amount'}</th>
            <th>${isUrdu ? 'تاریخ' : 'Due Date'}</th>
            <th>${isUrdu ? 'حالت' : 'Status'}</th>
            <th>${isUrdu ? 'جرمانہ' : 'Fine'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">${clientInfo.name} — ${new Date().toLocaleDateString()}</div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const totalAmount = data.reduce((sum, item) => sum + (item.amount || 0), 0);
  const totalFine = data.reduce((sum, item) => sum + (item.fine || 0), 0);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 sm:p-5 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${type === 'overdue' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
            {type === 'overdue' ? (
              <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">{subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && data.length > 0 && (
            <>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold rounded-full">
                {data.length} {isUrdu ? 'ریکارڈز' : 'records'}
              </span>
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {isUrdu ? 'پرنٹ' : 'Print'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Summary Bar */}
      {!loading && data.length > 0 && (
        <div className="flex flex-wrap gap-3 px-4 sm:px-5 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'کل رقم' : 'Total Amount'}:</span>
            <span className="font-bold text-gray-900 dark:text-white">Rs. {totalAmount.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'کل جرمانہ' : 'Total Fine'}:</span>
            <span className="font-bold text-red-600 dark:text-red-400">Rs. {totalFine.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs">
            <span className="text-gray-500 dark:text-gray-400">{isUrdu ? 'کل وصولی' : 'Grand Total'}:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs. {(totalAmount + totalFine).toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="overflow-x-auto" ref={tableRef}>
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-gray-400 font-medium">
              {isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found'}
            </p>
            <p className="text-xs text-gray-400">
              {type === 'today-due'
                ? (isUrdu ? 'آج کوئی قسط واجب الادا نہیں ہے' : 'No installments due today')
                : (isUrdu ? 'کوئی تاخیر شدہ قسط نہیں ہے' : 'No overdue installments')}
            </p>
          </div>
        ) : (
          <table className="w-full text-xs min-w-[1200px]">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                <th className="px-2 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider w-8">#</th>
                <th className="px-2 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[120px]">
                  {isUrdu ? 'گاہک کا نام' : 'Customer Name'}
                </th>
                <th className="px-2 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                  {isUrdu ? 'والد کا نام' : 'Father Name'}
                </th>
                <th className="px-2 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[90px]">
                  {isUrdu ? 'فون نمبر' : 'Phone'}
                </th>
                <th className="px-2 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[130px]">
                  {isUrdu ? 'پتہ' : 'Address'}
                </th>
                <th className="px-2 py-3 text-start text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[100px]">
                  {isUrdu ? 'پراڈکٹ' : 'Product'}
                </th>
                <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[70px]">
                  {isUrdu ? 'قسط نمبر' : 'Inst#'}
                </th>
                <th className="px-2 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                  {isUrdu ? 'رقم' : 'Amount'}
                </th>
                <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[80px]">
                  {isUrdu ? 'واجب الادا تاریخ' : 'Due Date'}
                </th>
                <th className="px-2 py-3 text-center text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[70px]">
                  {isUrdu ? 'حالت' : 'Status'}
                </th>
                <th className="px-2 py-3 text-end text-[10px] font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap min-w-[70px]">
                  {isUrdu ? 'جرمانہ' : 'Fine'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {data.map((item, idx) => {
                const isOverdue = !item.paid && item.due_date && new Date(item.due_date) < new Date();
                const statusText = item.paid
                  ? (isUrdu ? 'ادا شدہ' : 'Paid')
                  : isOverdue
                    ? (isUrdu ? 'تاخیر شدہ' : 'Overdue')
                    : (isUrdu ? 'زیر التوا' : 'Pending');
                const statusColor = item.paid
                  ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30'
                  : isOverdue
                    ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
                    : 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30';

                return (
                  <tr key={idx} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors ${isOverdue ? 'bg-red-50/30 dark:bg-red-900/10' : ''}`}>
                    <td className="px-2 py-2.5 text-gray-400 font-mono text-[10px] text-center">{idx + 1}</td>
                    <td className="px-2 py-2.5">
                      <div className="font-semibold text-gray-800 dark:text-white text-xs leading-tight">
                        {isUrdu ? (item.customer_urdu || item.customer_name || '—') : (item.customer_name || '—')}
                      </div>
                      {!isUrdu && item.customer_urdu && (
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 leading-tight" dir="rtl">{item.customer_urdu}</div>
                      )}
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-xs text-gray-600 dark:text-gray-300">{item.father_name || '—'}</span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="font-mono text-[10px] text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                        {item.phone || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 leading-tight block max-w-[180px] truncate" title={isUrdu ? (item.address_urdu || item.address) : (item.address || item.address_urdu)}>
                        {isUrdu ? (item.address_urdu || item.address || '—') : (item.address || item.address_urdu || '—')}
                      </span>
                    </td>
                    <td className="px-2 py-2.5">
                      <span className="text-[10px] text-gray-600 dark:text-gray-300">
                        {isUrdu ? (item.product_name_urdu || item.product_name || '—') : (item.product_name || '—')}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                        <span className="text-gray-900 dark:text-white">{item.installment_no ?? '—'}</span>
                        <span className="text-gray-400">/</span>
                        <span className="text-gray-500">{item.total_installments ?? '—'}</span>
                      </span>
                      <div className="text-[9px] text-gray-400 mt-0.5">
                        {isUrdu ? 'ادا:' : 'Paid:'} {item.paid_count ?? 0}
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-end">
                      <span className="font-bold text-gray-800 dark:text-white text-xs whitespace-nowrap">
                        Rs. {Number(item.amount || 0).toLocaleString()}
                      </span>
                      {item.partial_paid > 0 && (
                        <div className="text-[9px] text-amber-500 dark:text-amber-400 mt-0.5">
                          {isUrdu ? 'جزوی ادائیگی:' : 'Partial:'} Rs. {Number(item.partial_paid).toLocaleString()}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded whitespace-nowrap ${
                        isOverdue ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' : 'text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50'
                      }`}>
                        {item.due_date || '—'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          item.paid ? 'bg-emerald-500' : isOverdue ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        {statusText}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-end">
                      <span className={`font-semibold text-xs ${item.fine > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                        Rs. {Number(item.fine || 0).toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default InstallmentDetailTable;