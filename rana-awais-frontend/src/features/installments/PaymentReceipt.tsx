// PaymentReceipt.tsx - Sale Invoice Style (Professional)
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';
import { offlineDB } from '../../db/indexeddb';

interface Props { planId: string; onClose: () => void; }

const PaymentReceipt: React.FC<Props> = ({ planId, onClose }) => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(false);
  const isUrdu = i18n.language === 'ur';
  const cu = useAuthStore((s) => s.user);
  const clientInfo = useClientStore((s) => s.info);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const pr = await api.get(`/installments/${planId}`);
        const plan = pr.data;
        let cust = null;
        if (plan?.customerId) {
          try { cust = (await api.get(`/customers/${plan.customerId}`)).data; } catch {}
        }
        let prod = null;
        if (plan?.productId) {
          try { prod = (await api.get(`/products/${plan.productId}`)).data; } catch {}
        }
        let pays: any[] = [];
        try {
          const r = await api.get(`/payments/plan/${planId}`);
          pays = Array.isArray(r.data) ? r.data : [];
        } catch {}
        setData({ ...plan, cust, prod, pays });
      } catch {} finally { setLoading(false); }
    })();
  }, [planId]);

  const plan = data;
  const cust = plan?.cust;
  const prod = plan?.prod;
  const pays = plan?.pays || [];

  const ta = plan?.totalAmount || 0;
  const dp = plan?.downPayment || 0;
  const ia = plan?.installmentAmount || 0;
  const ni = plan?.numInstallments || plan?.installments?.length || 0;
  const rm = plan?.remainingAmount || (ta - dp);
  const comp = prod?.company || plan?.company || '';
  const mdl = prod?.model || plan?.model || '';
  const srn = prod?.serialNumber || plan?.serialNumber || '';
  const pdn = prod?.name || plan?.productName || '';
  const cnm = cust?.name || '';
  const cfn = cust?.fatherName || cust?.father_name || '';
  const cacn = cust?.accountNo || plan?.accountNo || '';
  const ccsn = cust?.costNo || '';
  const cph = cust?.phone || '';
  const ccat = cust?.createdAt || plan?.createdAt || '';

  let tp = 0;
  pays.forEach((p: any) => { tp += p.amount || 0; });

  const L = (en: string, ur: string) => isUrdu ? ur : en;
  const fc = (n: number) => (n || 0).toLocaleString('en-PK');
  const mth = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const fd = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return String(dt.getDate()).padStart(2, '0') + ' ' + mth[dt.getMonth()] + ' ' + dt.getFullYear();
  };

  const pn = new Date();
  const pds = String(pn.getDate()).padStart(2, '0') + ' ' + mth[pn.getMonth()] + ' ' + pn.getFullYear() + ' ' +
    String(pn.getHours()).padStart(2, '0') + ':' + String(pn.getMinutes()).padStart(2, '0') + ':' + String(pn.getSeconds()).padStart(2, '0');

  const inv = '*' + String(cacn || '000001').padStart(6, '0') + '-' + String(ccsn || '001').padStart(3, '0') + '*';

  const IS: React.CSSProperties = {
    fontFamily: "'Times New Roman', Georgia, serif",
    maxWidth: '800px',
    width: '100%',
    background: '#fff',
    padding: '25px 30px',
    border: '1px solid #000',
    lineHeight: '1.4',
    color: '#000',
    fontSize: '14px',
    boxSizing: 'border-box',
    margin: '0 auto',
    direction: isUrdu ? 'rtl' as any : 'ltr' as any,
  };

  const rc = (
    <div id="payment-receipt-print" style={IS} ref={ref}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid #000',
        paddingBottom: '8px',
        marginBottom: '12px',
      }}>
        <div style={{ fontSize: '13px' }}>
          <div><strong>{L('Branch:', 'برانچ:')}</strong> {clientInfo.branch || clientInfo.name}</div>
          <div><strong>{L('UID:', 'یوزر:')}</strong> {cu?.displayName || cu?.username || '—'}</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold', margin: 0, letterSpacing: '1px' }}>
            {L('Sale Invoice', 'سیل انوائس')}
          </h1>
        </div>
        <div style={{ fontSize: '13px', textAlign: 'right' }}>
          <div><strong>{inv}</strong></div>
        </div>
      </div>

      {/* Print Date */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '12px' }}>
        <div><strong>{L('Print Date & Time :', 'پرنٹ کی تاریخ اور وقت:')}</strong> {pds}</div>
      </div>

      {/* Summary Box */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        marginBottom: '12px',
        border: '1px solid #000',
        padding: '8px 12px',
        backgroundColor: '#fcfcfc',
        flexWrap: 'wrap',
      }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px', flex: '1 1 auto', minWidth: '140px' }}>
          {L(clientInfo.invoiceNote || '', clientInfo.invoiceNoteUr || 'سروس چارجز میں صرف ایڈوانس شامل ہے')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px', borderLeft: '1px solid #000' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{ni}</div>
          <div style={{ fontSize: '10px' }}>{L('Installments', 'کل قسطیں')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px', borderLeft: '1px solid #000' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{fc(dp)}</div>
          <div style={{ fontSize: '10px' }}>{L('Advance', 'ایڈوانس')}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 10px', borderLeft: '1px solid #000' }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{fc(ia)}</div>
          <div style={{ fontSize: '10px' }}>{L('Per Installment', 'فی قسط')}</div>
        </div>
      </div>

      {/* Customer Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <div><strong>{L('S/O :', 'S/O :')}</strong> {cfn || '—'}</div>
        <div><strong>{L('Customer :', 'گاہک:')}</strong> {cnm || '—'}</div>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '12px',
        borderBottom: '1px solid #000',
        paddingBottom: '6px',
        fontSize: '13px',
      }}>
        <div><strong>{L('A/C No :', 'اکاؤنٹ نمبر:')}</strong> {cacn || '—'}</div>
        <div><strong>{L('A/C Date :', 'اکاؤنٹ تاریخ:')}</strong> {fd(ccat || new Date().toISOString())}</div>
        <div><strong>{L('Customer :', 'گاہک:')}</strong> {cnm || '—'}</div>
      </div>

      {/* Product Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', border: '1px solid #000' }}>
        <thead>
          <tr>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Model', 'ماڈل')}</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Product', 'پروڈکٹ')}</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Brand', 'برانڈ')}</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Serial No', 'سیریل')}</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>Qty</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Dur', 'مدت')}</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Install', 'قسط')}</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Advance', 'ایڈوانس')}</th>
            <th style={{ border: '1px solid #000', padding: '6px 4px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f0f0f0' }}>{L('Price', 'قیمت')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{mdl || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{pdn || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{comp || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{srn || '—'}</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>1</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'center' }}>{ni}</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', paddingRight: '10px' }}>{fc(ia)}</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', paddingRight: '10px' }}>{fc(dp)}</td>
            <td style={{ border: '1px solid #000', padding: '8px 4px', textAlign: 'right', fontWeight: 'bold', paddingRight: '10px' }}>{fc(ta)}</td>
          </tr>
        </tbody>
      </table>

      {/* Totals - Total, Down Payment, Paid, Remaining */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <table style={{ width: '55%', borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #000' }}>{L('Total Price :', 'کل قیمت:')}</td>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold', borderBottom: '1px solid #000' }}>{fc(ta)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold' }}>{L('Down Payment :', 'بیعانہ:')}</td>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold' }}>{fc(dp)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold' }}>{L('Total Paid :', 'کل ادا شدہ:')}</td>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold', color: '#15803d' }}>{fc(tp)}</td>
            </tr>
            <tr>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid #000', borderBottom: '2px double #000' }}>{L('Remaining :', 'باقی:')}</td>
              <td style={{ padding: '4px 10px', textAlign: 'right', fontWeight: 'bold', borderTop: '1px solid #000', borderBottom: '2px double #000', color: '#dc2626' }}>{fc(rm - tp + dp)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Note */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '25px', fontSize: '12px' }}>
        <div><strong>{L('Form Fee :', 'فارم فیس:')}</strong> 0</div>
        <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '13px' }}>
          {L(clientInfo.invoiceNote || '', clientInfo.invoiceNoteUr || 'نوٹ: مذکورہ بالا تفصیلات درست اور تصدیق شدہ ہیں۔')}
        </div>
      </div>

      {/* Signatures */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '15px', fontSize: '13px' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ marginTop: '35px', borderTop: '1px solid #000', paddingTop: '5px', width: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
            <strong>{L('Received By', 'وصول کنندہ')}</strong>
          </div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ marginTop: '35px', borderTop: '1px solid #000', paddingTop: '5px', width: '160px', marginLeft: 'auto', marginRight: 'auto' }}>
            <strong>{L('Customer Sign', 'گاہک کے دستخط')}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  // Download as JPG
  const dw = async () => {
    if (!ref.current) return;
    setDl(true);
    try {
      const { default: h2c } = await import('html2canvas');
      const cv = await h2c(ref.current, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
      const a = document.createElement('a');
      a.download = 'Invoice_' + (cnm || 'Cust') + '_' + new Date().toISOString().split('T')[0] + '.jpg';
      a.href = cv.toDataURL('image/jpeg', 0.98);
      a.click();
      toast.success(L('Downloaded!', 'ڈاؤن لوڈ!'));
    } catch {
      toast.error(L('Failed', 'ناکام'));
    } finally {
      setDl(false);
    }
  };

  // Print
  const hp = () => {
    const el = document.getElementById('payment-receipt-print');
    if (!el) return;
    const w = window.open('', '_blank', 'width=850,height=1100');
    if (!w) {
      toast.error(L('Pop-up blocked', 'پاپ اپ بلاک'));
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${cnm || ''}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', serif;
              background: #fff;
              display: flex;
              justify-content: center;
              padding: 20px;
              font-size: 14px;
            }
            @page { size: A4; margin: 0.3in; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div style="max-width:800px;width:100%">
            ${el.outerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
                setTimeout(function() {
                  window.close();
                }, 500);
              }, 400);
            };
          </script>
        </body>
      </html>
    `;

    w.document.open();
    w.document.write(htmlContent);
    w.document.close();
  };

  // WhatsApp
  const wa = () => {
    const ph = (cph || '').replace(/\D/g, '');
    if (!ph) {
      toast.error(L('No phone', 'فون نمبر نہیں'));
      return;
    }
    let w = ph.startsWith('0') ? '92' + ph.slice(1) : ph;
    if (!w.startsWith('92')) w = '92' + w;
    window.open('https://wa.me/' + w, '_blank');
  };

  // Loading State
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div
          className="sticky top-0 bg-white z-10 flex justify-between items-center px-5 py-3 border-b"
          style={{ flexDirection: isUrdu ? 'row-reverse' : 'row' }}
        >
          <h2 className="text-base font-semibold text-gray-800">
            📋 {L('Sale Invoice', 'سیل انوائس')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-xl">✕</button>
        </div>

        {/* Receipt Content */}
        <div className="p-5 flex justify-center">{rc}</div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-3 flex gap-2 justify-center flex-wrap">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium">
            ❌ {L('Close', 'بند')}
          </button>
          <button onClick={hp} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-medium">
            🖨️ {L('Print', 'پرنٹ')}
          </button>
          <button onClick={dw} disabled={dl} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-xs font-medium disabled:opacity-60">
            {dl ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1"></span> : null}
            📥 {L('Download', 'ڈاؤن لوڈ')}
          </button>
          <button onClick={wa} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-xs font-medium">
            💬 WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;
