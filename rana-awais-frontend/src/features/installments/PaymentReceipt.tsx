// PaymentReceipt.tsx - Black & White professional design, Urdu/English support
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { formatPhone, formatCNIC } from '../../utils/helpers';

interface Props {
  planId: string;
  onClose: () => void;
}

const PaymentReceipt: React.FC<Props> = ({ planId, onClose }) => {
  const { i18n } = useTranslation();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((s) => s.user);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const planRes = await api.get(`/installments/${planId}`);
        const plan = planRes.data;
        let customer = null;
        if (plan?.customerId) {
          try {
            const custRes = await api.get(`/customers/${plan.customerId}`);
            customer = custRes.data;
          } catch {}
        }
        let product = null;
        if (plan?.productId) {
          try {
            const prodRes = await api.get(`/products/${plan.productId}`);
            product = prodRes.data;
          } catch {}
        }
        let payments: any[] = [];
        try {
          const payRes = await api.get(`/payments/plan/${planId}`);
          payments = Array.isArray(payRes.data) ? payRes.data : [];
        } catch {}
        let guarantors: any[] = [];
        if (customer?.guarantorIds?.length > 0) {
          const guarPromises = customer.guarantorIds.map((gId: string) =>
            api.get(`/guarantors/${gId}`).then(r => r.data).catch(() => null)
          );
          const results = await Promise.all(guarPromises);
          guarantors = results.filter(g => g !== null);
        }
        setData({ ...plan, customer, product, payments, guarantors });
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [planId]);

  const plan = data;
  const customer = plan?.customer;
  const product = plan?.product;
  const payments = plan?.payments || [];
  const guarantors = plan?.guarantors || [];
  const total = plan?.totalAmount || 0;
  const remaining = plan?.remainingAmount || 0;
  const down = plan?.downPayment || 0;
  const instCount = plan?.installments?.length || 0;
  const productName = plan?.productName || product?.name || '';
  const productNameUrdu = plan?.productNameUrdu || product?.nameUrdu || '';

  let totalPaid = 0;
  let paidCount = 0;
  let lastPaid = 0;
  let lastPaidDate = null;
  let lastPaidInst = 0;
  let lastCollectedBy = '';
  
  (plan?.installments || []).forEach((inst: any) => {
    if (inst.partialPaid > 0) {
      totalPaid += inst.partialPaid;
    }
    if (inst.paid) {
      const amt = inst.partialPaid > 0 ? inst.partialPaid : inst.amount;
      paidCount++;
      lastPaid = amt;
      lastPaidDate = inst.paidDate;
      lastPaidInst = inst.installmentNo;
      lastCollectedBy = inst.collectedBy || inst.collected_by || '';
    }
  });
  
  const outstanding = remaining - totalPaid;
  const remainingCount = instCount - paidCount;
  const nextInst = (plan?.installments || []).find((i: any) => !i.paid);

  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;
  const lastPaymentAmount = lastPayment?.amount || lastPaid;
  const lastPaymentMethod = lastPayment?.method || '';
  const lastPaymentCollectedBy = lastPayment?.collectedBy || lastPayment?.collected_by || lastCollectedBy || currentUser?.displayName || currentUser?.username || '';
  const lastPaymentDate = lastPayment?.transactionDate || lastPayment?.createdAt || lastPayment?.payment_date || lastPayment?.date || lastPaidDate;

  const lastInstData = (plan?.installments || []).find((i: any) => i.installmentNo === lastPaidInst);
  const lastInstAmount = lastInstData?.amount || 0;
  const lastInstFine = lastInstData?.fine || 0;
  const appliedToLastInst = lastInstData?.partialPaid || lastPaid;
  const excessForwarded = appliedToLastInst > (lastInstAmount + lastInstFine) ? appliedToLastInst - (lastInstAmount + lastInstFine) : 0;
  const carriedFromLast = appliedToLastInst < (lastInstAmount + lastInstFine) ? (lastInstAmount + lastInstFine) - appliedToLastInst : 0;

  const isAdvanceReceipt = lastPayment && lastPayment.installmentNo === 0;
  const receiptDisplayAmount = isAdvanceReceipt ? lastPaymentAmount : total;

  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const formatTime = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    const hours = String(dt.getHours()).padStart(2, '0');
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    const seconds = String(dt.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const L = (en: string, ur: string) => isUrdu ? ur : en;

  const planCreatorName = plan?.createdBy || currentUser?.displayName || currentUser?.username || '—';

  const receiptStyle: React.CSSProperties = {
    fontFamily: isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Mehr Nastaliq', serif" : "'Times New Roman', Georgia, serif",
    maxWidth: '750px',
    width: '100%',
    background: '#ffffff',
    padding: '18px 24px',
    border: '1px solid #000',
    lineHeight: '1.5',
    color: '#000000',
    fontSize: '11px',
    boxSizing: 'border-box',
    margin: '0 auto',
    direction: isUrdu ? 'rtl' : 'ltr',
  };

  const receiptContent = (
    <div id="payment-receipt-print" style={receiptStyle}>
      
      {/* HEADER */}
      <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 3px 0', letterSpacing: '1px' }}>RANA-AWAIS ELECTRONICS</h1>
        <p style={{ fontSize: '8px', margin: '0', color: '#000', fontWeight: 'bold' }}>{L('Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala', 'بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ')}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '4px', fontSize: '8px', fontWeight: 'bold' }}>
          <span>📞 {L('Qadeem: 0324-9959800', 'قدیم: 0324-9959800')}</span>
          <span>📞 {L('Hizbullah: 0319-6429407', 'حزب اللہ: 0319-6429407')}</span>
          <span>📞 {L('Shahid: 0318-7311277', 'شاہد: 0318-7311277')}</span>
        </div>
      </div>

      {/* TITLE */}
      <div style={{ textAlign: 'center', marginBottom: '12px' }}>
        <div style={{ fontSize: '14px', fontWeight: 'bold', border: '2px solid #000', display: 'inline-block', padding: '5px 24px', color: '#000', letterSpacing: '1px' }}>
          {L('PAYMENT RECEIPT', 'ادائیگی کی رسید')}
        </div>
      </div>

      {/* 4-COLUMN LAYOUT: Customer + Guarantor1 + Guarantor2 + Receipt Details */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
        
        {/* Column 1: Customer/Bill To */}
        <div style={{ flex: 1, border: '1px solid #000', padding: '7px 9px', fontSize: '9px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '9px', margin: '0 0 4px 0', color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{L('BILL TO', 'بل وصول')}</p>
          {customer ? (
            <>
              <p style={{ fontWeight: 'bold', fontSize: '14px', margin: '0 0 3px 0', color: '#000' }}>{isUrdu ? (customer.nameUrdu || customer.name) : (customer.name || customer.nameUrdu)}</p>
              {customer.fatherName && <p style={{ fontSize: '13px', margin: '0 0 2px 0', color: '#000', fontWeight: 'bold' }}>{L('S/O:', 'والد:')} {isUrdu ? (customer.fatherNameUrdu || customer.father_name_urdu || customer.fatherName || customer.father_name) : (customer.fatherName || customer.father_name)}</p>}
              <p style={{ fontSize: '13px', margin: '0 0 2px 0', color: '#000', fontWeight: 'bold' }}>{L('Contact:', 'رابطہ:')} <span dir="ltr">{formatPhone(customer.phone)}</span></p>
              {customer.cnic && <p style={{ fontSize: '13px', margin: '0 0 1px 0', color: '#000', fontWeight: 'bold' }}>{L('CNIC:', 'شناختی نمبر:')} <span dir="ltr">{formatCNIC(customer.cnic)}</span></p>}
              {customer.address && <p style={{ fontSize: '13px', margin: '0', color: '#000', fontWeight: 'bold' }} dir={isUrdu ? 'rtl' : 'ltr'}>{customer.address}</p>}
            </>
          ) : <p style={{ fontSize: '9px', margin: '0' }}>—</p>}
        </div>
        
        {/* Column 2: Guarantor 1 */}
        {guarantors.length >= 1 && (
          <div style={{ flex: 1, border: '1px solid #000', padding: '7px 9px', fontSize: '9px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '9px', margin: '0 0 4px 0', color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{L('GUARANTOR 1', 'ضامن 1')}</p>
            <p style={{ fontWeight: 'bold', fontSize: '12px', margin: '0 0 3px 0', color: '#000' }}>{isUrdu ? (guarantors[0].nameUrdu || guarantors[0].name) : (guarantors[0].name || guarantors[0].nameUrdu)}</p>
            {guarantors[0].fatherName && <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#000', fontWeight: 'bold' }}>{L('S/O:', 'والد:')} {isUrdu ? (guarantors[0].fatherNameUrdu || guarantors[0].father_name_urdu || guarantors[0].fatherName || guarantors[0].father_name) : (guarantors[0].fatherName || guarantors[0].father_name)}</p>}
            <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#000', fontWeight: 'bold' }}>{L('Contact:', 'رابطہ:')} <span dir="ltr">{formatPhone(guarantors[0].phone)}</span></p>
            {guarantors[0].cnic && <p style={{ fontSize: '9px', margin: '0 0 1px 0', color: '#000', fontWeight: 'bold' }}>{L('CNIC:', 'شناختی نمبر:')} <span dir="ltr">{formatCNIC(guarantors[0].cnic)}</span></p>}
            {guarantors[0].relation && <p style={{ fontSize: '9px', margin: '0 0 1px 0', color: '#000', fontWeight: 'bold' }}>{L('Relation:', 'رشتہ:')} {guarantors[0].relation}</p>}
            {guarantors[0].address && <p style={{ fontSize: '13px', margin: '0', color: '#000', fontWeight: 'bold' }} dir={isUrdu ? 'rtl' : 'ltr'}>{guarantors[0].address}</p>}
          </div>
        )}
        
        {/* Column 3: Guarantor 2 */}
        {guarantors.length >= 2 && (
          <div style={{ flex: 1, border: '1px solid #000', padding: '7px 9px', fontSize: '9px' }}>
            <p style={{ fontWeight: 'bold', fontSize: '9px', margin: '0 0 4px 0', color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{L('GUARANTOR 2', 'ضامن 2')}</p>
            <p style={{ fontWeight: 'bold', fontSize: '12px', margin: '0 0 3px 0', color: '#000' }}>{isUrdu ? (guarantors[1].nameUrdu || guarantors[1].name) : (guarantors[1].name || guarantors[1].nameUrdu)}</p>
            {guarantors[1].fatherName && <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#000', fontWeight: 'bold' }}>{L('S/O:', 'والد:')} {isUrdu ? (guarantors[1].fatherNameUrdu || guarantors[1].father_name_urdu || guarantors[1].fatherName || guarantors[1].father_name) : (guarantors[1].fatherName || guarantors[1].father_name)}</p>}
            <p style={{ fontSize: '10px', margin: '0 0 2px 0', color: '#000', fontWeight: 'bold' }}>{L('Contact:', 'رابطہ:')} <span dir="ltr">{formatPhone(guarantors[1].phone)}</span></p>
            {guarantors[1].cnic && <p style={{ fontSize: '9px', margin: '0 0 1px 0', color: '#000', fontWeight: 'bold' }}>{L('CNIC:', 'شناختی نمبر:')} <span dir="ltr">{formatCNIC(guarantors[1].cnic)}</span></p>}
            {guarantors[1].relation && <p style={{ fontSize: '9px', margin: '0 0 1px 0', color: '#000', fontWeight: 'bold' }}>{L('Relation:', 'رشتہ:')} {guarantors[1].relation}</p>}
            {guarantors[1].address && <p style={{ fontSize: '13px', margin: '0', color: '#000', fontWeight: 'bold' }} dir={isUrdu ? 'rtl' : 'ltr'}>{guarantors[1].address}</p>}
          </div>
        )}
        
        {/* Column 4: Receipt Details */}
        <div style={{ flex: 1, border: '1px solid #000', padding: '7px 9px', textAlign: 'center', fontSize: '9px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '9px', margin: '0 0 4px 0', color: '#000', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '2px' }}>{L('RECEIPT DETAILS', 'رسید کی تفصیلات')}</p>
          <p style={{ fontSize: '10px', margin: '0 0 3px 0', color: '#000', fontWeight: 'bold' }}>{L('Plan No.:', 'پلان نمبر:')} <span style={{ fontWeight: 'bold' }}>{planId.slice(-8)}</span></p>
          <p style={{ fontSize: '10px', margin: '0 0 3px 0', color: '#000', fontWeight: 'bold' }}>{L('Plan Created By:', 'پلان بنانے والا:')} {planCreatorName}</p>
          <p style={{ fontSize: '10px', margin: '0 0 3px 0', color: '#000', fontWeight: 'bold' }}>{L('Date:', 'تاریخ:')} {formatDate(new Date().toISOString())}</p>
          <p style={{ fontSize: '10px', margin: '0 0 3px 0', color: '#000', fontWeight: 'bold' }}>{L('Time:', 'وقت:')} {formatTime(new Date().toISOString())}</p>
          <p style={{ fontSize: '12px', margin: '0', color: '#000', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '4px' }}>{L('Total:', 'کل:')} <span style={{ fontSize: '13px' }}>Rs {total.toFixed(0)}</span></p>
        </div>
      </div>

      {/* PRODUCT DETAILS */}
      {(plan?.serialNumber || plan?.imei || plan?.engineNo || plan?.chassisNo || plan?.model || plan?.color || plan?.company || product?.company) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 10px', border: '1px solid #000', padding: '5px 8px', marginBottom: '10px', fontSize: '9px', fontWeight: 'bold', color: '#000' }}>
          {plan?.company || product?.company ? (
            <span><strong>{L('Company:', 'کمپنی:')}</strong> {isUrdu ? (plan?.companyUrdu || plan?.company || product?.companyUrdu || product?.company) : (plan?.company || product?.company)}</span>
          ) : null}
          {plan?.model ? <span><strong>{L('Model:', 'ماڈل:')}</strong> {plan.model}</span> : null}
          {plan?.color ? <span><strong>{L('Color:', 'رنگ:')}</strong> {plan.color}</span> : null}
          {plan?.serialNumber ? <span><strong>{L('S/N:', 'سیریل نمبر:')}</strong> {plan.serialNumber}</span> : null}
          {plan?.imei ? <span><strong>{L('IMEI:', 'آئی ایم ای آئی:')}</strong> {plan.imei}</span> : null}
          {plan?.engineNo ? <span><strong>{L('Engine:', 'انجن نمبر:')}</strong> {plan.engineNo}</span> : null}
          {plan?.chassisNo ? <span><strong>{L('Chassis:', 'شاسی نمبر:')}</strong> {plan.chassisNo}</span> : null}
        </div>
      )}

      {/* ITEMS TABLE */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '10px', fontSize: '10px' }}>
        <thead>
          <tr style={{ backgroundColor: '#000', color: 'white' }}>
            <th style={{ border: '1px solid #000', padding: '5px 4px', width: '6%', textAlign: 'center', fontWeight: 'bold' }}>#</th>
            <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'left', fontWeight: 'bold' }}>{L('Item Name', 'آئٹم کا نام')}</th>
            <th style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'left', fontWeight: 'bold' }}>{L('Description', 'تفصیل')}</th>
            <th style={{ border: '1px solid #000', padding: '5px 4px', width: '8%', textAlign: 'center', fontWeight: 'bold' }}>{L('Qty', 'مقدار')}</th>
            <th style={{ border: '1px solid #000', padding: '5px 4px', width: '18%', textAlign: 'right', fontWeight: 'bold' }}>{L('Price/Unit', 'فی یونٹ قیمت')}</th>
            <th style={{ border: '1px solid #000', padding: '5px 4px', width: '18%', textAlign: 'right', fontWeight: 'bold' }}>{L('Amount', 'رقم')}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>1</td>
            <td style={{ border: '1px solid #000', padding: '5px 4px', fontWeight: 'bold', color: '#000' }}>{isUrdu ? (productNameUrdu || productName || '—') : (productName || productNameUrdu || '—')}</td>
            <td style={{ border: '1px solid #000', padding: '5px 4px', color: '#000', fontWeight: 'bold' }}>{isAdvanceReceipt ? L('Advance Payment', 'ایڈوانس ادائیگی') : L('Installment Payment', 'قسط کی ادائیگی')}</td>
            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'center', fontWeight: 'bold' }}>1</td>
            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>Rs {receiptDisplayAmount.toFixed(2)}</td>
            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>Rs {receiptDisplayAmount.toFixed(2)}</td>
          </tr>
          <tr style={{ fontWeight: 'bold' }}>
            <td colSpan={4} style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', color: '#000' }}>{L('Total', 'کل')}</td>
            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right' }}></td>
            <td style={{ border: '1px solid #000', padding: '5px 4px', textAlign: 'right', background: '#e0e0e0', fontWeight: 'bold', color: '#000' }}>Rs {receiptDisplayAmount.toFixed(2)}</td>
          </tr>
        </tbody>
      </table>

      {/* AMOUNT IN WORDS */}
      <div style={{ border: '1px solid #000', display: 'inline-block', padding: '4px 12px', fontSize: '10px', fontWeight: 'bold', marginBottom: '10px', color: '#000' }}>
        {L('Invoice Amount: Rupees', 'انوائس کی رقم: روپے')} {Math.floor(receiptDisplayAmount).toLocaleString()} {L('only', 'صرف')}
      </div>

      {/* PAYMENT DETAILS */}
      <div style={{ border: '1px solid #000', padding: '8px', marginBottom: '10px', background: '#fafafa' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 'bold', color: '#000', fontSize: '10px' }}>
              <span>{L('Down Payment:', 'پیشگی ادائیگی:')}</span><span>Rs {down.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 'bold', color: '#000', fontSize: '10px' }}>
              <span>{L('Total Remaining:', 'کل باقی:')}</span><span>Rs {remaining.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderTop: '1px dashed #000', paddingTop: '3px', marginTop: '2px', fontWeight: 'bold', color: '#000', fontSize: '10px' }}>
              <span>{L('This Payment:', 'یہ ادائیگی:')}</span><span style={{ fontWeight: 'bold' }}>Rs {lastPaymentAmount.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 'bold', color: '#000', fontSize: '10px' }}>
              <span>{L('Total Paid:', 'کل ادائیگی:')}</span><span style={{ fontWeight: 'bold' }}>Rs {totalPaid.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 'bold', color: '#000', fontSize: '10px' }}>
              <span>{L('Balance:', 'بقیہ:')}</span><span>Rs {outstanding.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontWeight: 'bold', borderTop: '1px solid #000', paddingTop: '3px', marginTop: '2px', color: '#000', fontSize: '10px' }}>
              <span>{L('Remaining:', 'بقایا:')}</span><span style={{ fontWeight: 'bold' }}>Rs {outstanding.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* INSTALLMENT STATS */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px', textAlign: 'center' }}>
        <div style={{ flex: 1, border: '1px solid #000', padding: '5px', background: '#f5f5f5' }}>
          <p style={{ fontWeight: 'bold', fontSize: '9px', margin: '0', color: '#000' }}>{L('Total Inst.', 'کل اقساط')}</p>
          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', color: '#000' }}>{instCount}</p>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: '5px', background: '#f5f5f5' }}>
          <p style={{ fontWeight: 'bold', fontSize: '9px', margin: '0', color: '#000' }}>{L('Paid', 'ادا شدہ')}</p>
          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', color: '#000' }}>{paidCount}/{instCount}</p>
        </div>
        <div style={{ flex: 1, border: '1px solid #000', padding: '5px', background: '#f5f5f5' }}>
          <p style={{ fontWeight: 'bold', fontSize: '9px', margin: '0', color: '#000' }}>{L('Remaining', 'باقی')}</p>
          <p style={{ fontSize: '14px', fontWeight: 'bold', margin: '0', color: '#000' }}>{remainingCount}</p>
        </div>
      </div>

      {/* LAST PAYMENT & NEXT DUE */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
        {lastPaid > 0 && (
          <div style={{ flex: 1, border: '1px solid #000', padding: '5px 9px', background: '#f5f5f5' }}>
            <p style={{ fontWeight: 'bold', fontSize: '10px', margin: '0 0 3px 0', color: '#000' }}>✅ {L('Last Payment', 'آخری ادائیگی')}</p>
            <p style={{ fontSize: '9px', margin: '0', color: '#000', fontWeight: 'bold' }}>
              {L('Inst #', 'قسط نمبر ')}{lastPaidInst}: Rs {lastPaymentAmount.toFixed(2)} 
              {lastPaymentDate ? ` | ${L('Date:', 'تاریخ:')} ${formatDate(lastPaymentDate)}` : ''}
              {lastPaymentMethod ? ` | ${L('Method:', 'طریقہ:')} ${lastPaymentMethod}` : ''}
              {lastPaymentCollectedBy ? ` | ${L('Collected By:', 'وصول کنندہ:')} ${lastPaymentCollectedBy}` : ''}
              {excessForwarded > 0 ? ` | ${L('Excess fwd:', 'اضافی:')} Rs ${excessForwarded.toFixed(2)}` : ''}
              {carriedFromLast > 0 ? ` | ${L('Shortfall:', 'کمی:')} Rs ${carriedFromLast.toFixed(2)}` : ''}
            </p>
          </div>
        )}
        {nextInst && (
          <div style={{ flex: 1, border: '1px solid #000', padding: '5px 9px', background: '#f5f5f5' }}>
            <p style={{ fontWeight: 'bold', fontSize: '10px', margin: '0 0 3px 0', color: '#000' }}>⏰ {L('Next Due', 'اگلی قسط')}</p>
            <p style={{ fontSize: '9px', margin: '0', color: '#000', fontWeight: 'bold' }}>
              {L('Inst #', 'قسط نمبر ')}{nextInst.installmentNo}: Rs {nextInst.amount.toFixed(2)} 
              {nextInst.dueDate ? ` | ${L('Due:', 'واجب الادا:')} ${formatDate(nextInst.dueDate)}` : ''}
              {excessForwarded > 0 ? ` | ${L('After fwd:', 'اضافی کے بعد:')} Rs ${Math.max(0, nextInst.amount - excessForwarded).toFixed(2)}` : ''}
              {carriedFromLast > 0 ? ` | ${L('With shortfall:', 'کمی سمیت:')} Rs ${(nextInst.amount + carriedFromLast).toFixed(2)}` : ''}
            </p>
          </div>
        )}
      </div>

      {/* PAYMENT HISTORY TABLE with Collected By */}
      {payments.length > 0 && (
        <div style={{ marginBottom: '10px' }}>
          <p style={{ fontWeight: 'bold', fontSize: '10px', margin: '0 0 5px 0', color: '#000', borderBottom: '2px solid #000', display: 'inline-block', paddingBottom: '2px' }}>
            {L('PAYMENT HISTORY', 'ادائیگیوں کی تاریخ')}
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
            <thead>
              <tr style={{ backgroundColor: '#000', color: 'white' }}>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '5%', fontWeight: 'bold' }}>#</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'left', fontWeight: 'bold' }}>{L('Item', 'آئٹم')}</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '15%', fontWeight: 'bold' }}>{L('Date', 'تاریخ')}</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'right', width: '12%', fontWeight: 'bold' }}>{L('Paid', 'ادا کردہ')}</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'right', width: '12%', fontWeight: 'bold' }}>{L('Remaining', 'باقی')}</th>
                <th style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', width: '12%', fontWeight: 'bold' }}>{L('Collected By', 'وصول کنندہ')}</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p: any, idx: number) => {
                const paidSoFar = payments.slice(0, idx + 1).reduce((sum: number, pay: any) => sum + (pay.amount || 0), 0);
                const remainingAfter = Math.max(0, remaining - paidSoFar);
                const collectedByName = p.collectedBy || p.collected_by || '';
                return (
                  <tr key={p.id || idx}>
                    <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 3px', fontWeight: 'bold', color: '#000' }}>
                      {isUrdu ? (productNameUrdu || productName || '—') : (productName || productNameUrdu || '—')}
                      {p.installmentNo > 0 && (
                        <span style={{ fontSize: '7px' }}> ({L('Inst #', 'قسط نمبر ')}{p.installmentNo})</span>
                      )}
                      {p.installmentNo === 0 && (
                        <span style={{ fontSize: '7px' }}> ({L('Advance', 'ایڈوانس')})</span>
                      )}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                      {p.transactionDate ? formatDate(p.transactionDate) : (p.createdAt ? formatDate(p.createdAt) : (p.payment_date ? formatDate(p.payment_date) : (p.date ? formatDate(p.date) : '—')))}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>Rs {(p.amount || 0).toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'right', fontWeight: 'bold', color: '#000' }}>Rs {remainingAfter.toFixed(2)}</td>
                    <td style={{ border: '1px solid #000', padding: '4px 3px', textAlign: 'center', fontWeight: 'bold', color: '#000' }}>
                      {collectedByName || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* FOOTER */}
      <div style={{ textAlign: 'center', fontSize: '9px', borderTop: '2px solid #000', paddingTop: '6px', marginTop: '5px' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 3px 0', color: '#000', fontSize: '10px' }}>{L('Thank you for choosing RANA-AWAIS Electronics!', 'رانا اویس الیکٹرانکس کا انتخاب کرنے کا شکریہ!')}</p>
        <p style={{ margin: '0', color: '#000', fontWeight: 'bold', fontSize: '8px' }}>{L('Software by:', 'سافٹ ویئر بذریعہ:')} Huzaifa (0313-6487199)</p>
      </div>
    </div>
  );

  // DOWNLOAD
  const download = async () => {
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const el = document.getElementById('payment-receipt-print');
      if (!el) throw new Error('Element not found');
      
      const originalWidth = el.style.width;
      const originalMaxWidth = el.style.maxWidth;
      el.style.width = '750px';
      el.style.maxWidth = '750px';
      
      const canvas = await html2canvas(el, { 
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        width: 750,
        height: el.scrollHeight,
        windowWidth: 750,
      });
      
      el.style.width = originalWidth;
      el.style.maxWidth = originalMaxWidth;
      
      canvas.toBlob((blob) => {
        if (!blob) { toast.error('Failed'); setDownloading(false); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `Payment_Receipt_${planId.slice(-8)}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        toast.success('✅ Downloaded!');
        setDownloading(false);
      }, 'image/png', 1.0);
    } catch {
      toast.error('Download failed');
      setDownloading(false);
    }
  };

  // PRINT
  const handlePrint = () => {
    const el = document.getElementById('payment-receipt-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=850,height=1100');
    if (!win) return;
    const dir = isUrdu ? 'rtl' : 'ltr';
    const font = isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" : "'Times New Roman', Georgia, serif";
    win.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}">
        <head>
          <title>Payment Receipt</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: ${font}; display: flex; justify-content: center; padding: 20px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 0.3in; }
            @media print { body { padding: 0; } }
            .print-wrapper { max-width: 750px; width: 100%; margin: 0 auto; }
            table { direction: ${dir}; }
            .no-break { page-break-inside: avoid; break-inside: avoid; }
          </style>
        </head>
        <body><div class="print-wrapper">${el.outerHTML}</div><script>window.onload = () => setTimeout(() => window.print(), 400);</script></body>
      </html>
    `);
    win.document.close();
  };

  const whatsapp = () => {
    const ph = (customer?.phone || '').replace(/\D/g, '');
    if (!ph) { toast.error('No phone number found'); return; }
    let w = ph.startsWith('0') ? '92' + ph.slice(1) : ph;
    if (!w.startsWith('92')) w = '92' + w;
    window.open(`https://wa.me/${w}`, '_blank');
    toast.success('Press Ctrl+V to paste the receipt image', { duration: 3500 });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8"><div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div></div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-5 py-3 border-b" style={{ flexDirection: isUrdu ? 'row-reverse' : 'row' }}>
          <h2 className="text-base font-semibold text-gray-800">📋 {L('Payment Receipt', 'ادائیگی رسید')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-xl">✕</button>
        </div>
        <div className="p-5 flex justify-center">{receiptContent}</div>
        <div className="sticky bottom-0 bg-white border-t p-3 flex gap-2 justify-center flex-wrap">
          <button onClick={onClose} className="px-4 py-2 bg-gray-100 rounded-lg text-xs font-medium">❌ {L('Close', 'بند کریں')}</button>
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-800 text-white rounded-lg text-xs font-medium">🖨️ {L('Print', 'پرنٹ')}</button>
          <button onClick={download} disabled={downloading} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-xs font-medium disabled:opacity-60">
            {downloading ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin inline-block mr-1"></span> : null}
            📥 {L('Download', 'ڈاؤن لوڈ')}
          </button>
          <button onClick={whatsapp} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-xs font-medium">💬 WhatsApp</button>
        </div>
      </div>
    </div>
  );
};

export default PaymentReceipt;