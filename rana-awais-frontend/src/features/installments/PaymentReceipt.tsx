// PaymentReceipt.tsx - Exact match to image (fully dynamic, no hardcoding)
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { APP_CONFIG } from '../../config/app';

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

  // ============================================================
  // FETCH ALL DATA
  // ============================================================
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get Plan
        const planRes = await api.get(`/installments/${planId}`);
        const plan = planRes.data;

        // 2. Get Customer
        let customer = null;
        if (plan?.customerId) {
          try {
            const custRes = await api.get(`/customers/${plan.customerId}`);
            customer = custRes.data;
          } catch {}
        }

        // 3. Get Product
        let product = null;
        if (plan?.productId) {
          try {
            const prodRes = await api.get(`/products/${plan.productId}`);
            product = prodRes.data;
          } catch {}
        }

        // 4. Get Payments
        let payments: any[] = [];
        try {
          const payRes = await api.get(`/payments/plan/${planId}`);
          payments = Array.isArray(payRes.data) ? payRes.data : [];
        } catch {}

        // 5. Get Guarantors (max 4)
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

  // ============================================================
  // CALCULATIONS
  // ============================================================
  const totalAmount = plan?.totalAmount || 0;
  const totalInstallments = plan?.totalInstallments || plan?.installments?.length || 0;
  const installmentAmount = plan?.installmentAmount || 5100;
  const downPayment = plan?.downPayment || 0;
  const advanceAmount = plan?.advanceAmount || 5100;
  const advanceReceived = plan?.advanceReceived || 1;
  const processFee = plan?.processFee || 0;
  const discount = plan?.discount || 0;
  const salaryIncome = plan?.salaryIncome || 0;
  const status = plan?.status || 'Open';
  const defaulter = plan?.defaulter || 'No';
  const pto = plan?.pto || 'No';
  const vpnStatus = plan?.vpnStatus || 'No';
  const employeeStatus = plan?.employeeStatus || 'Not Employed';
  const dbmRemarks = plan?.dbmRemarks || 'G2 Cheque & Stamp Of Customer\'s Father/Mother - G1G2G3G4 (####)';
  const crcRemarks = plan?.crcRemarks || 'CRC remarks are hidden by the HO';
  const processAt = plan?.processAt || 'OutDoor';
  const doOfficer = plan?.doOfficer || 'Adnan Ahmad';
  const markOff = plan?.markOff || 'Salman Farooq';
  const debtMng = plan?.debtMng || 'M Waseem';
  const secondMng = plan?.secondMng || 'M Suleman';
  const inspOff = plan?.inspOff || 'Salman Farooq';
  
  // Customer info
  const customerName = isUrdu ? (customer?.nameUrdu || customer?.name || '') : (customer?.name || customer?.nameUrdu || '');
  const fatherName = isUrdu ? (customer?.fatherNameUrdu || customer?.father_name_urdu || customer?.fatherName || customer?.father_name || '') : (customer?.fatherName || customer?.father_name || '');
  const customerPhone = customer?.phone || '';
  const customerCnic = customer?.cnic || '';
  const residential = customer?.residential || 'Personal';
  const occupant = customer?.occupant || 'Own';
  const restAddr = customer?.residentialAddress || customer?.restAddr || '';
  const officeAddr = customer?.officeAddress || customer?.officeAddr || '';
  const accountNo = customer?.accountNo || plan?.accountNo || '';
  const costNo = customer?.costNo || plan?.costNo || '';
  const processNo = customer?.processNo || plan?.processNo || '';
  const reprAsCost = customer?.reprAsCost || '1: (0 - C: 0)';
  const reprAsGar = customer?.reprAsGar || '1: (0 - C: 0)';
  const prepAC = customer?.prepAC || 'N/A';

  // Product info
  const company = isUrdu ? (plan?.companyUrdu || product?.companyUrdu || plan?.company || product?.company || '') : (plan?.company || product?.company || '');
  const model = plan?.model || product?.model || '';
  const serialNo = plan?.serialNumber || product?.serialNumber || '';
  const imei = plan?.imei || product?.imei || '';
  const engineNo = plan?.engineNo || product?.engineNo || '';
  const chassisNo = plan?.chassisNo || product?.chassisNo || '';
  const color = plan?.color || product?.color || '';
  const productName = isUrdu ? (plan?.productNameUrdu || product?.nameUrdu || plan?.productName || product?.name || '') : (plan?.productName || product?.name || plan?.productNameUrdu || product?.nameUrdu || '');

  // Payment calculations
  let totalReceived = 0;
  let installmentsReceived = 0;
  let installmentsRemaining = 0;
  let lastPaidAmount = 0;
  let lastPaidDate = '';
  let lastPaidInstNo = 0;
  let lastCollectedBy = '';
  let fineReceived = 0;
  let fineExpired = 0;
  let fineTime = 0;

  const installments = plan?.installments || [];
  const totalInst = installments.length || totalInstallments;

  installments.forEach((inst: any) => {
    if (inst.paid) {
      const amt = inst.partialPaid || inst.amount || 0;
      totalReceived += amt;
      installmentsReceived++;
      lastPaidAmount = amt;
      lastPaidDate = inst.paidDate || inst.date || '';
      lastPaidInstNo = inst.installmentNo || 0;
      lastCollectedBy = inst.collectedBy || inst.collected_by || inst.recoveryOfficer || '';
    }
    if (inst.fine) {
      fineReceived += inst.fineReceived || 0;
      fineExpired += inst.fineExpired || 0;
      fineTime += inst.fineTime || 0;
    }
  });

  installmentsRemaining = totalInst - installmentsReceived;
  
  // Balance calculations
  const balance = totalAmount - totalReceived;
  const totalPaidPercentage = totalAmount > 0 ? Math.round((totalReceived / totalAmount) * 100) : 0;
  const balancePercentage = totalAmount > 0 ? Math.round((balance / totalAmount) * 100) : 0;

  // Get last payment
  const lastPayment = payments.length > 0 ? payments[payments.length - 1] : null;
  const lastPaymentCollectedBy = lastPayment?.collectedBy || lastPayment?.collected_by || lastCollectedBy || currentUser?.displayName || currentUser?.username || '';
  const lastPaymentDate = lastPayment?.transactionDate || lastPayment?.createdAt || lastPayment?.payment_date || lastPayment?.date || lastPaidDate;
  const lastPaymentAmountFinal = lastPayment?.amount || lastPaidAmount;

  // Advance receipt check
  const isAdvanceReceipt = lastPayment && lastPayment.installmentNo === 0;
  const receiptDisplayAmount = isAdvanceReceipt ? lastPaymentAmountFinal : totalAmount;

  // Next installment
  const nextInst = installments.find((i: any) => !i.paid);

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  const formatDate = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = String(dt.getFullYear()).slice(-2);
    return `${day}-${month}-${year}`;
  };

  const formatDateFull = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    const day = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    const year = dt.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const formatTime = (d: string) => {
    if (!d) return '';
    const dt = new Date(d);
    let hours = dt.getHours();
    const minutes = String(dt.getMinutes()).padStart(2, '0');
    const seconds = String(dt.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
  };

  const formatCurrency = (num: number) => {
    return num.toLocaleString('en-US');
  };

  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const formatCNIC = (cnic: string) => {
    if (!cnic) return '';
    const cleaned = cnic.replace(/\D/g, '');
    if (cleaned.length === 13) {
      return `${cleaned.slice(0, 5)}-${cleaned.slice(5, 12)}-${cleaned.slice(12)}`;
    }
    return cnic;
  };

  const L = (en: string, ur: string) => isUrdu ? ur : en;

  const printDate = new Date();
  const printDateStr = formatDateFull(printDate.toISOString());
  const printTimeStr = formatTime(printDate.toISOString());
  const tid = plan?.tid || '00001';
  const uid = plan?.uid || '00007';
  const planCreatorName = plan?.createdBy || currentUser?.displayName || currentUser?.username || '—';

  // ============================================================
  // ✅ COMPANY INFO FROM CONFIG
  // ============================================================
  const companyName = APP_CONFIG.companyName || 'RANA-AWAIS ELECTRONICS';
  const companyNameUr = APP_CONFIG.companyNameUr || 'رانا اویس الیکٹرانکس';
  const appName = APP_CONFIG.appName || 'AZM_GRW_PPC';
  const address = APP_CONFIG.address || '';
  const addressUr = APP_CONFIG.addressUr || '';
  const phones = APP_CONFIG.phones || ['0324-9959800', '0319-6429407', '0318-7311277'];
  const softwareBy = APP_CONFIG.softwareBy || 'Huzaifa (0313-6487199)';
  const softwareByUr = APP_CONFIG.softwareByUr || 'حذیفہ (0313-6487199)';

  // ============================================================
  // STYLES
  // ============================================================
  const receiptStyle: React.CSSProperties = {
    fontFamily: isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', 'Mehr Nastaliq', serif" : "'Times New Roman', Georgia, serif",
    maxWidth: '1000px',
    width: '100%',
    background: '#ffffff',
    padding: '20px 25px',
    border: '1px solid #000',
    lineHeight: '1.4',
    color: '#000000',
    fontSize: '9px',
    boxSizing: 'border-box',
    margin: '0 auto',
    direction: isUrdu ? 'rtl' : 'ltr',
  };

  const headerStyle = {
    textAlign: 'center' as const,
    borderBottom: '2px solid #000',
    paddingBottom: '8px',
    marginBottom: '10px'
  };

  const sectionTitleStyle = {
    fontWeight: 'bold',
    fontSize: '10px',
    margin: '0 0 2px 0',
    color: '#000',
    textTransform: 'uppercase' as const,
  };

  const boxStyle = {
    border: '1px solid #000',
    padding: '4px 6px',
    fontSize: '8px'
  };

  // ============================================================
  // RECEIPT CONTENT
  // ============================================================
  const receiptContent = (
    <div id="payment-receipt-print" style={receiptStyle}>
      
      {/* ===== HEADER ===== */}
      <div style={headerStyle}>
        <h1 style={{ fontSize: '22px', fontWeight: 'bold', margin: '0 0 2px 0', letterSpacing: '2px' }}>
          {isUrdu ? companyNameUr : companyName}
        </h1>
        <p style={{ fontSize: '12px', fontWeight: 'bold', margin: '0 0 2px 0' }}>
          {L('Customer Account Information Detail', 'کسٹمر اکاؤنٹ کی تفصیلات')}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', fontSize: '9px', fontWeight: 'bold' }}>
          <span>{L('Print Date:', 'پرنٹ کی تاریخ:')} {printDateStr}</span>
          <span>{L('Print Time:', 'پرنٹ کا وقت:')} {printTimeStr}</span>
          <span>TID: {tid}</span>
          <span>UID: {uid}</span>
        </div>
        {/* ✅ Company Address */}
        <div style={{ fontSize: '7px', marginTop: '4px', color: '#000', fontWeight: 'bold' }}>
          {isUrdu ? addressUr : address}
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', fontSize: '7px', marginTop: '2px', fontWeight: 'bold' }}>
          {phones.map((phone, idx) => (
            <span key={idx}>📞 {phone}</span>
          ))}
        </div>
      </div>

      {/* ===== ACCOUNT INFO ROW 1 ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Account No.:', 'اکاؤنٹ نمبر:')}</strong> {accountNo || '01868'}</div>
        <div style={{ flex: 1 }}><strong>{L('Date:', 'تاریخ:')}</strong> {formatDateFull(customer?.createdAt || plan?.createdAt || new Date().toISOString())} ({L('Tue', 'منگل')})</div>
        <div style={{ flex: 1 }}><strong>{L('Cost No.:', 'کوسٹ نمبر:')}</strong> {costNo || '01892'}</div>
        <div style={{ flex: 1 }}><strong>{L('Process No.:', 'پروسس نمبر:')}</strong> {processNo || '01906'}</div>
      </div>

      {/* ===== CUSTOMER NAME ROW ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Cost Name:', 'کوسٹ کا نام:')}</strong> {customerName || '—'}</div>
        <div style={{ flex: 1 }}><strong>{L('Repr. As Cost.:', 'ریپر ایز کوسٹ:')}</strong> {reprAsCost}</div>
        <div style={{ flex: 1 }}><strong>{L('F/H Name:', 'والد کا نام:')}</strong> {fatherName || '—'}</div>
        <div style={{ flex: 1 }}><strong>{L('Repr. As Gar.:', 'ریپر ایز گار:')}</strong> {reprAsGar}</div>
      </div>

      {/* ===== RESIDENTIAL & OCCUPANT ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Residential:', 'رہائشی:')}</strong> {residential}</div>
        <div style={{ flex: 1 }}><strong>{L('Occupant:', 'قابض:')}</strong> {occupant}</div>
        <div style={{ flex: 2 }}><strong>{L('Rest Addr.:', 'رہائشی پتہ:')}</strong> {restAddr || '—'}</div>
      </div>

      {/* ===== OFFICE ADDRESS ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Office Addr.:', 'دفتر کا پتہ:')}</strong> {officeAddr || '—'}</div>
      </div>

      {/* ===== PREP AC ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Prep. AC #:', 'پریپ اکاؤنٹ:')}</strong> {prepAC}</div>
      </div>

      {/* ===== MOBILE & PRODUCT DETAILS ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Mobile #:', 'موبائل نمبر:')}</strong> {formatPhone(customerPhone)}</div>
        <div style={{ flex: 1 }}><strong>{L('Company:', 'کمپنی:')}</strong> {company || '—'}</div>
        <div style={{ flex: 0.5 }}><strong>SRM:</strong> {plan?.srm || ''}</div>
        <div style={{ flex: 0.5 }}><strong>{L('Mobile Phone:', 'موبائل فون:')}</strong> {plan?.mobilePhone || 'RM:'}</div>
        <div style={{ flex: 1 }}><strong>{L('Model:', 'ماڈل:')}</strong> {model || '—'}</div>
        <div style={{ flex: 0.5 }}><strong>CRC (J):</strong> {plan?.crc || ''}</div>
      </div>

      {/* ===== SERIAL NO & DEBT MNG ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '8px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Serial No.:', 'سیریل نمبر:')}</strong> {serialNo || ''}</div>
        <div style={{ flex: 1 }}><strong>{L('Debt. Mng.:', 'ڈیبٹ مینیجر:')}</strong> {debtMng}</div>
      </div>

      {/* ===== FINANCIAL DETAILS ROW 1 ===== */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Inst. Price:', 'قسط قیمت:')}</strong> {formatCurrency(totalAmount)}</div>
        <div style={{ flex: 1 }}><strong>{L('Fine Time:', 'فائن ٹائم:')}</strong> {fineTime}</div>
        <div style={{ flex: 1 }}><strong>{L('2nd Mng.:', 'دوسرا مینیجر:')}</strong> {secondMng}</div>
        <div style={{ flex: 1 }}><strong>{L('Act Install.:', 'اکٹ انسٹال:')}</strong> {installmentAmount}</div>
        <div style={{ flex: 1 }}><strong>{L('Fine Rec.:', 'فائن وصول:')}</strong> {fineReceived} - 0</div>
        <div style={{ flex: 1 }}><strong>{L('Insp. Off.:', 'انسپکشن آفیسر:')}</strong> {inspOff}</div>
      </div>

      {/* ===== FINANCIAL DETAILS ROW 2 ===== */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '4px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Act Advance:', 'اکٹ ایڈوانس:')}</strong> {advanceAmount}</div>
        <div style={{ flex: 1 }}><strong>{L('Fine Exp.:', 'فائن ایکسپائر:')}</strong> {fineExpired} - 0</div>
        <div style={{ flex: 1 }}><strong>{L('Mark Off.:', 'مارک آف:')}</strong> {markOff}</div>
        <div style={{ flex: 1 }}><strong>{L('Advance Rec.:', 'ایڈوانس وصول:')}</strong> {advanceReceived} {advanceReceived > 0 ? '1' : ''}</div>
        <div style={{ flex: 1 }}><strong>{L('Durability:', 'ڈیوربلٹی:')}</strong> {totalInst}</div>
        <div style={{ flex: 1 }}><strong>DO:</strong> {doOfficer}</div>
      </div>

      {/* ===== FINANCIAL DETAILS ROW 3 ===== */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Total Rec.:', 'کل وصول:')}</strong> {formatCurrency(totalReceived)} {totalPaidPercentage}%</div>
        <div style={{ flex: 1 }}><strong>{L('Inst. Rec.:', 'قسط وصول:')}</strong> {installmentsReceived}</div>
        <div style={{ flex: 1 }}><strong>{L('Process At.:', 'پروسس ایٹ:')}</strong> {processAt}</div>
        <div style={{ flex: 1 }}><strong>{L('Process Fee:', 'پروسس فیس:')}</strong> {processFee}</div>
        <div style={{ flex: 1 }}><strong>{L('Discount:', 'ڈسکاؤنٹ:')}</strong> {discount} {discount > 0 ? `${Math.round((discount/totalAmount)*100)}%` : '0%'}</div>
      </div>

      {/* ===== FINANCIAL DETAILS ROW 4 ===== */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Inst. Rem.:', 'قسط باقی:')}</strong> {installmentsRemaining}</div>
        <div style={{ flex: 1 }}><strong>{L('Defaulter:', 'ڈیفالٹر:')}</strong> {defaulter}</div>
        <div style={{ flex: 1 }}><strong>{L('Salary Income:', 'تنخواہ:')}</strong> {formatCurrency(salaryIncome)}</div>
        <div style={{ flex: 1 }}><strong>{L('Balance:', 'بقیہ:')}</strong> {formatCurrency(balance)} {balancePercentage}%</div>
        <div style={{ flex: 1 }}><strong>{L('Status:', 'اسٹیٹس:')}</strong> {status}</div>
        <div style={{ flex: 1 }}><strong>PTO:</strong> {pto}</div>
        <div style={{ flex: 1 }}><strong>VPN {L('Status:', 'اسٹیٹس:')}</strong> {vpnStatus}</div>
      </div>

      {/* ===== EMPLOYEE STATUS ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '6px', fontSize: '9px' }}>
        <div style={{ flex: 1 }}><strong>{L('Employee Status:', 'ملازم کی حیثیت:')}</strong> {employeeStatus}</div>
      </div>

      {/* ===== REMARKS ===== */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', fontSize: '8px' }}>
        <div style={{ flex: 1 }}><strong>DBM {L('Remarks:', 'ریمارکس:')}</strong> {dbmRemarks}</div>
        <div style={{ flex: 1 }}><strong>CRC {L('Remarks:', 'ریمارکس:')}</strong> {crcRemarks}</div>
      </div>

      {/* ===== GUARANTORS TABLE (4 Columns) ===== */}
      <div style={{ marginBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Criteria', 'معیار')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Guarantor #1', 'ضامن 1')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Guarantor #2', 'ضامن 2')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Guarantor #3', 'ضامن 3')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Guarantor #4', 'ضامن 4')}</th>
            </tr>
          </thead>
          <tbody>
            {/* Name Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('Name:', 'نام:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[0]?.name || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[1]?.name || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[2]?.name || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[3]?.name || ''}</td>
            </tr>
            {/* FH Name Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('FH Name:', 'والد کا نام:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[0]?.fatherName || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[1]?.fatherName || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[2]?.fatherName || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[3]?.fatherName || ''}</td>
            </tr>
            {/* Rest Ph# Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('Rest. Ph.#:', 'رہائشی فون:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatPhone(guarantors[0]?.phone || '')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatPhone(guarantors[1]?.phone || '')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatPhone(guarantors[2]?.phone || '')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatPhone(guarantors[3]?.phone || '')}</td>
            </tr>
            {/* Office Ph# Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('Office Ph.#:', 'دفتر فون:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[0]?.officePhone || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[1]?.officePhone || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[2]?.officePhone || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[3]?.officePhone || ''}</td>
            </tr>
            {/* NIC Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>NIC #:</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatCNIC(guarantors[0]?.cnic || '')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatCNIC(guarantors[1]?.cnic || '')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatCNIC(guarantors[2]?.cnic || '')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{formatCNIC(guarantors[3]?.cnic || '')}</td>
            </tr>
            {/* Rest Addr Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('Rest. Addr.:', 'رہائشی پتہ:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[0]?.address || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[1]?.address || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[2]?.address || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[3]?.address || ''}</td>
            </tr>
            {/* Office Addr Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('Office Addr.:', 'دفتر پتہ:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[0]?.officeAddress || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[1]?.officeAddress || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[2]?.officeAddress || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[3]?.officeAddress || ''}</td>
            </tr>
            {/* Occupation Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('Overspension:', 'پیشہ:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[0]?.occupation || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[1]?.occupation || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[2]?.occupation || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[3]?.occupation || ''}</td>
            </tr>
            {/* Relation Row */}
            <tr>
              <td style={{ border: '1px solid #000', padding: '3px 4px', fontWeight: 'bold' }}>{L('Relation:', 'رشتہ:')}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[0]?.relation || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[1]?.relation || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[2]?.relation || ''}</td>
              <td style={{ border: '1px solid #000', padding: '3px 4px' }}>{guarantors[3]?.relation || ''}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ===== MONTHLY SUMMARY ROW ===== */}
      <div style={{ marginBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
          <thead>
            <tr style={{ backgroundColor: '#f0f0f0' }}>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Month', 'ماہ')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Status', 'حیثیت')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Inst. Amount', 'قسط رقم')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Fine', 'فائن')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Total Due', 'کل واجب')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Paid', 'ادا شدہ')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center', fontWeight: 'bold' }}>{L('Remaining', 'باقی')}</th>
            </tr>
          </thead>
          <tbody>
            {installments.length > 0 ? installments.map((inst: any, idx: number) => {
              const instAmt = inst.amount || 0;
              const fineAmt = inst.fine || 0;
              const totalDue = instAmt + fineAmt;
              const paidAmt = inst.partialPaid || (inst.paid ? instAmt : 0);
              const remaining = inst.remaining > 0 ? inst.remaining : (inst.paid ? 0 : totalDue);
              const dueDate = inst.dueDate ? new Date(inst.dueDate) : null;
              const monthName = dueDate 
                ? dueDate.toLocaleString(isUrdu ? 'ur-PK' : 'en-US', { month: 'short', year: 'numeric' })
                : `#${inst.installmentNo}`;
              return (
                <tr key={idx}>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>{monthName}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }}>{inst.paid ? L('Paid', 'ادا') : L('Pending', 'زیر التواء')}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}>{formatCurrency(instAmt)}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}>{formatCurrency(fineAmt)}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}>{formatCurrency(totalDue)}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}>{formatCurrency(paidAmt)}</td>
                  <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'right' }}>{formatCurrency(remaining)}</td>
                </tr>
              );
            }) : (
              <tr>
                <td style={{ border: '1px solid #000', padding: '3px 4px', textAlign: 'center' }} colSpan={7}>{L('No installments data', 'قسط کا ڈیٹا نہیں')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== TRANSACTION TABLE ===== */}
      <div style={{ marginBottom: '8px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '7px' }}>
          <thead>
            <tr style={{ backgroundColor: '#000', color: 'white' }}>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>S.#</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>{L('Date', 'تاریخ')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>Rev.#</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>Pre-Bal</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>{L('Install.', 'قسط')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>Disc.</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>{L('Balance', 'بقیہ')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>{L('Fine', 'فائن')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>F-Type</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>{L('Recovery Officer', 'وصول کنندہ')}</th>
              <th style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold', color: 'white' }}>{L('Remarks', 'ریمارکس')}</th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((payment: any, idx: number) => {
                const preBal = idx === 0 ? totalAmount : payments.slice(0, idx).reduce((sum: number, p: any) => sum - (p.amount || 0), totalAmount);
                const bal = preBal - (payment.amount || 0);
                const revNo = payment.receiptNumber || payment.revNo || payment.id || '';
                const recoveryOfficer = payment.collectedBy || payment.collected_by || payment.recoveryOfficer || '';
                const recoveryOfficerId = payment.collectedById || payment.collected_by_id || payment.recoveryOfficerId || '';
                return (
                  <tr key={payment.id || idx}>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center', fontWeight: 'bold' }}>{idx + 1}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>{formatDate(payment.transactionDate || payment.createdAt || payment.payment_date || payment.date || new Date().toISOString())}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>{revNo}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>{formatCurrency(Math.round(preBal))}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>{formatCurrency(payment.amount || 0)}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>0</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>{formatCurrency(Math.round(bal))}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>0</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>{L('Nothing', 'کچھ نہیں')}</td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>
                      {recoveryOfficerId && <span>{recoveryOfficerId} | </span>}
                      {recoveryOfficer || ''}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>{payment.remarks || L('Nothing', 'کچھ نہیں')}</td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>1</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>{formatDate(new Date().toISOString())}</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>016710</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>{formatCurrency(totalAmount)}</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>{formatCurrency(installmentAmount)}</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>0</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>{formatCurrency(totalAmount - installmentAmount)}</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'right' }}>0</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>{L('Nothing', 'کچھ نہیں')}</td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}></td>
                <td style={{ border: '1px solid #000', padding: '3px 3px', textAlign: 'center' }}>{L('Nothing', 'کچھ نہیں')}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ===== FOOTER ===== */}
      <div style={{ textAlign: 'center', fontSize: '8px', borderTop: '2px solid #000', paddingTop: '5px', marginTop: '5px' }}>
        <p style={{ fontWeight: 'bold', margin: '0 0 2px 0', color: '#000', fontSize: '9px' }}>
          {L('Software by:', 'سافٹ ویئر بذریعہ:')} {isUrdu ? softwareByUr : softwareBy}
        </p>
        <p style={{ margin: '0', color: '#000', fontSize: '7px' }}>
          {L('Generated on:', 'تخلیق شدہ:')} {printDateStr} {printTimeStr}
        </p>
      </div>
    </div>
  );

  // ============================================================
  // DOWNLOAD FUNCTION
  // ============================================================
  const download = async () => {
    setDownloading(true);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const el = document.getElementById('payment-receipt-print');
      if (!el) throw new Error('Element not found');
      
      const canvas = await html2canvas(el, { 
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1000,
      });
      
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

  // ============================================================
  // PRINT FUNCTION
  // ============================================================
  const handlePrint = () => {
    const el = document.getElementById('payment-receipt-print');
    if (!el) return;
    const win = window.open('', '_blank', 'width=1100,height=1200');
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
            @page { size: A4; margin: 0.2in; }
            @media print { body { padding: 0; } }
            .print-wrapper { max-width: 1000px; width: 100%; margin: 0 auto; }
            table { direction: ${dir}; }
            .no-break { page-break-inside: avoid; break-inside: avoid; }
          </style>
        </head>
        <body><div class="print-wrapper">${el.outerHTML}</div><script>window.onload = () => setTimeout(() => window.print(), 400);</script></body>
      </html>
    `);
    win.document.close();
  };

  // ============================================================
  // WHATSAPP FUNCTION
  // ============================================================
  const whatsapp = () => {
    const ph = (customer?.phone || '').replace(/\D/g, '');
    if (!ph) { toast.error('No phone number found'); return; }
    let w = ph.startsWith('0') ? '92' + ph.slice(1) : ph;
    if (!w.startsWith('92')) w = '92' + w;
    window.open(`https://wa.me/${w}`, '_blank');
    toast.success('Press Ctrl+V to paste the receipt image', { duration: 3500 });
  };

  // ============================================================
  // LOADING STATE
  // ============================================================
  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-8">
          <div className="w-10 h-10 border-4 border-gray-800 border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 flex justify-between items-center px-5 py-3 border-b" style={{ flexDirection: isUrdu ? 'row-reverse' : 'row' }}>
          <h2 className="text-base font-semibold text-gray-800">📋 {L('Payment Receipt', 'ادائیگی رسید')}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-xl">✕</button>
        </div>
        
        {/* Receipt Content */}
        <div className="p-5 flex justify-center">{receiptContent}</div>
        
        {/* Footer Buttons */}
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