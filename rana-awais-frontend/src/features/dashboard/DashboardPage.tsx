/* eslint-disable unicode-bom */
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { Link } from 'react-router-dom';
import { formatPhone, formatCNIC } from '../../utils/helpers';
import { useAuthStore } from '../../store/useAuthStore';

interface UpcomingInstallment {
  id: string;
  customer_name: string;
  customer_urdu: string;
  father_name: string;
  phone: string;
  cnic?: string;
  address?: string;
  address_urdu?: string;
  product_name: string;
  installment_no: number;
  due_date: string;
  amount: number;
  paid: boolean;
  partial_paid?: number;
  paid_date?: string;
  paidDate?: string;
}

const DAYS = { daily: 1, weekly: 7, monthly: 30 };

// Helper function to fix potentially corrupted Urdu text
const fixUrduText = (text: string | undefined): string => {
  if (!text) return '—';
  return text;
};

const DashboardPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const [data, setData] = useState<Record<string, UpcomingInstallment[]>>({
    daily: [],
    weekly: [],
    monthly: [],
  });
  const [loading, setLoading] = useState(true);
  const [printingFullDetail, setPrintingFullDetail] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all(
      Object.entries(DAYS).map(([key, days]) =>
        api.get(`/installments/upcoming?days=${days}`)
          .then(res => ({ key, data: res.data || [] }))
          .catch(() => ({ key, data: [] }))
      )
    )
      .then(results => {
        const newData: any = { daily: [], weekly: [], monthly: [] };
        results.forEach(({ key, data }) => { newData[key] = data; });
        setData(newData);
      })
      .finally(() => setLoading(false));
  }, []);

  const summary = useMemo(() => {
    const compute = (list: UpcomingInstallment[]) => {
      const total = list.reduce((sum, i) => sum + i.amount, 0);
      const paid = list.filter(i => i.paid).reduce((sum, i) => sum + i.amount, 0);
      const pending = total - paid;
      const percent = total > 0 ? Math.round((paid / total) * 100) : 0;
      return { count: list.length, total, paid, pending, percent };
    };
    return {
      daily: compute(data.daily),
      weekly: compute(data.weekly),
      monthly: compute(data.monthly),
    };
  }, [data]);

  const isUrdu = i18n.language === 'ur';
  const today = new Date().toISOString().split('T')[0];

  const isMissed = (dueDate: string, paid: boolean) => {
    if (paid) return false;
    return dueDate < today;
  };

  const renderTable = (list: UpcomingInstallment[], titleKey: string) => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-100">
        {t(titleKey)}
      </h3>
      {list.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-500 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-400 dark:text-gray-500 text-sm">{t('no_due_installments')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm bg-white dark:bg-gray-800 touch-pan-x" style={{ WebkitOverflowScrolling: 'touch', overscrollBehaviorX: 'contain' }}>
          <div className="min-w-[1100px]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-gray-50 to-gray-100 dark:bg-white dark:text-gray-900 uppercase text-xs tracking-wider">
                  <th className="sticky left-0 z-10 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-white dark:to-white px-4 py-3.5 text-start font-semibold text-gray-500 dark:text-gray-900 min-w-[130px]">{t('customer')}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('father_name') || 'Father Name'}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('phone')}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('cnic') || 'CNIC'}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('address') || 'Address'}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('product')}</th>
                  <th className="px-4 py-3.5 text-start font-semibold">#</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('due_date')}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('amount')}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('paid_amount') || 'Paid Amt'}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('remaining') || 'Remaining'}</th>
                  <th className="px-4 py-3.5 text-start font-semibold whitespace-nowrap">{t('status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {list.map((item, idx) => {
                  const missed = isMissed(item.due_date, item.paid);
                  return (
                    <tr
                      key={idx}
                      className={`hover:bg-blue-50/30 dark:hover:bg-blue-900/10 active:bg-blue-100 dark:active:bg-blue-900/20 transition-all duration-150 cursor-default ${
                        missed ? 'bg-red-50 dark:bg-red-900/10' : ''
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-4 py-3.5 font-medium text-gray-800 dark:text-gray-100 whitespace-nowrap min-w-[130px]">
                        {isUrdu ? (item.customer_urdu || item.customer_name) : item.customer_name}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {item.father_name || '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 numeric-cell whitespace-nowrap">
                        {formatPhone(item.phone)}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap font-mono text-xs">
                        {item.cnic ? formatCNIC(item.cnic) : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs max-w-[160px] truncate" title={isUrdu ? (item.address_urdu || item.address) : item.address}>
                        {isUrdu ? (item.address_urdu || item.address || '—') : (item.address || '—')}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                        {item.product_name}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 font-mono">
                        {item.installment_no}
                      </td>
                      <td className="px-4 py-3.5 text-gray-600 dark:text-gray-300 whitespace-nowrap text-xs">
                        {(() => { const d = new Date(item.due_date); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}
                      </td>
                      <td className="px-4 py-3.5 font-semibold numeric-cell text-gray-800 dark:text-gray-100 whitespace-nowrap">
                        Rs. {(item.amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5 font-semibold numeric-cell text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        {item.paid || (item.partial_paid && item.partial_paid > 0) ? 'Rs. ' + ((item.partial_paid || item.amount) || 0).toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3.5 font-semibold numeric-cell text-rose-600 dark:text-rose-400 whitespace-nowrap">
                        Rs. {((item.paid ? 0 : (item.amount || 0) - (item.partial_paid || 0)) || (item.amount || 0)).toFixed(2)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold min-h-[28px] ${
                          item.paid
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : item.partial_paid && item.partial_paid > 0
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : missed
                                ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300 ring-2 ring-red-400'
                                : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                          {item.paid ? '✓ ' + t('paid') : item.partial_paid && item.partial_paid > 0 ? (isUrdu ? 'جزوی' : 'Partial') : missed ? '⚠ ' + (isUrdu ? 'منتظر' : 'Missed') : '○ ' + t('pending')}
                        </span>
                       </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );

  const handlePrintCollection = (period: 'daily' | 'weekly' | 'monthly') => {
    const list = data[period];
    if (list.length === 0) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const titleMap = { daily: isUrdu ? 'یومیہ وصولی' : 'Daily Collection', weekly: isUrdu ? 'ہفتہ وار وصولی' : 'Weekly Collection', monthly: isUrdu ? 'ماہانہ وصولی' : 'Monthly Collection' };
    const dateStr = new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { year: 'numeric', month: 'long', day: 'numeric' });
    
    let rows = '';
    list.forEach((item, idx) => {
      const name = isUrdu ? item.customer_urdu || item.customer_name : item.customer_name;
      const addr = isUrdu ? item.address_urdu || item.address || '—' : item.address || '—';
      rows += `<tr>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;">${idx + 1}</td>
        <td style="border:1px solid #ccc;padding:6px;">${name}</td>
        <td style="border:1px solid #ccc;padding:6px;">${item.father_name || '—'}</td>
        <td style="border:1px solid #ccc;padding:6px;">${item.cnic ? formatCNIC(item.cnic) : '—'}</td>
        <td style="border:1px solid #ccc;padding:6px;">${addr}</td>
        <td style="border:1px solid #ccc;padding:6px;">${formatPhone(item.phone)}</td>
        <td style="border:1px solid #ccc;padding:6px;">${item.product_name || '—'}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;">${item.installment_no}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:right;">Rs. ${(item.amount || 0).toFixed(2)}</td>
        <td style="border:1px solid #ccc;padding:6px;text-align:center;width:80px;">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
       </tr>`;
    });
    
    printWindow.document.write(`
      <html dir="${isUrdu ? 'rtl' : 'ltr'}">
      <head><meta charset="UTF-8"><title>${titleMap[period]}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; font-size: 18px; margin-bottom: 5px; }
        .date { text-align: center; font-size: 12px; color: #666; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f0f0f0; border:1px solid #ccc; padding: 7px; text-align: center; font-size: 11px; }
        td { font-size: 11px; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 15px; }
        @media print { body { padding: 10px; } }
      </style>
      </head>
      <body>
        <h1>${titleMap[period]}</h1>
        <div class="date">${dateStr}</div>
        <table>
          <thead><tr>
            <th>#</th>
            <th>${isUrdu ? 'نام' : 'Name'}</th>
            <th>${isUrdu ? 'والد کا نام' : 'Father Name'}</th>
            <th>${isUrdu ? 'شناختی نمبر' : 'CNIC'}</th>
            <th>${isUrdu ? 'پتہ' : 'Address'}</th>
            <th>${isUrdu ? 'فون' : 'Phone'}</th>
            <th>${isUrdu ? 'پراڈکٹ' : 'Product'}</th>
            <th>${isUrdu ? 'قسط' : 'Inst#'}</th>
            <th>${isUrdu ? 'رقم' : 'Amount'}</th>
            <th>${isUrdu ? 'دستخط/ٹک' : 'Sign/Tick'}</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div class="footer">Rana Awais Electronics — ${titleMap[period]}</div>
        <script>window.print();window.close();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const handlePrintFullDetail = async (period: 'daily' | 'weekly' | 'monthly') => {
    setPrintingFullDetail(period);
    const days = DAYS[period];
    try {
      const res = await api.get(`/installments/detailed-report?days=${days}`);
      const plans = res.data || [];
      if (plans.length === 0) return;

      const printWindow = window.open('', '_blank');
      if (!printWindow) return;

      const titleMap = { daily: isUrdu ? 'یومیہ مکمل رپورٹ' : 'Daily Full Detail Report', weekly: isUrdu ? 'ہفتہ وار مکمل رپورٹ' : 'Weekly Full Detail Report', monthly: isUrdu ? 'ماہانہ مکمل رپورٹ' : 'Monthly Full Detail Report' };
      const dateStr = new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { year: 'numeric', month: 'long', day: 'numeric' });

      const formatDate = (d: string) => {
        if (!d) return '—';
        const date = new Date(d);
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
      };

      const fmtPhone = (p: string) => p ? formatPhone(p) : '—';
      const fmtCNIC = (c: string) => c ? formatCNIC(c) : '—';

      const L = (en: string, ur: string) => isUrdu ? ur : en;

      let allReceipts = '';
      plans.forEach((plan: any) => {
        const custName = isUrdu ? (plan.customer_urdu || plan.customer_name) : (plan.customer_name || plan.customer_urdu);
        const fatherName = plan.father_name || '—';
        const phone = fmtPhone(plan.phone);
        const cnic = fmtCNIC(plan.cnic);
        const addr = isUrdu ? (plan.address_urdu || plan.address || '—') : (plan.address || plan.address_urdu || '—');
        const prodName = isUrdu ? (plan.product_name_urdu || plan.product_name) : (plan.product_name || plan.product_name_urdu);
        const downPay = plan.down_payment || 0;
        const totalAmt = plan.total_amount || 0;
        const remaining = plan.remaining_amount || 0;
        const numInst = plan.num_installments || plan.installments?.length || 0;
        const paidCount = (plan.installments || []).filter((i: any) => i.paid === true).length;
        // Calculate paid installments total (NOT including down payment)
        const instTotalPaid = (plan.installments || [])
          .filter((i: any) => i.paid === true)
          .reduce((sum: number, i: any) => sum + (i.amount || 0), 0);
        const totalPaid = instTotalPaid; // Only paid installments, NOT including down payment
        const actualRemaining = totalAmt - downPay - instTotalPaid;

        const nextDueInst = (plan.installments || []).find((i: any) => !i.paid);
        const nextInstNo = nextDueInst?.installment_no || nextDueInst?.installmentNo || 0;
        const nextInstAmt = nextDueInst?.amount || 0;
        const nextInstDate = nextDueInst?.due_date ? formatDate(nextDueInst.due_date) : '—';

        let guarantor1Html = '';
        let guarantor2Html = '';
        const guarantors = plan.guarantors || [];
        if (guarantors.length >= 1) {
          const g = guarantors[0];
          const gName = isUrdu ? (g.name_urdu || g.name) : (g.name || g.name_urdu);
          const gFather = isUrdu ? (g.father_name_urdu || g.father_name || '—') : (g.father_name || g.father_name_urdu || '—');
          const gPhone = fmtPhone(g.phone);
          const gCnic = fmtCNIC(g.cnic);
          const gAddr = isUrdu ? (g.address_urdu || g.address || '—') : (g.address || g.address_urdu || '—');
          const gRelation = g.relation || '';
          guarantor1Html = `
            <div style="flex:1;border:1.5px solid #000;padding:5px 8px;font-size:11px;">
              <p style="font-weight:bold;font-size:10px;margin:0 0 3px 0;color:#000;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:2px;">${L('GUARANTOR 1', 'ضامن 1')}</p>
              <p style="font-weight:bold;font-size:14px;margin:0 0 2px 0;color:#000;">${gName}</p>
              <p style="font-size:11px;margin:0 0 2px 0;color:#000;font-weight:bold;">${L('S/O:', 'والد:')} ${gFather}</p>
              <p style="font-size:11px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Contact:', 'رابطہ:')} <span dir="ltr">${gPhone}</span></p>
              ${g.cnic ? `<p style="font-size:11px;margin:0 0 1px 0;color:#000;font-weight:bold;">CNIC: <span dir="ltr">${gCnic}</span></p>` : ''}
              ${gRelation ? `<p style="font-size:11px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Relation:', 'رشتہ:')} ${gRelation}</p>` : ''}
              <p style="font-size:11px;margin:0;color:#000;font-weight:bold;" dir="${isUrdu ? 'rtl' : 'ltr'}">${gAddr}</p>
            </div>`;
        }
        if (guarantors.length >= 2) {
          const g = guarantors[1];
          const gName = isUrdu ? (g.name_urdu || g.name) : (g.name || g.name_urdu);
          const gFather = isUrdu ? (g.father_name_urdu || g.father_name || '—') : (g.father_name || g.father_name_urdu || '—');
          const gPhone = fmtPhone(g.phone);
          const gCnic = fmtCNIC(g.cnic);
          const gAddr = isUrdu ? (g.address_urdu || g.address || '—') : (g.address || g.address_urdu || '—');
          const gRelation = g.relation || '';
          guarantor2Html = `
            <div style="flex:1;border:1.5px solid #000;padding:5px 8px;font-size:11px;">
              <p style="font-weight:bold;font-size:10px;margin:0 0 3px 0;color:#000;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:2px;">${L('GUARANTOR 2', 'ضامن 2')}</p>
              <p style="font-weight:bold;font-size:14px;margin:0 0 2px 0;color:#000;">${gName}</p>
              <p style="font-size:11px;margin:0 0 2px 0;color:#000;font-weight:bold;">${L('S/O:', 'والد:')} ${gFather}</p>
              <p style="font-size:11px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Contact:', 'رابطہ:')} <span dir="ltr">${gPhone}</span></p>
              ${g.cnic ? `<p style="font-size:11px;margin:0 0 1px 0;color:#000;font-weight:bold;">CNIC: <span dir="ltr">${gCnic}</span></p>` : ''}
              ${gRelation ? `<p style="font-size:11px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Relation:', 'رشتہ:')} ${gRelation}</p>` : ''}
              <p style="font-size:11px;margin:0;color:#000;font-weight:bold;" dir="${isUrdu ? 'rtl' : 'ltr'}">${gAddr}</p>
            </div>`;
        }

        const paymentMap: Record<number, { date: string; amount: number; method: string; rawDate: string }> = {};
        
        (plan.installments || []).forEach((inst: any) => {
          const instNo = inst.installment_no || inst.installmentNo || 0;
          const pd = inst.paidDate || inst.paid_date || inst.paidDate;
          if (pd && inst.paid) {
            const rawDate = typeof pd === 'string' ? pd : new Date(pd).toISOString();
            const payDate = formatDate(rawDate);
            paymentMap[instNo] = { date: payDate, amount: inst.amount || 0, method: '—', rawDate };
          }
        });
        
        (plan.payments || []).forEach((p: any) => {
          const instNo = p.installment_no || 0;
          const rawDate = p.transaction_date || p.payment_date || '';
          const payDate = rawDate ? formatDate(rawDate) : '—';
          const payAmount = p.amount || 0;
          if (!paymentMap[instNo]) {
            paymentMap[instNo] = { date: payDate, amount: payAmount, method: p.method || '—', rawDate };
          } else {
            if (rawDate && rawDate > paymentMap[instNo].rawDate) {
              paymentMap[instNo] = { date: payDate, amount: payAmount, method: p.method || '—', rawDate };
            }
          }
        });

        const partialPaymentMap: Record<number, { totalPaid: number; lastDate: string; lastRawDate: string }> = {};
        
        (plan.installments || []).forEach((inst: any) => {
          const instNo = inst.installment_no || inst.installmentNo || 0;
          const partialPaid = inst.partial_paid || inst.partialPaid || 0;
          const pd = inst.paidDate || inst.paid_date || inst.paidDate;
          if (partialPaid > 0) {
            const rawDate = pd ? (typeof pd === 'string' ? pd : new Date(pd).toISOString()) : '';
            partialPaymentMap[instNo] = { 
              totalPaid: partialPaid, 
              lastDate: rawDate ? formatDate(rawDate) : '—', 
              lastRawDate: rawDate 
            };
          }
        });
        
        (plan.payments || []).forEach((p: any) => {
          const instNo = p.installment_no || 0;
          const rawDate = p.transaction_date || p.payment_date || '';
          const payAmount = p.amount || 0;
          if (!partialPaymentMap[instNo]) {
            partialPaymentMap[instNo] = { totalPaid: 0, lastDate: '—', lastRawDate: '' };
          }
          partialPaymentMap[instNo].totalPaid += payAmount;
          if (rawDate && (!partialPaymentMap[instNo].lastRawDate || rawDate > partialPaymentMap[instNo].lastRawDate)) {
            partialPaymentMap[instNo].lastDate = formatDate(rawDate);
            partialPaymentMap[instNo].lastRawDate = rawDate;
          }
        });

        allReceipts += `
        <div class="receipt" style="font-family:${isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" : "'Times New Roman', Georgia, serif"};max-width:750px;width:100%;background:#fff;padding:10px 16px;border:2px solid #000;line-height:1.4;color:#000;font-size:12px;box-sizing:border-box;margin:0 auto 8px auto;direction:${isUrdu ? 'rtl' : 'ltr'};page-break-after:always;page-break-inside:avoid;break-inside:avoid;">
          
          <div style="text-align:center;margin-bottom:5px;">
            <h1 style="font-size:14px;font-weight:bold;margin:0;letter-spacing:0.5px;color:#000;">RANA AWAIS ELECTRONICS</h1>
          </div>

          <div style="display:flex;gap:6px;margin-bottom:6px;">
            
            <div style="flex:1;border:1.5px solid #000;padding:6px 10px;font-size:12px;">
              <p style="font-weight:bold;font-size:11px;margin:0 0 4px 0;color:#000;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:2px;">${L('CUSTOMER', 'گاہک')}</p>
              <p style="font-weight:bold;font-size:15px;margin:0 0 3px 0;color:#000;">${custName}</p>
              <p style="font-size:12px;margin:0 0 2px 0;color:#000;font-weight:bold;">${L('S/O:', 'والد:')} ${fatherName}</p>
              <p style="font-size:12px;margin:0 0 2px 0;color:#000;font-weight:bold;">${L('Contact:', 'رابطہ:')} <span dir="ltr">${phone}</span></p>
              <p style="font-size:12px;margin:0 0 2px 0;color:#000;font-weight:bold;">CNIC: <span dir="ltr">${cnic}</span></p>
              <p style="font-size:12px;margin:0;color:#000;font-weight:bold;" dir="${isUrdu ? 'rtl' : 'ltr'}">${addr}</p>
            </div>
            
            ${guarantor1Html || `<div style="flex:1;border:1.5px solid #000;padding:6px 10px;font-size:12px;"><p style="font-size:12px;margin:0;color:#000;">${L('No guarantor', 'کوئی ضامن نہیں')}</p></div>`}
            
            <div style="flex:1;border:1.5px solid #000;padding:6px 10px;font-size:12px;">
              <p style="font-weight:bold;font-size:11px;margin:0 0 4px 0;color:#000;text-transform:uppercase;border-bottom:1.5px solid #000;padding-bottom:2px;">${L('PRODUCT / PAYMENT', 'پراڈکٹ / ادائیگی')}</p>
              <p style="font-size:12px;margin:0 0 3px 0;color:#000;font-weight:bold;">${L('Product:', 'پراڈکٹ:')} ${prodName}</p>
              <p style="font-size:12px;margin:0 0 3px 0;color:#000;font-weight:bold;">${L('Total:', 'کل:')} Rs ${totalAmt.toFixed(0)} | ${L('Down:', 'بیعانہ:')} Rs ${downPay.toFixed(0)}</p>
              <p style="font-size:12px;margin:0 0 3px 0;color:#000;font-weight:bold;">${L('Paid:', 'ادا:')} Rs ${totalPaid.toFixed(0)} | ${L('Remaining:', 'باقی:')} Rs ${actualRemaining.toFixed(0)}</p>
              <p style="font-size:12px;margin:0;color:#000;font-weight:bold;">${L('Inst:', 'اقساط:')} ${paidCount}/${numInst} | ${L('Plan By:', 'پلان:')} ${plan.createdBy || plan.created_by || '—'}</p>
            </div>
          </div>

          ${nextDueInst ? `
          <div style="border:1.5px solid #000;padding:4px 10px;text-align:center;font-size:11px;font-weight:bold;color:#000;background:#f0f0f0;margin-bottom:6px;">
            ${L('NEXT DUE', 'اگلی قسط')}: ${L('Inst #', 'قسط نمبر ')}${nextInstNo} — Rs ${nextInstAmt.toFixed(0)} — ${L('Due:', 'تاریخ:')} ${nextInstDate}
          </div>` : ''}

          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;font-size:11px;">
            <thead>
              <tr style="background-color:#000;color:#fff;">
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">#</th>
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">${L('Due Date', 'تاریخ')}</th>
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">${L('Total', 'کل')}</th>
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">${L('Paid', 'ادا')}</th>
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">${L('Pay Date', 'تاریخ اد')}</th>
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">${L('Remain', 'باقی')}</th>
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">${L('Status', 'حالت')}</th>
                <th style="border:1.5px solid #000;padding:5px 4px;text-align:center;font-weight:bold;font-size:11px;">${L('Collected By', 'وصول کنندہ')}</th>
              </tr>
            </thead>

            <tbody>
              ${(() => {
                return (plan.installments || []).map((inst: any, iIdx: number) => {
                  const dueDate = inst.due_date ? formatDate(inst.due_date) : '—';
                  const instAmt = inst.amount || 0;
                  const isPaid = inst.paid === true;
                  const instNo = inst.installment_no || inst.installmentNo || (iIdx + 1);
                  
                  const payInfo = paymentMap[instNo];
                  const payDateDisplay = payInfo ? payInfo.date : '—';
                  
                  const partialInfo = partialPaymentMap[instNo];
                  const hasPartialPayments = partialInfo && partialInfo.totalPaid > 0 && partialInfo.totalPaid < instAmt;
                  const instPartialPaid = inst.partial_paid || inst.partialPaid || 0;

                  let statusText: string;
                  let paidAmountDisplay: string;
                  let paymentDateDisplay: string;
                  let remainingDisplay: string;
                  
                  if (hasPartialPayments || (instPartialPaid > 0 && !isPaid)) {
                    statusText = isUrdu ? 'جزوی' : 'Partial';
                    const totalPaidAmount = hasPartialPayments ? partialInfo.totalPaid : instPartialPaid;
                    paidAmountDisplay = 'Rs ' + totalPaidAmount.toFixed(0);
                    paymentDateDisplay = hasPartialPayments ? partialInfo.lastDate : (inst.paidDate ? formatDate(inst.paidDate) : payDateDisplay);
                    remainingDisplay = 'Rs ' + (instAmt - totalPaidAmount).toFixed(0);
                  } else if (isPaid) {
                    statusText = isUrdu ? 'ادا' : 'Paid';
                    paidAmountDisplay = 'Rs ' + instAmt.toFixed(0);
                    paymentDateDisplay = inst.paidDate ? formatDate(inst.paidDate) : payDateDisplay;
                    remainingDisplay = 'Rs 0';
                  } else {
                    statusText = isUrdu ? 'باقی' : 'Due';
                    paidAmountDisplay = '—';
                    paymentDateDisplay = '—';
                    remainingDisplay = 'Rs ' + instAmt.toFixed(0);
                  }
                  
                  // Wasool Kununda: agar installment paid/partial hai to collectedBy dikhao, warna khaali
                  let collectedByName = '—';
                  if (isPaid || hasPartialPayments || instPartialPaid > 0) {
                    collectedByName = inst.collectedBy || inst.collected_by || currentUser?.username || currentUser?.displayName || '—';
                  }
                  
                  return '<tr>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">' + (iIdx + 1) + '</td>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">' + dueDate + '</td>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">Rs ' + instAmt.toFixed(0) + '</td>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">' + paidAmountDisplay + '</td>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">' + paymentDateDisplay + '</td>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">' + remainingDisplay + '</td>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">' + statusText + '</td>' +
                    '<td style="border:1.5px solid #000;padding:4px 4px;text-align:center;font-weight:bold;color:#000;font-size:11px;">' + collectedByName + '</td>' +
                  '</tr>';
                }).join('');
              })()}

            </tbody>
          </table>

          <div style="text-align:center;font-size:7px;border-top:2px solid #000;padding-top:3px;margin-top:3px;">
            <p style="margin:0;font-weight:bold;font-size:8px;">${L('Thank you for choosing Rana Awais Electronics!', 'رانا اویس الیکٹرانکس کا انتخاب کرنے کا شکریہ!')}</p>
          </div>
        </div>`;

      });

      printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="${isUrdu ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="UTF-8">
          <title>${titleMap[period]}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: ${isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" : "'Times New Roman', Georgia, serif"}; padding: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 0.2in; }
            @media print {
              body { padding: 0; }
              .receipt { page-break-inside: avoid; break-inside: avoid; }
            }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          </style>
        </head>
        <body>
          <div style="text-align:center;margin-bottom:15px;">
            <h1 style="font-size:18px;font-weight:bold;letter-spacing:1px;">${titleMap[period]}</h1>
            <p style="font-size:11px;color:#555;">${dateStr} | ${isUrdu ? 'کل کسٹمرز' : 'Total Customers'}: ${plans.length}</p>
          </div>
          ${allReceipts}
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
        </body>
        </html>
      `);
      printWindow.document.close();
    } catch (err) {
      console.error('Failed to fetch detailed report:', err);
    } finally {
      setPrintingFullDetail(null);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto" dir={isUrdu ? 'rtl' : 'ltr'}>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
            {t('dashboard')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {new Date().toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/installments"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
          >
            {t('manage_installments')}
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(['daily', 'weekly', 'monthly'] as const).map((period) => {
          const s = summary[period];
          return (
            <div key={period} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {t(period + '_summary')}
                </h3>
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {s.count} {t('customers')}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('total')}</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">Rs. {s.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('paid')}</span>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Rs. {s.paid.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-300">{t('pending')}</span>
                  <span className="text-sm font-bold text-rose-600 dark:text-rose-400">Rs. {s.pending.toFixed(2)}</span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{t('progress')}</span>
                    <span>{s.percent}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-emerald-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: s.percent + '%' }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => handlePrintCollection(period)}
                  disabled={s.count === 0}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  🖨️ {t('print_collection')}
                </button>
                <button
                  onClick={() => handlePrintFullDetail(period)}
                  disabled={s.count === 0 || printingFullDetail === period}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-1"
                >
                  {printingFullDetail === period ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin"></span>
                      {isUrdu ? 'برائے مہربانی انتظار کریں...' : 'Loading...'}
                    </>
                  ) : (
                    <>🖨️ {t('print_full_detail')}</>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-20">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600 mb-4" />
          <p className="text-gray-400 text-sm">{t('loading')}</p>
        </div>
      ) : (
        <>
          {(['daily', 'weekly', 'monthly'] as const).map((period) => (
            <div key={period}>
              {renderTable(data[period], period + '_installments')}
            </div>
          ))}
        </>
      )}
    </div>
  );
};

export default DashboardPage;