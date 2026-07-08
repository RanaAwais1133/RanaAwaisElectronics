// PlanReceipt.tsx - Full Detailed Receipt (Professional - Fully Dynamic)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

interface Props { planId: string; onClose: () => void; }

const PlanReceipt: React.FC<Props> = ({ planId, onClose }) => {
  const { t, i18n } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [dl, setDl] = useState(false);
  const isUrdu = i18n.language === 'ur';
  const cu = useAuthStore((s) => s.user);

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
        let pays = [];
        try { pays = (await api.get(`/payments/plan/${planId}`)).data || []; } catch {}
        let guars = [];
        if (cust?.guarantorIds?.length > 0) {
          guars = (await Promise.all(
            cust.guarantorIds.map((gId: string) =>
              api.get(`/guarantors/${gId}`).then(r => r.data).catch(() => null)
            )
          )).filter(Boolean);
        }
        setData({ ...plan, cust, prod, pays, guars });
      } catch (err: any) {
        // ✅ OFFLINE FALLBACK: Load from IndexedDB cache
        if (!navigator.onLine || err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
          console.log('📦 Offline: Loading receipt from IndexedDB cache');
          try {
            const { offlineDB } = await import('../../db/indexeddb');
            // ✅ Use getCachedPlan() for full plan data with installments array
            const plan = await offlineDB.getCachedPlan(planId);
            if (plan) {
              // Also try to get cached customers and payments
              const cachedCustomers = await offlineDB.getCachedCustomers();
              const custId = plan.customerId;
              const cust = cachedCustomers.find((c: any) => c.id === custId);
              const cachedPayments = await offlineDB.getCachedPayments();
              const pays = cachedPayments.filter((p: any) => p.plan_id === planId);
              setData({ ...plan, cust, prod: null, pays, guars: [] });
            }
          } catch (cacheErr) {
            console.error('Failed to load from cache:', cacheErr);
          }
        }
      } finally { setLoading(false); }
    })();
  }, [planId]);

  const plan = data;
  const cust = plan?.cust;
  const prod = plan?.prod;
  const pays = plan?.pays || [];
  const insts = plan?.installments || [];
  const guars = plan?.guars || [];

  // ✅ Customer fields
  const cn = cust?.name || plan?.customerName || '—';
  const fn = cust?.fatherName || cust?.father_name || '—';
  const cp = cust?.phone || '';
  const cic = cust?.cnic || '';
  const res = cust?.residential || '';
  const occ = cust?.occupant || '';
  const ra = cust?.residentialAddress || cust?.address || '';
  const oa = cust?.officeAddress || '';
  const acn = cust?.accountNo || plan?.accountNo || '';
  const csn = cust?.costNo || '';
  const psn = cust?.processNo || '';
  const rac = cust?.reprAsCost || '';
  const rag = cust?.reprAsGar || '';
  const pac = cust?.prepAC || '';

  // ✅ Product fields
  const pdn = prod?.name || plan?.productName || '—';
  const comp = prod?.company || plan?.company || '';
  const mdl = prod?.model || plan?.model || '';
  const sn = prod?.serialNumber || plan?.serialNumber || '';
  const imei = prod?.imei || plan?.imei || '';
  const eng = prod?.engineNo || plan?.engineNo || '';
  const chs = prod?.chassisNo || plan?.chassisNo || '';
  const clr = prod?.color || plan?.color || '';

  // ✅ Plan fields
  const ta = plan?.totalAmount || 0;
  const dp = plan?.downPayment || 0;
  const ia = plan?.installmentAmount || 0;
  const ni = plan?.numInstallments || insts.length || 0;
  const rm = plan?.remainingAmount || 0;
  const aa = plan?.advanceAmount || 0;
  const ar = plan?.advanceReceived || 0;
  const planTid = plan?.tid || '';
  const planUid = plan?.uid || '';
  const planStatus = plan?.status || '';

  // ✅ Totals
  let tr = 0;
  pays.forEach((p: any) => { tr += p.amount || 0; });
  let tf = 0;
  insts.forEach((i: any) => { tf += i.fine || 0; });
  const paidCount = insts.filter((i: any) => i.paid === true).length;
  const bal = ta - tr;
  const pct = ta > 0 ? Math.round(tr / ta * 100) : 0;

  // ✅ Created by
  const plc = plan?.createdBy || cu?.displayName || cu?.username || '—';

  // ✅ Dynamic config from global store - settings change karte hi update ho jayega
  const clientInfo = useClientStore((s) => s.info);
  const companyName = clientInfo.name || 'Company Name';
  const companyNameUr = clientInfo.nameUr || 'کمپنی کا نام';
  const address = clientInfo.address || '';
  const addressUr = clientInfo.addressUr || '';
  const phones = clientInfo.phones.filter(p => p.number.trim()).map(p => p.number);
  const softwareBy = clientInfo.softwareBy || '';
  const softwareByUr = clientInfo.softwareByUr || '';

  // ✅ Helpers
  const L = (en: string, ur: string) => isUrdu ? ur : en;
  const fc = (n: number) => (n || 0).toLocaleString('en-US');

  const fd = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getFullYear()).slice(-2)}`;
  };

  const fdf = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    return `${String(dt.getDate()).padStart(2, '0')}-${String(dt.getMonth() + 1).padStart(2, '0')}-${dt.getFullYear()}`;
  };

  const ft = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    let h = dt.getHours();
    const a = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}:${String(dt.getSeconds()).padStart(2, '0')} ${a}`;
  };

  const fph = (p: string) => {
    if (!p) return '';
    const c = p.replace(/\D/g, '');
    if (c.length === 11) return `${c.slice(0, 4)}-${c.slice(4)}`;
    return p;
  };

  const fcn = (c: string) => {
    if (!c) return '';
    const cl = c.replace(/\D/g, '');
    if (cl.length === 13) return `${cl.slice(0, 5)}-${cl.slice(5, 12)}-${cl.slice(12)}`;
    return c;
  };

  const pn = new Date();
  const pds = fdf(pn.toISOString());
  const pts = ft(pn.toISOString());

  // ✅ Styles
  const rs: React.CSSProperties = {
    fontFamily: "'Times New Roman', Georgia, serif",
    maxWidth: '1000px',
    width: '100%',
    background: '#fff',
    padding: '18px 22px',
    border: '1px solid #000',
    lineHeight: '1.35',
    color: '#000',
    fontSize: '9px',
    boxSizing: 'border-box',
    margin: '0 auto',
    direction: isUrdu ? 'rtl' : ('ltr' as any),
  };

  const thStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '5px 6px',
    textAlign: 'center',
    fontWeight: 'bold',
    backgroundColor: '#f0f0f0',
    fontSize: '9px',
  };

  const tdStyle: React.CSSProperties = {
    border: '1px solid #000',
    padding: '5px 6px',
    textAlign: 'center',
    fontSize: '9px',
  };

  const tdRight: React.CSSProperties = {
    border: '1px solid #000',
    padding: '5px 8px',
    textAlign: 'right',
    fontSize: '9px',
    fontWeight: 'bold',
  };

  const sectionTitle: React.CSSProperties = {
    fontWeight: 'bold',
    fontSize: '10px',
    margin: '8px 0 4px',
    borderBottom: '1px solid #000',
    paddingBottom: '2px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '9px',
  };

  const headerStyle: React.CSSProperties = {
    textAlign: 'center',
    borderBottom: '2px solid #000',
    paddingBottom: '8px',
    marginBottom: '10px',
  };

  const rc = (
    <div id="plan-receipt-print" style={rs}>
      {/* ==================== HEADER ==================== */}
      <div style={headerStyle as any}>
        <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 3px', letterSpacing: '1px' }}>
          {isUrdu ? companyNameUr : companyName}
        </h1>
        <p style={{ fontSize: '11px', fontWeight: 'bold', margin: '0 0 3px' }}>
          {L('Customer Account Info Detail', 'کسٹمر اکاؤنٹ کی تفصیلات')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '9px', fontWeight: 'bold', marginBottom: '3px' }}>
          <span>{L('Print:', 'پرنٹ:')} {pds} {pts}</span>
          {planTid && <span>TID: {planTid}</span>}
          {planUid && <span>UID: {planUid}</span>}
        </div>
        {address && (
          <div style={{ fontSize: '7px', fontWeight: 'bold' }}>
            {isUrdu ? addressUr : address}
          </div>
        )}
        {phones.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '7px', marginTop: '1px', fontWeight: 'bold' }}>
            {phones.map((ph: string, i: number) => (
              <span key={i}>📞 {ph}</span>
            ))}
          </div>
        )}
      </div>

      {/* ==================== CUSTOMER INFO ==================== */}
      <div style={rowStyle}>
        <div style={{ flex: 1 }}><b>{L('A/C No:', 'اکاؤنٹ:')}</b> {acn || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Date:', 'تاریخ:')}</b> {fdf(cust?.createdAt || plan?.createdAt || new Date().toISOString())}</div>
        <div style={{ flex: 1 }}><b>{L('Cost No:', 'کوسٹ:')}</b> {csn || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Proc No:', 'پروسس:')}</b> {psn || '—'}</div>
      </div>

      <div style={rowStyle}>
        <div style={{ flex: 1 }}><b>{L('Cost Name:', 'کوسٹ نام:')}</b> {cn}</div>
        <div style={{ flex: 1 }}><b>{L('Rep Cost:', 'ریپر کوسٹ:')}</b> {rac || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('F/H Name:', 'والد:')}</b> {fn}</div>
        <div style={{ flex: 1 }}><b>{L('Rep Gar:', 'ریپر گار:')}</b> {rag || '—'}</div>
      </div>

      <div style={rowStyle}>
        <div style={{ flex: 1 }}><b>{L('Residential:', 'رہائشی:')}</b> {res || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Occupant:', 'قابض:')}</b> {occ || '—'}</div>
        <div style={{ flex: 2 }}><b>{L('Address:', 'پتہ:')}</b> {ra || '—'}</div>
      </div>

      <div style={rowStyle}>
        <div style={{ flex: 1 }}><b>{L('Office Addr:', 'دفتر:')}</b> {oa || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Prep AC:', 'پریپ AC:')}</b> {pac || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Mobile:', 'موبائل:')}</b> {fph(cp)}</div>
      </div>

      {/* ==================== PRODUCT INFO ==================== */}
      <div style={rowStyle}>
        <div style={{ flex: 1 }}><b>{L('Company:', 'کمپنی:')}</b> {comp || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Model:', 'ماڈل:')}</b> {mdl || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Serial No:', 'سیریل:')}</b> {sn || '—'}</div>
        <div style={{ flex: 1 }}><b>{L('Color:', 'رنگ:')}</b> {clr || '—'}</div>
      </div>

      {(imei || eng || chs) && (
        <div style={rowStyle}>
          {imei && <div style={{ flex: 1 }}><b>IMEI:</b> {imei}</div>}
          {eng && <div style={{ flex: 1 }}><b>{L('Engine:', 'انجن:')}</b> {eng}</div>}
          {chs && <div style={{ flex: 1 }}><b>{L('Chassis:', 'چیسس:')}</b> {chs}</div>}
          <div style={{ flex: 1 }}><b>{L('CNIC:', 'شناختی:')}</b> {fcn(cic) || '—'}</div>
        </div>
      )}

      {/* ==================== PLAN DETAILS ==================== */}
      <h3 style={sectionTitle}>{L('Plan Details', 'پلان تفصیلات')}</h3>
      <div style={rowStyle}>
        <div style={{ flex: 1 }}><b>{L('Total Amt:', 'کل رقم:')}</b> {fc(ta)}</div>
        <div style={{ flex: 1 }}><b>{L('Down Pay:', 'بیعانہ:')}</b> {fc(dp)}</div>
        <div style={{ flex: 1 }}><b>{L('Per Inst:', 'فی قسط:')}</b> {fc(ia)}</div>
        <div style={{ flex: 1 }}><b>{L('Installments:', 'اقساط:')}</b> {ni}</div>
      </div>
      <div style={rowStyle}>
        <div style={{ flex: 1 }}><b>{L('Remaining:', 'باقی:')}</b> {fc(rm)}</div>
        <div style={{ flex: 1 }}><b>{L('Adv Amt:', 'ایڈوانس رقم:')}</b> {fc(aa)}</div>
        <div style={{ flex: 1 }}><b>{L('Adv Recv:', 'ایڈوانس موصول:')}</b> {fc(ar)}</div>
        <div style={{ flex: 1 }}><b>{L('Created By:', 'بنانے والا:')}</b> {plc}</div>
      </div>
      {planStatus && (
        <div style={rowStyle}>
          <div style={{ flex: 1 }}><b>{L('Status:', 'حیثیت:')}</b> {planStatus}</div>
          <div style={{ flex: 3 }}></div>
        </div>
      )}

      {/* ==================== PAYMENT SUMMARY ==================== */}
      <h3 style={sectionTitle}>{L('Payment Summary', 'ادائیگی خلاصہ')}</h3>
      <div style={{ marginBottom: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginBottom: '3px' }}>
          <span><b>{L('Received:', 'وصول:')}</b> {fc(tr)} ({pct}%)</span>
          <span><b>{L('Balance:', 'باقی:')}</b> {fc(bal)} ({100 - pct}%)</span>
        </div>
        <div style={{ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden', border: '1px solid #000' }}>
          <div style={{ width: pct + '%', height: '100%', backgroundColor: '#000', borderRadius: '3px' }}></div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '8px', marginTop: '3px' }}>
          {tf > 0 && (
            <span><b>{L('Total Fine:', 'کل جرمانہ:')}</b> {fc(tf)}</span>
          )}
          <span><b>{L('Paid Installments:', 'ادا کردہ قسطیں:')}</b> {paidCount} / {ni}</span>
        </div>
      </div>

      {/* ==================== INSTALLMENT SCHEDULE ==================== */}
      <h3 style={sectionTitle}>{L('Installment Schedule', 'اقساط شیڈول')}</h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '1px solid #000' }}>
        <thead>
          <tr>
            <th style={thStyle}>#</th>
            <th style={thStyle}>{L('Due Date', 'تاریخ')}</th>
            <th style={thStyle}>{L('Amount', 'رقم')}</th>
            <th style={thStyle}>{L('Fine', 'جرمانہ')}</th>
            <th style={thStyle}>{L('Paid', 'ادا')}</th>
            <th style={thStyle}>{L('Status', 'حیثیت')}</th>
            <th style={thStyle}>{L('Collected By', 'وصول کنندہ')}</th>
          </tr>
        </thead>
        <tbody>
          {insts.length > 0 ? (
            insts.map((i: any, idx: number) => {
              const rp = pays.filter((p: any) => p.installmentNo === i.installmentNo);
              const paid = rp.reduce((s: number, p: any) => s + (p.amount || 0), 0);
              const cb = rp.length > 0
                ? (rp[rp.length - 1].collectedBy || rp[rp.length - 1].collected_by || '')
                : (i.paid ? (i.collectedBy || i.collected_by || '') : '');
              const isPd = i.paid || paid >= i.amount;
              const isPrt = !isPd && paid > 0;

              return (
                <tr
                  key={idx}
                  style={{
                    backgroundColor: isPd ? '#ffffff' : isPrt ? '#f9f9f9' : '#f5f5f5',
                  }}
                >
                  <td style={tdStyle}>{i.installmentNo}</td>
                  <td style={tdStyle}>{fd(i.dueDate)}</td>
                  <td style={tdRight}>{fc(i.amount)}</td>
                  <td style={tdRight}>{i.fine ? fc(i.fine) : '0'}</td>
                  <td style={tdRight}>{paid > 0 ? fc(paid) : '0'}</td>
                  <td style={tdStyle}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '8px',
                      fontWeight: 'bold',
                      border: '1px solid #000',
                    }}>
                      {isPd ? L('Paid', 'ادا') : isPrt ? L('Partial', 'جزوی') : L('Pending', 'زیر التواء')}
                    </span>
                  </td>
                  <td style={tdStyle}>{cb || '—'}</td>
                </tr>
              );
            })
          ) : (
            <tr>
              <td colSpan={7} style={{ ...tdStyle, padding: '12px' }}>
                {L('No installments', 'کوئی قسط نہیں')}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* ==================== GUARANTORS ==================== */}
      {guars.length > 0 && (
        <>
          <h3 style={sectionTitle}>{L('Guarantors', 'ضامن')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '1px solid #000' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>{L('Name', 'نام')}</th>
                <th style={thStyle}>{L('Father', 'والد')}</th>
                <th style={thStyle}>{L('Phone', 'فون')}</th>
                <th style={thStyle}>{L('CNIC', 'شناختی')}</th>
                <th style={thStyle}>{L('Relation', 'رشتہ')}</th>
                <th style={thStyle}>{L('Occupation', 'پیشہ')}</th>
              </tr>
            </thead>
            <tbody>
              {guars.map((g: any, i: number) => (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{g.name || '—'}</td>
                  <td style={tdStyle}>{g.fatherName || g.father_name || '—'}</td>
                  <td style={tdStyle}>{fph(g.phone || '')}</td>
                  <td style={tdStyle}>{fcn(g.cnic || '')}</td>
                  <td style={tdStyle}>{g.relation || '—'}</td>
                  <td style={tdStyle}>{g.occupation || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ==================== PAYMENT HISTORY ==================== */}
      {pays.length > 0 && (
        <>
          <h3 style={sectionTitle}>{L('Payment History', 'ادائیگی تاریخ')}</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px', border: '1px solid #000' }}>
            <thead>
              <tr>
                <th style={thStyle}>#</th>
                <th style={thStyle}>{L('Date', 'تاریخ')}</th>
                <th style={thStyle}>{L('Inst#', 'قسط#')}</th>
                <th style={thStyle}>{L('Amount', 'رقم')}</th>
                <th style={thStyle}>{L('Method', 'طریقہ')}</th>
                <th style={thStyle}>{L('Collected By', 'وصول')}</th>
                <th style={thStyle}>{L('Remarks', 'ریمارکس')}</th>
              </tr>
            </thead>
            <tbody>
              {pays.map((p: any, i: number) => (
                <tr key={i}>
                  <td style={tdStyle}>{i + 1}</td>
                  <td style={tdStyle}>{fd(p.transactionDate || p.createdAt)}</td>
                  <td style={tdStyle}>{p.installmentNo}</td>
                  <td style={tdRight}>{fc(p.amount)}</td>
                  <td style={tdStyle}>{p.method || '—'}</td>
                  <td style={tdStyle}>{p.collectedBy || p.collected_by || '—'}</td>
                  <td style={tdStyle}>{p.remarks || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* ==================== FOOTER ==================== */}
      <div style={{ marginTop: '12px', borderTop: '1px solid #000', paddingTop: '6px', textAlign: 'center' }}>
        {address && (
          <p style={{ fontSize: '8px', margin: '2px 0' }}>
            {isUrdu ? addressUr : address}
          </p>
        )}
        {phones.length > 0 && (
          <p style={{ fontSize: '8px', margin: '2px 0', fontWeight: 'bold' }}>
            {phones.join(' | ')}
          </p>
        )}
        <p style={{ fontSize: '8px', margin: '0' }}>
          {L('Generated:', 'تیار:')} {pds} {pts}
        </p>
        {softwareBy && (
          <p style={{ fontSize: '9px', margin: '4px 0', fontWeight: 'bold' }}>
            {L('Software: ' + softwareBy, 'سافٹ ویئر: ' + softwareByUr)}
          </p>
        )}
      </div>
    </div>
  );

  // ✅ Download as JPG
  const download = async () => {
    setDl(true);
    try {
      const { default: h2c } = await import('html2canvas');
      const el = document.getElementById('plan-receipt-print');
      if (!el) {
        toast.error(L('Element not found', 'عنصر نہیں ملا'));
        return;
      }
      const cv = await h2c(el, { scale: 2, useCORS: true, backgroundColor: '#fff', logging: false });
      const a = document.createElement('a');
      a.download = 'Plan_' + cn + '_' + new Date().toISOString().split('T')[0] + '.jpg';
      a.href = cv.toDataURL('image/jpeg', 0.98);
      a.click();
      toast.success(L('Downloaded!', 'ڈاؤن لوڈ ہو گیا!'));
    } catch {
      toast.error(L('Failed', 'ناکام'));
    } finally {
      setDl(false);
    }
  };

  // ✅ Print — Full page width
  const handlePrint = () => {
    const el = document.getElementById('plan-receipt-print');
    if (!el) return;

    const w = window.open('', '_blank', 'width=1100,height=1200');
    if (!w) {
      toast.error(L('Pop-up blocked', 'پاپ اپ بلاک'));
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Plan - ${cn}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Times New Roman', Georgia, serif;
              background: #fff;
              display: flex;
              justify-content: center;
              padding: 0;
              width: 100%;
            }
            @page {
              size: A4;
              margin: 0.2in;
            }
            @media print {
              body { padding: 0; width: 100%; }
              .receipt-container {
                max-width: 100% !important;
                width: 100% !important;
                border: none !important;
              }
            }
            .receipt-container {
              max-width: 100%;
              width: 100%;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
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

  // ✅ WhatsApp
  const wa = () => {
    const ph = (cp || '').replace(/\D/g, '');
    if (!ph) {
      toast.error(L('No phone', 'فون نمبر نہیں'));
      return;
    }
    let w = ph.startsWith('0') ? '92' + ph.slice(1) : ph;
    if (!w.startsWith('92')) w = '92' + w;
    window.open('https://wa.me/' + w, '_blank');
  };

  // ✅ Loading State
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
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Modal Header */}
        <div
          className="sticky top-0 bg-white z-10 flex justify-between items-center px-5 py-3 border-b"
          style={{ flexDirection: isUrdu ? 'row-reverse' : 'row' }}
        >
          <h2 className="text-base font-semibold">
            📋 {L('Plan Receipt', 'پلان رسید')}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-xl">✕</button>
        </div>

        {/* Receipt Content */}
        <div className="p-5 flex justify-center">{rc}</div>

        {/* Actions */}
        <div className="sticky bottom-0 bg-white border-t p-3 flex gap-2 justify-center flex-wrap">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-xs">
            ❌ {L('Close', 'بند')}
          </button>
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs">
            🖨️ {L('Print', 'پرنٹ')}
          </button>
          <button onClick={download} disabled={dl} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-xs disabled:opacity-60">
            {dl ? (
              <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1"></span>
            ) : null}
            📥 {L('Download', 'ڈاؤن لوڈ')}
          </button>
          <button onClick={wa} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-xs">
            💬 WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanReceipt;