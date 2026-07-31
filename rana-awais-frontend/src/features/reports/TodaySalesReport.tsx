import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';
import { formatPhone } from '../../utils/helpers';

type TabType = 'sold' | 'plans' | 'payments';

interface SoldItem {
  id: string;
  productId: string;
  product_name: string;
  product_name_urdu: string;
  serialNumber: string;
  color: string;
  model: string;
  company: string;
  selling_price: number;
  purchase_price: number;
  sold_date: string;
  customer_name?: string;
  plan_id?: string;
}

interface PlanEntry {
  id: string;
  customer_name: string;
  customer_urdu: string;
  father_name: string;
  phone: string;
  product_name: string;
  total_amount: number;
  down_payment: number;
  remaining_amount: number;
  num_installments: number;
  created_at: string;
  created_by: string;
}

interface PaymentEntry {
  id: string;
  customer_name: string;
  amount: number;
  method: string;
  transaction_date: string;
  collected_by: string;
  receipt_number: string;
  plan_id: string;
  installment_no: number;
}

const TodaySalesReport: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore(s => s.user);
  const clientInfo = useClientStore(s => s.info);

  // Date state
  const today = new Date().toISOString().split('T')[0];
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('sold');

  // Data state
  const [soldItems, setSoldItems] = useState<SoldItem[]>([]);
  const [plans, setPlans] = useState<PlanEntry[]>([]);
  const [payments, setPayments] = useState<PaymentEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    document.title = `${isUrdu ? 'فروخت کی رپورٹ' : "Sales Report"} | ${clientInfo.name}`;
  }, [isUrdu, clientInfo.name]);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError('');
    const toDateEnd = toDate + 'T23:59:59';

    try {
      // ⚡ Parallel lightweight API calls (no heavy dashboard endpoint)
      const results = await Promise.allSettled([
        // 1. Sold items
        api.get(`/inventory/sold?start=${fromDate}&end=${toDateEnd}`),
        // 2. All installment plans (fast, uses skip/limit)
        api.get(`/installments?skip=0&limit=500`),
        // 3. Daybook payments - use accounting/today instead of heavy /dashboard/summary
        api.get(`/accounting/today`),
      ]);

      // Process sold items
      if (results[0].status === 'fulfilled') {
        const soldRes = results[0].value;
        let rawSold: any[] = [];
        if (Array.isArray(soldRes.data)) rawSold = soldRes.data;
        else if (soldRes.data?.data) rawSold = soldRes.data.data;
        const enriched: SoldItem[] = rawSold.map((item: any) => ({
          id: item.id || item._id,
          productId: item.productId || item.product_id,
          product_name: item.product_name || '',
          product_name_urdu: item.product_name_urdu || '',
          serialNumber: item.serialNumber || '',
          color: item.color || '',
          model: item.model || '',
          company: item.company || '',
          selling_price: item.selling_price || item.sellingPrice || 0,
          purchase_price: item.purchase_price || item.purchasePrice || 0,
          sold_date: item.sold_date || item.soldDate || '',
        }));
        setSoldItems(enriched);
      } else { setSoldItems([]); }

      // Process plans
      if (results[1].status === 'fulfilled') {
        const plansRes = results[1].value;
        let allPlans: any[] = [];
        if (Array.isArray(plansRes.data)) allPlans = plansRes.data;
        else if (plansRes.data?.data) allPlans = plansRes.data.data;
        const filteredPlans: PlanEntry[] = [];
        for (const p of allPlans) {
          const planDate = p.created_at || p.createdAt || p.CreatedAt || '';
          if (planDate && planDate >= fromDate && planDate <= toDateEnd) {
            filteredPlans.push({
              id: p.id || p._id || p.ID,
              customer_name: p.customer_name || p.customerName || '',
              customer_urdu: p.customer_urdu || '',
              father_name: p.father_name || p.fatherName || '',
              phone: p.phone || '',
              product_name: p.product_name || p.productName || '',
              total_amount: p.total_amount || p.totalAmount || 0,
              down_payment: p.down_payment || p.downPayment || 0,
              remaining_amount: p.remaining_amount || p.remainingAmount || 0,
              num_installments: p.num_installments || p.numInstallments || 0,
              created_at: planDate,
              created_by: p.created_by || p.createdBy || '',
            });
          }
        }
        setPlans(filteredPlans);
      } else { setPlans([]); }

      // Process payments from accounting/today daybook
      if (results[2].status === 'fulfilled') {
        const accRes = results[2].value;
        const daybook = accRes.data?.daybook_details || accRes.data?.daybookDetails || [];
        const filteredPayments: PaymentEntry[] = (Array.isArray(daybook) ? daybook : [])
          .filter((p: any) => {
            const date = p.transaction_date || p.transactionDate || p.date || '';
            return date >= fromDate && date <= toDate;
          })
          .map((p: any) => ({
            id: p.id,
            customer_name: p.customer_name || '',
            amount: p.amount || 0,
            method: p.method || '',
            transaction_date: p.transaction_date || p.date || '',
            collected_by: p.collected_by || '',
            receipt_number: p.receipt_number || '',
            plan_id: '',
            installment_no: 0,
          }));
        setPayments(filteredPayments);
      } else { setPayments([]); }

    } catch {
      setError(isUrdu ? 'ڈیٹا لوڈ کرنے میں ناکامی' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, isUrdu]);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // Filtering
  const activeData = useMemo(() => {
    const data = activeTab === 'sold' ? soldItems : activeTab === 'plans' ? plans : payments;
    if (!search) return data;
    const q = search.toLowerCase();
    return data.filter((item: any) => {
      const searchStr = [
        item.product_name, item.product_name_urdu, item.customer_name, item.customer_urdu,
        item.serialNumber, item.company, item.model, item.phone, item.father_name,
        item.collected_by, item.receipt_number, item.method, item.created_by
      ].filter(Boolean).join(' ').toLowerCase();
      return searchStr.includes(q);
    });
  }, [activeTab, soldItems, plans, payments, search]);

  // Totals
  const totalSoldValue = useMemo(() =>
    soldItems.reduce((s, i) => s + (i.selling_price || 0), 0), [soldItems]);
  const totalCostValue = useMemo(() =>
    soldItems.reduce((s, i) => s + (i.purchase_price || 0), 0), [soldItems]);
  const totalPlansAmount = useMemo(() =>
    plans.reduce((s, p) => s + p.total_amount, 0), [plans]);
  const totalPaymentsCollected = useMemo(() =>
    payments.reduce((s, p) => s + p.amount, 0), [payments]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const tabLabel = activeTab === 'sold' ? (isUrdu ? 'فروخت شدہ مصنوعات' : 'Products Sold') :
      activeTab === 'plans' ? (isUrdu ? 'بنائے گئے پلان' : 'Plans Created') :
      (isUrdu ? 'جمع شدہ ادائیگیاں' : 'Payments Collected');

    const buildRows = () => {
      if (activeTab === 'sold') {
        return (activeData as SoldItem[]).map((item, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${isUrdu && item.product_name_urdu ? item.product_name_urdu : item.product_name || '—'}</td>
            <td>${item.serialNumber || '—'}</td>
            <td>${item.model || '—'}</td>
            <td>${item.color || '—'}</td>
            <td style="text-align:right">Rs. ${(item.selling_price || 0).toLocaleString()}</td>
            <td style="text-align:right">Rs. ${(item.purchase_price || 0).toLocaleString()}</td>
            <td>${item.sold_date ? new Date(item.sold_date).toLocaleDateString() : '—'}</td>
          </tr>`).join('');
      } else if (activeTab === 'plans') {
        return (activeData as PlanEntry[]).map((plan, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${isUrdu && plan.customer_urdu ? plan.customer_urdu : plan.customer_name}</td>
            <td>${plan.father_name || '—'}</td>
            <td dir="ltr">${plan.phone || '—'}</td>
            <td>${plan.product_name || '—'}</td>
            <td style="text-align:right">Rs. ${plan.total_amount.toLocaleString()}</td>
            <td style="text-align:right">Rs. ${plan.down_payment.toLocaleString()}</td>
            <td style="text-align:right">Rs. ${plan.remaining_amount.toLocaleString()}</td>
            <td>${plan.num_installments}</td>
            <td>${plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '—'}</td>
          </tr>`).join('');
      } else {
        return (activeData as PaymentEntry[]).map((pay, idx) => `
          <tr>
            <td>${idx + 1}</td>
            <td>${pay.customer_name || '—'}</td>
            <td style="text-align:right">Rs. ${pay.amount.toLocaleString()}</td>
            <td>${pay.method || '—'}</td>
            <td>${pay.transaction_date ? new Date(pay.transaction_date).toLocaleDateString() : '—'}</td>
            <td>${pay.collected_by || '—'}</td>
            <td>${pay.receipt_number || '—'}</td>
          </tr>`).join('');
      }
    };

    const buildHeaders = () => {
      if (activeTab === 'sold') {
        return `<th>#</th><th>${isUrdu ? 'پروڈکٹ' : 'Product'}</th><th>${isUrdu ? 'سیریل' : 'Serial'}</th><th>${isUrdu ? 'ماڈل' : 'Model'}</th><th>${isUrdu ? 'رنگ' : 'Color'}</th><th>${isUrdu ? 'فروخت قیمت' : 'Sale Price'}</th><th>${isUrdu ? 'خرید قیمت' : 'Cost'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th>`;
      } else if (activeTab === 'plans') {
        return `<th>#</th><th>${isUrdu ? 'گاہک' : 'Customer'}</th><th>${isUrdu ? 'والد' : 'Father'}</th><th>${isUrdu ? 'فون' : 'Phone'}</th><th>${isUrdu ? 'پروڈکٹ' : 'Product'}</th><th>${isUrdu ? 'کل رقم' : 'Total'}</th><th>${isUrdu ? 'بیعانہ' : 'Down'}</th><th>${isUrdu ? 'باقی' : 'Remaining'}</th><th>${isUrdu ? 'اقساط' : 'Inst'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th>`;
      } else {
        return `<th>#</th><th>${isUrdu ? 'گاہک' : 'Customer'}</th><th>${isUrdu ? 'رقم' : 'Amount'}</th><th>${isUrdu ? 'طریقہ' : 'Method'}</th><th>${isUrdu ? 'تاریخ' : 'Date'}</th><th>${isUrdu ? 'وصول کنندہ' : 'Collected By'}</th><th>${isUrdu ? 'رسید' : 'Receipt'}</th>`;
      }
    };

    printWindow.document.write(`
      <html><head><title>${tabLabel}</title>
      <style>
        body{font-family:'Segoe UI',sans-serif;padding:25px;color:#1f2937}
        h1{text-align:center;font-size:18px;font-weight:700;margin-bottom:4px;color:#111827}
        .subtitle{text-align:center;font-size:11px;color:#6b7280;margin-bottom:18px}
        .summary{display:flex;justify-content:center;gap:24px;margin-bottom:18px}
        .summary-item{text-align:center}
        .summary-item .label{font-size:10px;color:#6b7280}
        .summary-item .value{font-size:15px;font-weight:700;color:#111827}
        table{width:100%;border-collapse:collapse;font-size:11px}
        th{background:#f3f4f6;border:1px solid #e5e7eb;padding:7px 5px;font-weight:600;color:#374151;font-size:10px}
        td{border:1px solid #e5e7eb;padding:5px}
        .footer{text-align:center;margin-top:18px;font-size:9px;color:#9ca3af}
        @media print{body{padding:12px}}
      </style></head>
      <body>
        <h1>${clientInfo.name}</h1>
        <div class="subtitle">${tabLabel} — ${fromDate} ${isUrdu ? 'سے' : 'to'} ${toDate}</div>
        <div class="summary">
          ${activeTab === 'sold' ? `
            <div class="summary-item"><div class="label">${isUrdu ? 'کل آئٹمز' : 'Total Items'}</div><div class="value">${activeData.length}</div></div>
            <div class="summary-item"><div class="label">${isUrdu ? 'کل فروخت' : 'Total Sales'}</div><div class="value">Rs. ${totalSoldValue.toLocaleString()}</div></div>
            <div class="summary-item"><div class="label">${isUrdu ? 'کل لاگت' : 'Total Cost'}</div><div class="value">Rs. ${totalCostValue.toLocaleString()}</div></div>
          ` : activeTab === 'plans' ? `
            <div class="summary-item"><div class="label">${isUrdu ? 'کل پلان' : 'Total Plans'}</div><div class="value">${activeData.length}</div></div>
            <div class="summary-item"><div class="label">${isUrdu ? 'کل رقم' : 'Total Amount'}</div><div class="value">Rs. ${totalPlansAmount.toLocaleString()}</div></div>
          ` : `
            <div class="summary-item"><div class="label">${isUrdu ? 'کل ادائیگیاں' : 'Total Payments'}</div><div class="value">${activeData.length}</div></div>
            <div class="summary-item"><div class="label">${isUrdu ? 'جمع رقم' : 'Collected'}</div><div class="value">Rs. ${totalPaymentsCollected.toLocaleString()}</div></div>
          `}
        </div>
        <table><thead><tr>${buildHeaders()}</tr></thead><tbody>${buildRows()}</tbody></table>
        <div class="footer">${isUrdu ? clientInfo.nameUr || clientInfo.name : clientInfo.name} — ${isUrdu ? 'پرنٹ' : 'Print'}: ${new Date().toLocaleDateString()} | ${isUrdu ? 'بنانے والا' : 'By'}: ${currentUser?.displayName || currentUser?.username || '—'}</div>
        <script>window.onload=function(){setTimeout(function(){window.print();window.close()},300)}</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'sold', label: isUrdu ? 'فروخت شدہ' : 'Products Sold', icon: '📦' },
    { key: 'plans', label: isUrdu ? 'بنائے گئے پلان' : 'Plans Created', icon: '📋' },
    { key: 'payments', label: isUrdu ? 'جمع شدہ ادائیگیاں' : 'Payments Collected', icon: '💵' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
            {isUrdu ? 'فروخت کی رپورٹ' : "Sales Report"}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {activeData.length} {isUrdu ? 'اندراجات' : 'entries'} — {fromDate} {isUrdu ? 'سے' : 'to'} {toDate}
          </p>
        </div>
        <button onClick={handlePrint} disabled={activeData.length === 0}
          className="px-4 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center gap-2 self-start">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {isUrdu ? 'پرنٹ' : 'Print'}
        </button>
      </div>

      {/* Date Range Pickers */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">{isUrdu ? 'از تاریخ' : 'From'}</label>
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-500 uppercase">{isUrdu ? 'تا تاریخ' : 'To'}</label>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
          </div>
          <button onClick={fetchAllData} disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center gap-1.5">
            {loading ? (
              <><span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{isUrdu ? 'لوڈ ہو رہا ہے' : 'Loading'}</>
            ) : (
              <>{isUrdu ? 'دکھائیں' : 'Show'}</>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{isUrdu ? 'فروخت آئٹمز' : 'Sold Items'}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{soldItems.length}</p>
          <p className="text-[10px] text-emerald-600 mt-0.5">Rs. {totalSoldValue.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{isUrdu ? 'منافع' : 'Profit'}</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">Rs. {(totalSoldValue - totalCostValue).toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{isUrdu ? 'نئے پلان' : 'New Plans'}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{plans.length}</p>
          <p className="text-[10px] text-blue-600 mt-0.5">Rs. {totalPlansAmount.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">{isUrdu ? 'وصولی' : 'Collected'}</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white mt-1">{payments.length}</p>
          <p className="text-[10px] text-purple-600 mt-0.5">Rs. {totalPaymentsCollected.toLocaleString()}</p>
        </div>
      </div>

      {/* Tab Buttons */}
      <div className="flex flex-wrap gap-2">
        {tabs.map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}>
            <span>{tab.icon}</span><span>{tab.label}</span>
            <span className="text-xs opacity-75 ml-1">({activeTab === tab.key ? activeData.length : (tab.key === 'sold' ? soldItems.length : tab.key === 'plans' ? plans.length : payments.length)})</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder={isUrdu ? 'تلاش کریں...' : 'Search...'}
          className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm focus:ring-2 focus:ring-gray-400 outline-none" />
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-10 h-10 border-4 border-gray-900 dark:border-white border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-red-500 font-medium">{error}</p>
            <button onClick={fetchAllData} className="px-4 py-2 bg-gray-900 text-white rounded-xl text-sm">{isUrdu ? 'دوبارہ کوشش' : 'Retry'}</button>
          </div>
        ) : activeData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <p className="text-gray-400 font-medium">{isUrdu ? 'کوئی ڈیٹا نہیں' : 'No data found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === 'sold' && (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'پروڈکٹ' : 'Product'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'سیریل' : 'Serial'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'ماڈل' : 'Model'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'رنگ' : 'Color'}</th>
                  <th className="px-4 py-3 text-end text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'فروخت' : 'Sale'}</th>
                  <th className="px-4 py-3 text-end text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'لاگت' : 'Cost'}</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'تاریخ' : 'Date'}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {(activeData as SoldItem[]).map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3"><span className="font-semibold text-gray-800 dark:text-white">{isUrdu && item.product_name_urdu ? item.product_name_urdu : item.product_name || '—'}</span>{item.company && <span className="text-xs text-gray-400 block">{item.company}</span>}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{item.serialNumber || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.model || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{item.color || '—'}</td>
                      <td className="px-4 py-3 text-end font-semibold text-gray-800 dark:text-white">Rs. {(item.selling_price || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-end text-xs text-gray-500">Rs. {(item.purchase_price || 0).toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{item.sold_date ? new Date(item.sold_date).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'plans' && (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'گاہک' : 'Customer'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'والد' : 'Father'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'فون' : 'Phone'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'پروڈکٹ' : 'Product'}</th>
                  <th className="px-4 py-3 text-end text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'کل' : 'Total'}</th>
                  <th className="px-4 py-3 text-end text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'بیعانہ' : 'Down'}</th>
                  <th className="px-4 py-3 text-end text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'باقی' : 'Rem'}</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'اقساط' : 'Inst'}</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'تاریخ' : 'Date'}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {(activeData as PlanEntry[]).map((plan, idx) => (
                    <tr key={plan.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3"><span className="font-semibold text-gray-800 dark:text-white">{isUrdu && plan.customer_urdu ? plan.customer_urdu : plan.customer_name}</span></td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{plan.father_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs" dir="ltr">{formatPhone(plan.phone) || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{plan.product_name || '—'}</td>
                      <td className="px-4 py-3 text-end font-semibold text-gray-800 dark:text-white text-xs">Rs. {plan.total_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-end text-xs text-gray-500">Rs. {plan.down_payment.toLocaleString()}</td>
                      <td className="px-4 py-3 text-end text-xs text-gray-500">Rs. {plan.remaining_amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-center text-xs font-semibold">{plan.num_installments}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{plan.created_at ? new Date(plan.created_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {activeTab === 'payments' && (
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 dark:bg-gray-700/50">
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'گاہک' : 'Customer'}</th>
                  <th className="px-4 py-3 text-end text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'رقم' : 'Amount'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'طریقہ' : 'Method'}</th>
                  <th className="px-4 py-3 text-center text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'تاریخ' : 'Date'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'وصول کنندہ' : 'Collected By'}</th>
                  <th className="px-4 py-3 text-start text-xs font-bold text-gray-500 uppercase">{isUrdu ? 'رسید' : 'Receipt'}</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {(activeData as PaymentEntry[]).map((pay, idx) => (
                    <tr key={pay.id || idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-4 py-3 text-gray-400 font-mono text-xs">{String(idx + 1).padStart(2, '0')}</td>
                      <td className="px-4 py-3 font-semibold text-gray-800 dark:text-white text-xs">{pay.customer_name || '—'}</td>
                      <td className="px-4 py-3 text-end font-semibold text-emerald-600 text-xs">Rs. {pay.amount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{pay.method || '—'}</td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">{pay.transaction_date ? new Date(pay.transaction_date).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">{pay.collected_by || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-300 font-mono text-xs">{pay.receipt_number || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TodaySalesReport;