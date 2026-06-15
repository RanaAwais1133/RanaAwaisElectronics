import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getInstallmentsByCustomer } from '../../utils/api';
import CustomerSearch from '../../components/forms/CustomerSearch';
import PaymentModal from './PaymentModal';
import BulkPaymentModal from './BulkPaymentModal';
import PlanReceipt from './PlanReceipt';
import RescheduleModal from './RescheduleModal';
import api from '../../utils/api';
import { useCustomerStore } from '../../store/useCustomerStore';
import { formatPhone, formatCNIC } from '../../utils/helpers';

const InstallmentList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();

  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorDetails, setErrorDetails] = useState('');

  // Filters
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [singlePay, setSinglePay] = useState<any>(null);
  const [advancePay, setAdvancePay] = useState<string | null>(null);
  const [bulkPay, setBulkPay] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [receiptPlanId, setReceiptPlanId] = useState<string | null>(null);
  const [reschedulePlan, setReschedulePlan] = useState<{ id: string; status: string } | null>(null);

  const { fetchCustomers } = useCustomerStore();

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  useEffect(() => {
    const custFromUrl = searchParams.get('customer_id');
    if (custFromUrl && custFromUrl !== selectedCustomer) setSelectedCustomer(custFromUrl);
  }, [searchParams, selectedCustomer]);

  useEffect(() => {
    if (!selectedCustomer) { setPlans([]); setError(''); setErrorDetails(''); return; }
    setLoading(true); setError(''); setErrorDetails('');
    getInstallmentsByCustomer(selectedCustomer)
      .then(data => setPlans(Array.isArray(data) ? data : []))
      .catch((err) => { setErrorDetails(err?.response?.data?.error || err?.message); setError(t('error_loading_installments')); })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomer]);

  const refresh = () => {
    if (selectedCustomer) {
      setLoading(true);
      getInstallmentsByCustomer(selectedCustomer)
        .then(data => setPlans(Array.isArray(data) ? data : []))
        .catch((err) => { setErrorDetails(err?.response?.data?.error || err?.message); setError(t('error_loading_installments')); })
        .finally(() => setLoading(false));
    }
    setSelectedIds(new Set());
  };

  const toggleSelection = (planId: string, instNo: number) => {
    const key = `${planId}_${instNo}`;
    setSelectedIds(prev => { const next = new Set(prev); next.has(key) ? next.delete(key) : next.add(key); return next; });
  };

  const getSelectedForPlan = (planId: string) => {
    const result: Array<{ installment_no: number; amount: number }> = [];
    const plan = plans.find(p => p.id === planId);
    if (!plan) return result;
    (plan.installments || []).forEach((inst: any) => {
      if (selectedIds.has(`${planId}_${inst.installmentNo}`) && !inst.paid) {
        const dueAmount = inst.remaining > 0 ? inst.remaining : inst.amount;
        result.push({ installment_no: inst.installmentNo, amount: dueAmount });
      }
    });
    return result;
  };

  const handleDeletePlan = async () => {
    if (!deletePlanId) return;
    try { await api.delete(`/installments/${deletePlanId}`); toast.success(t('plan_deleted')); refresh(); }
    catch { toast.error(t('error_deleting_plan')); }
    setDeletePlanId(null);
  };

  const isUrdu = i18n.language === 'ur';

  // Print all plans for the selected customer
  const handlePrintAllPlans = useCallback(async () => {
    if (!selectedCustomer || plans.length === 0) return;
    
    // Get customer details from store
    const customers = useCustomerStore.getState().customers;
    const customer = customers.find(c => c.id === selectedCustomer);
    
    // Fetch product details and guarantors for each plan
    const enrichedPlans = await Promise.all(plans.map(async (plan: any) => {
      let product = null;
      let guarantors: any[] = [];
      
      try {
        const prodRes = await api.get(`/products/${plan.productId}`);
        product = prodRes.data;
      } catch {}
      
      const guarantorIds = customer?.guarantorIds;
      if (guarantorIds && guarantorIds.length > 0) {
        const guarPromises = guarantorIds.map((gId: string) =>
          api.get(`/guarantors/${gId}`).then(r => r.data).catch(() => null)
        );
        const results = await Promise.all(guarPromises);
        guarantors = results.filter(g => g !== null);
      }
      
      return { ...plan, product, guarantors };
    }));
    
    const formatDate = (d: string) => {
      if (!d) return '—';
      const dt = new Date(d);
      return `${String(dt.getDate()).padStart(2,'0')}/${String(dt.getMonth()+1).padStart(2,'0')}/${dt.getFullYear()}`;
    };
    
    const L = (en: string, ur: string) => isUrdu ? ur : en;
    
    // Build HTML for each plan
    let allHtml = '';
    enrichedPlans.forEach((plan: any, idx: number) => {
      const productName = plan.productName || plan.product?.name || 'Installment Plan';
      const productNameUrdu = plan.productNameUrdu || plan.product?.nameUrdu || '';
      const total = plan.totalAmount || 0;
      const remaining = plan.remainingAmount || 0;
      const down = plan.downPayment || 0;
      const instCount = plan.installments?.length || 0;
      const paidCount = (plan.installments || []).filter((i: any) => i.paid === true).length;
      const totalPaid = total - remaining;
      const planCreatorName = plan.createdBy || '—';
      
      const productDetails = {
        name: productName,
        nameUrdu: productNameUrdu,
        serial: plan.serialNumber || plan.product?.serialNumber || '',
        model: plan.model || plan.product?.model || '',
        color: plan.color || plan.product?.color || '',
        company: plan.company || plan.product?.company || '',
        companyUrdu: plan.companyUrdu || plan.product?.companyUrdu || '',
        engine: plan.engineNo || plan.product?.engineNo || '',
        chassis: plan.chassisNo || plan.product?.chassisNo || '',
        imei: plan.imei || plan.product?.imei || '',
      };
      
      // Guarantors HTML
      const guarantors = plan.guarantors || [];
      let guarantor1Html = '';
      let guarantor2Html = '';
      if (guarantors.length >= 1) {
        const g = guarantors[0];
        guarantor1Html = `
          <div style="flex:1;border:1px solid #000;padding:4px 6px;font-size:8px;">
            <p style="font-weight:bold;font-size:7px;margin:0 0 2px 0;color:#000;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:1px;">${L('GUARANTOR 1', 'ضامن 1')}</p>
            <p style="font-weight:bold;font-size:10px;margin:0 0 1px 0;color:#000;">${isUrdu ? (g.nameUrdu || g.name) : (g.name || g.nameUrdu)}</p>
            ${g.fatherName ? `<p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('S/O:', 'والد:')} ${isUrdu ? (g.fatherNameUrdu || g.father_name_urdu || g.fatherName || g.father_name) : (g.fatherName || g.father_name)}</p>` : ''}
            <p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Contact:', 'رابطہ:')} <span dir="ltr">${formatPhone(g.phone)}</span></p>
            ${g.cnic ? `<p style="font-size:7px;margin:0 0 1px 0;color:#000;font-weight:bold;">CNIC: <span dir="ltr">${formatCNIC(g.cnic)}</span></p>` : ''}
            ${g.relation ? `<p style="font-size:7px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Relation:', 'رشتہ:')} ${g.relation}</p>` : ''}
            ${g.address ? `<p style="font-size:8px;margin:0;color:#000;font-weight:bold;" dir="${isUrdu ? 'rtl' : 'ltr'}">${g.address}</p>` : ''}
          </div>`;
      }
      if (guarantors.length >= 2) {
        const g = guarantors[1];
        guarantor2Html = `
          <div style="flex:1;border:1px solid #000;padding:4px 6px;font-size:8px;">
            <p style="font-weight:bold;font-size:7px;margin:0 0 2px 0;color:#000;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:1px;">${L('GUARANTOR 2', 'ضامن 2')}</p>
            <p style="font-weight:bold;font-size:10px;margin:0 0 1px 0;color:#000;">${isUrdu ? (g.nameUrdu || g.name) : (g.name || g.nameUrdu)}</p>
            ${g.fatherName ? `<p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('S/O:', 'والد:')} ${isUrdu ? (g.fatherNameUrdu || g.father_name_urdu || g.fatherName || g.father_name) : (g.fatherName || g.father_name)}</p>` : ''}
            <p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Contact:', 'رابطہ:')} <span dir="ltr">${formatPhone(g.phone)}</span></p>
            ${g.cnic ? `<p style="font-size:7px;margin:0 0 1px 0;color:#000;font-weight:bold;">CNIC: <span dir="ltr">${formatCNIC(g.cnic)}</span></p>` : ''}
            ${g.relation ? `<p style="font-size:7px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Relation:', 'رشتہ:')} ${g.relation}</p>` : ''}
            ${g.address ? `<p style="font-size:8px;margin:0;color:#000;font-weight:bold;" dir="${isUrdu ? 'rtl' : 'ltr'}">${g.address}</p>` : ''}
          </div>`;
      }
      
      // Build installment rows
      let instRows = '';
      (plan.installments || []).forEach((inst: any, iIdx: number) => {
        const dueDate = inst.dueDate ? formatDate(inst.dueDate) : '—';
        const instAmt = inst.amount || 0;
        const isPaid = inst.paid === true;
        const partialPaid = inst.partialPaid || 0;
        
        let statusText, paidAmt, payDate, remainingAmt;
        if (isPaid) {
          statusText = L('Paid', 'ادا شدہ');
          paidAmt = 'Rs ' + instAmt.toFixed(0);
          payDate = inst.paidDate ? formatDate(inst.paidDate) : '—';
          remainingAmt = 'Rs 0';
        } else if (partialPaid > 0) {
          statusText = L('Partial', 'جزوی');
          paidAmt = 'Rs ' + partialPaid.toFixed(0);
          payDate = inst.paidDate ? formatDate(inst.paidDate) : '—';
          remainingAmt = 'Rs ' + (instAmt - partialPaid).toFixed(0);
        } else {
          statusText = L('Due', 'باقی');
          paidAmt = '—';
          payDate = '—';
          remainingAmt = 'Rs ' + instAmt.toFixed(0);
        }
        
        instRows += `<tr>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:bold;color:#000;font-size:9px;">${iIdx + 1}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:bold;color:#000;font-size:9px;">${dueDate}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:right;font-weight:bold;color:#000;font-size:9px;">Rs ${instAmt.toFixed(0)}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:bold;color:#000;font-size:9px;">${paidAmt}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:bold;color:#000;font-size:9px;">${payDate}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:right;font-weight:bold;color:#000;font-size:9px;">${remainingAmt}</td>
          <td style="border:1px solid #000;padding:4px 3px;text-align:center;font-weight:bold;color:#000;font-size:9px;">${statusText}</td>
        </tr>`;
      });
      
      allHtml += `
        <div class="receipt" style="font-family:${isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" : "'Times New Roman', Georgia, serif"};max-width:750px;width:100%;background:#fff;padding:10px 14px;border:1.5px solid #000;line-height:1.3;color:#000;font-size:10px;box-sizing:border-box;margin:0 auto 10px auto;direction:${isUrdu ? 'rtl' : 'ltr'};page-break-after:always;page-break-inside:avoid;break-inside:avoid;">
          
          <!-- HEADER - Compact -->
          <div style="text-align:center;border-bottom:1.5px solid #000;padding-bottom:4px;margin-bottom:6px;">
            <h1 style="font-size:14px;font-weight:bold;margin:0;letter-spacing:1px;color:#000;">RANA-AWAIS ELECTRONICS</h1>
          </div>
          
          <!-- CUSTOMER + GUARANTORS + PRODUCT SUMMARY - 3 Column -->
          <div style="display:flex;gap:4px;margin-bottom:5px;">
            <!-- Customer -->
            <div style="flex:1;border:1px solid #000;padding:4px 6px;font-size:8px;">
              <p style="font-weight:bold;font-size:7px;margin:0 0 2px 0;color:#000;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:1px;">${L('CUSTOMER', 'گاہک')}</p>
              ${customer ? `
                <p style="font-weight:bold;font-size:10px;margin:0 0 1px 0;color:#000;">${isUrdu ? (customer.nameUrdu || customer.name) : (customer.name || customer.nameUrdu)}</p>
                ${customer.fatherName ? `<p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('S/O:', 'والد:')} ${isUrdu ? (customer.fatherNameUrdu || customer.father_name_urdu || customer.fatherName || customer.father_name) : (customer.fatherName || customer.father_name)}</p>` : ''}
                <p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Contact:', 'رابطہ:')} <span dir="ltr">${formatPhone(customer.phone)}</span></p>
                ${customer.cnic ? `<p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">CNIC: <span dir="ltr">${formatCNIC(customer.cnic)}</span></p>` : ''}
                ${customer.address ? `<p style="font-size:8px;margin:0;color:#000;font-weight:bold;" dir="${isUrdu ? 'rtl' : 'ltr'}">${customer.address}</p>` : ''}
              ` : '<p style="font-size:8px;margin:0;">—</p>'}
            </div>
            ${guarantor1Html || ''}
            ${guarantor2Html || ''}
            <!-- Product Summary -->
            <div style="flex:1;border:1px solid #000;padding:4px 6px;font-size:8px;">
              <p style="font-weight:bold;font-size:7px;margin:0 0 2px 0;color:#000;text-transform:uppercase;border-bottom:1px solid #000;padding-bottom:1px;">${L('PRODUCT', 'پروڈکٹ')}</p>
              <p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${isUrdu ? (productDetails.nameUrdu || productDetails.name) : (productDetails.name || productDetails.nameUrdu)}</p>
              <p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Down:', 'بیعانہ:')} Rs ${down.toFixed(0)} | ${L('Paid:', 'ادا:')} Rs ${totalPaid.toFixed(0)}</p>
              <p style="font-size:8px;margin:0 0 1px 0;color:#000;font-weight:bold;">${L('Remain:', 'باقی:')} Rs ${remaining.toFixed(0)} | ${L('Inst:', 'اقساط:')} ${paidCount}/${instCount}</p>
              <p style="font-size:8px;margin:0;color:#000;font-weight:bold;">${L('Plan By:', 'پلان:')} ${planCreatorName}</p>
            </div>
          </div>
          
          <!-- INSTALLMENT TABLE - Compact -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:4px;font-size:8px;">
            <thead>
              <tr style="background-color:#000;color:white;">
                <th style="border:1px solid #000;padding:2px 2px;text-align:center;font-weight:bold;font-size:8px;">#</th>
                <th style="border:1px solid #000;padding:2px 2px;text-align:center;font-weight:bold;font-size:8px;">${L('Due Date', 'تاریخ')}</th>
                <th style="border:1px solid #000;padding:2px 2px;text-align:center;font-weight:bold;font-size:8px;">${L('Amount', 'رقم')}</th>
                <th style="border:1px solid #000;padding:2px 2px;text-align:center;font-weight:bold;font-size:8px;">${L('Paid', 'ادا')}</th>
                <th style="border:1px solid #000;padding:2px 2px;text-align:center;font-weight:bold;font-size:8px;">${L('Pay Date', 'تاریخ')}</th>
                <th style="border:1px solid #000;padding:2px 2px;text-align:center;font-weight:bold;font-size:8px;">${L('Remain', 'باقی')}</th>
                <th style="border:1px solid #000;padding:2px 2px;text-align:center;font-weight:bold;font-size:8px;">${L('Status', 'حالت')}</th>
              </tr>
            </thead>
            <tbody>${instRows}</tbody>
          </table>
          
          <!-- FOOTER - Minimal -->
          <div style="text-align:center;font-size:7px;border-top:1.5px solid #000;padding-top:3px;margin-top:3px;">
            <p style="margin:0;font-weight:bold;font-size:8px;">${L('Thank you for choosing RANA-AWAIS Electronics!', 'رانا اویس الیکٹرانکس کا انتخاب کرنے کا شکریہ!')}</p>
          </div>
        </div>`;
    });
    
    // Open print window
    const printWindow = window.open('', '_blank', 'width=850,height=1100');
    if (!printWindow) return;
    const dir = isUrdu ? 'rtl' : 'ltr';
    const font = isUrdu ? "'Noto Nastaliq Urdu', 'Jameel Noori Nastaleeq', serif" : "'Times New Roman', Georgia, serif";
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${dir}">
        <head>
          <title>${L('All Plans Receipt', 'تمام پلان کی رسید')}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: ${font}; padding: 15px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            @page { size: A4; margin: 0.2in; }
            @media print { body { padding: 0; } .receipt { page-break-inside: avoid; break-inside: avoid; } }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
          </style>
        </head>
        <body>
          ${allHtml}
          <script>window.onload = function() { setTimeout(function() { window.print(); }, 500); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [selectedCustomer, plans, isUrdu]);

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-white">{t('installments')}</h1>
      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">{t('select_customer')}</label>
        <CustomerSearch
          selectedCustomerId={selectedCustomer}
          onSelect={(id) => setSelectedCustomer(id)}
        />
      </div>

      {/* Filters */}
      {selectedCustomer && plans.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full sm:w-auto flex items-end">
              <button onClick={handlePrintAllPlans} className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm">
                🖨️ {isUrdu ? 'تمام پلان پرنٹ کریں' : 'Print All Plans'}
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('status')}</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400">
                <option value="all">{t('all')}</option>
                <option value="active">{t('active')}</option>
                <option value="completed">{t('completed')}</option>
                <option value="defaulted">{t('defaulted')}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('from_date')}</label>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('to_date')}</label>
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('search')}</label>
              <input type="text" placeholder={isUrdu ? 'نام یا فون نمبر...' : 'Name or phone...'} value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400 w-48" />
            </div>
            <button onClick={() => { setFilterStatus('all'); setFilterDateFrom(''); setFilterDateTo(''); setSearchQuery(''); }} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
              {t('clear')}
            </button>
          </div>
        </div>
      )}

      {loading && <div className="flex justify-center py-16"><div className="spinner"></div></div>}

      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-500 mb-2 font-semibold">{error}</p>
          {errorDetails && <p className="text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg inline-block mb-4">{errorDetails}</p>}
          <div className="flex justify-center gap-3"><button onClick={refresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">{t('retry')}</button><button onClick={() => { setError(''); setErrorDetails(''); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm">{t('cancel')}</button></div>
        </div>
      )}

      {!loading && !error && !selectedCustomer && <p className="text-center py-16 text-gray-500">{t('no_customer_selected')}</p>}
      {!loading && !error && selectedCustomer && plans.length === 0 && <p className="text-center py-16 text-gray-500">{t('no_installments')}</p>}

      {!loading && !error && plans.map(plan => {
        const selectedForPlan = getSelectedForPlan(plan.id);
        return (
          <div key={plan.id} className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="p-4 sm:p-5 flex flex-wrap justify-between items-center border-b border-gray-100 dark:border-gray-700">
              <div><h3 className="font-semibold text-lg text-gray-800 dark:text-white">{t('plan_id')}: {plan.id.slice(-8)}</h3><p className="text-sm text-gray-500">{t('total_amount')}: Rs. {plan.totalAmount}{plan.createdBy ? ` | ${t('created_by') || 'Created By'}: ${plan.createdBy}` : ''}</p></div>

              <div className="flex items-center gap-2 mt-2 sm:mt-0 flex-wrap">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">{t('status')}: {plan.status}</span>
                <button onClick={() => setAdvancePay(plan.id)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700">{t('advance_payment')}</button>
                {selectedForPlan.length > 0 && <button onClick={() => setBulkPay({ planId: plan.id, selectedInstallments: selectedForPlan })} className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-xs hover:bg-yellow-700">{t('pay_selected')} ({selectedForPlan.length})</button>}
                {(plan.status === 'defaulted' || plan.status === 'overdue') && (
                  <button onClick={() => setReschedulePlan({ id: plan.id, status: plan.status })} className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-all" title={isUrdu ? 'دوبارہ شیڈول کریں' : 'Reschedule'}>
                    🔄 {isUrdu ? 'دوبارہ شیڈول' : 'Reschedule'}
                  </button>
                )}
                <button onClick={() => setReceiptPlanId(plan.id)} className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-all" title={t('view_receipt')}>🧾 {t('receipt')}</button>
                <button onClick={() => setDeletePlanId(plan.id)} className="px-2 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-xs hover:bg-red-200 dark:hover:bg-red-900/50" title={t('delete')}>🗑️</button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-sm">
                <thead className="bg-gray-50 dark:bg-gray-750 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <tr><th className="px-4 py-2 text-start">#</th><th className="px-4 py-2 text-start">{t('due_date')}</th><th className="px-4 py-2 text-start">{t('amount')}</th><th className="px-4 py-2 text-start">{t('paid')}</th><th className="px-4 py-2 text-start">{t('paid_date') || 'Paid Date'}</th><th className="px-4 py-2 text-start">{isUrdu ? 'باقی' : 'Remaining'}</th><th className="px-4 py-2 text-start">{t('action')}</th><th className="px-4 py-2 text-center">{t('select')}</th></tr>


                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {(plan.installments || []).map((inst: any) => {
                    const key = `${plan.id}_${inst.installmentNo}`;
                    return (
                      <tr key={inst.installmentNo} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors text-gray-800 dark:text-gray-200">
                        <td className="px-4 py-2">{inst.installmentNo}</td>
                        <td className="px-4 py-2">{(() => { const d = new Date(inst.dueDate); return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`; })()}</td>
                        <td className="px-4 py-2 font-medium">Rs. {(inst.paid ? (inst.partialPaid > 0 ? inst.partialPaid : inst.amount) : (inst.remaining > 0 && inst.remaining < inst.amount ? inst.remaining : inst.amount)).toFixed(2)}</td>
                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${inst.paid ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : inst.partialPaid > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' : 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'}`}>{inst.paid ? t('paid') : inst.partialPaid > 0 ? (isUrdu ? 'جزوی' : 'Partial') : t('pending')}</span></td>
                        <td className="px-4 py-2 text-xs">
                          {(() => {
                            // Try multiple sources for payment date
                            const pd = inst.paidDate || inst.paid_date || null;
                            if (pd) {
                              try {
                                const dd = new Date(pd); return `${String(dd.getDate()).padStart(2,'0')}/${String(dd.getMonth()+1).padStart(2,'0')}/${dd.getFullYear()}`;
                              } catch(e) {
                                return pd;
                              }
                            }
                            // If paid but no date, try to find from payments array
                            if (inst.paid && plan.payments && plan.payments.length > 0) {
                              const matchingPayments = plan.payments.filter((p: any) => p.installment_no === inst.installmentNo || p.installmentNo === inst.installmentNo);
                              if (matchingPayments.length > 0) {
                                const latestPay = matchingPayments.sort((a: any, b: any) => new Date(b.transaction_date || b.payment_date || 0).getTime() - new Date(a.transaction_date || a.payment_date || 0).getTime())[0];
                                const payDate = latestPay.transaction_date || latestPay.payment_date;
                                if (payDate) {
                                  try {
                                    const dd2 = new Date(payDate); return `${String(dd2.getDate()).padStart(2,'0')}/${String(dd2.getMonth()+1).padStart(2,'0')}/${dd2.getFullYear()}`;
                                  } catch(e) {
                                    return payDate;
                                  }
                                }
                              }
                            }
                            return isUrdu ? 'ادا شدہ' : 'Paid';
                          })()}
                        </td>

                        <td className="px-4 py-2 font-medium text-xs">
                          {(() => {
                            const instAmt = inst.amount || 0;
                            const partialPaid = inst.partialPaid || 0;
                            if (inst.paid) return <span className="text-emerald-600 dark:text-emerald-400">Rs 0</span>;
                            if (partialPaid > 0) return <span className="text-amber-600 dark:text-amber-400">Rs {(instAmt - partialPaid).toFixed(0)}</span>;
                            return <span className="text-rose-600 dark:text-rose-400">Rs {instAmt.toFixed(0)}</span>;
                          })()}
                        </td>
                        <td className="px-4 py-2">{!inst.paid && <button onClick={() => setSinglePay({ planId: plan.id, installmentNo: inst.installmentNo, dueAmount: inst.remaining > 0 && inst.remaining < inst.amount ? inst.remaining : inst.amount, finePerDay: plan.finePerDay || 10, graceDays: plan.gracePeriodDays || 2, dueDate: inst.dueDate })} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition-colors">{t('pay')}</button>}</td>

                        <td className="px-4 py-2 text-center">{!inst.paid && <input type="checkbox" checked={selectedIds.has(key)} onChange={() => toggleSelection(plan.id, inst.installmentNo)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />}</td>
                      </tr>

                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}

      {singlePay && <PaymentModal {...singlePay} mode="single" onClose={() => setSinglePay(null)} onSuccess={refresh} />}
      {advancePay && <PaymentModal planId={advancePay} mode="advance" onClose={() => setAdvancePay(null)} onSuccess={refresh} />}
      {bulkPay && <BulkPaymentModal planId={bulkPay.planId} selectedInstallments={bulkPay.selectedInstallments} onClose={() => setBulkPay(null)} onSuccess={refresh} />}
      {receiptPlanId && <PlanReceipt planId={receiptPlanId} onClose={() => setReceiptPlanId(null)} />}
      {deletePlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold mb-4">{t('delete_plan_confirm_title')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('delete_plan_confirm_message')}</p>
            <div className="flex justify-end gap-3"><button onClick={() => setDeletePlanId(null)} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700">{t('cancel')}</button><button onClick={handleDeletePlan} className="px-4 py-2 rounded-lg bg-red-600 text-white">{t('delete')}</button></div>
          </div>
        </div>
      )}
      {reschedulePlan && (
        <RescheduleModal planId={reschedulePlan.id} planStatus={reschedulePlan.status} onClose={() => setReschedulePlan(null)} onSuccess={refresh} />
      )}
    </div>
  );
};

export default InstallmentList;
