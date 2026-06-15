// Fixed BOM issue for CI build
import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useProductStore } from '../../store/useProductStore';
import CustomerCreateModal from '../customers/CustomerCreateModal';
import PlanReceipt from './PlanReceipt';
import api from '../../utils/api';
import { formatPhone, formatCNIC } from '../../utils/helpers';
import { useAuthStore } from '../../store/useAuthStore';

const InstallmentCreate: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useProductStore();

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  const [totalAmount, setTotalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [perMonthInstallment, setPerMonthInstallment] = useState('');
  const [months, setMonths] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [graceDays, setGraceDays] = useState(0);
  const [finePerDay, setFinePerDay] = useState(0);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [serialNumber, setSerialNumber] = useState('');
  const [imei, setImei] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [company, setCompany] = useState('');

  const currentUser = useAuthStore((s) => s.user);
  const [createdBy, setCreatedBy] = useState(currentUser?.displayName || currentUser?.username || '');
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);


  useEffect(() => { fetchCustomers(); fetchProducts(); }, [fetchCustomers, fetchProducts]);

  const isUrdu = i18n.language === 'ur';

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.name?.toLowerCase().includes(q) || c.nameUrdu?.includes(q) || c.phone?.includes(q) || c.cnic?.includes(q) || (c.fatherName || c.father_name || '').toLowerCase().includes(q));
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name?.toLowerCase().includes(q) || p.nameUrdu?.includes(q) || p.category?.toLowerCase().includes(q) || p.company?.toLowerCase().includes(q) || p.companyUrdu?.includes(q));
  }, [products, productSearch]);

  const selectedProduct = products.find(p => p.id === productId);
  const selectedCustomer = customers.find(c => c.id === customerId);

  // Auto-calculate months when totalAmount, downPayment, or perMonthInstallment changes
  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    const down = parseFloat(downPayment) || 0;
    const perMonth = parseFloat(perMonthInstallment) || 0;
    const remaining = total - down;
    if (remaining > 0 && perMonth > 0) {
      const calculatedMonths = Math.ceil(remaining / perMonth);
      setMonths(calculatedMonths);
    } else if (remaining > 0 && perMonth <= 0) {
      // If perMonth is not set but months is manually set, keep months as-is
      // Don't reset to 0
    } else {
      setMonths(0);
    }
  }, [totalAmount, downPayment, perMonthInstallment]);

  const calculateSchedule = () => {
    if (!totalAmount) { toast.error(t('fill_required')); return; }
    const total = parseFloat(totalAmount), down = parseFloat(downPayment) || 0, remaining = total - down;
    if (remaining <= 0) { toast.error(t('fill_required')); return; }
    
    // Allow manual months input if perMonthInstallment is not set
    let calculatedMonths = months;
    let perMonth = parseFloat(perMonthInstallment) || 0;
    
    if (perMonth > 0 && calculatedMonths <= 0) {
      calculatedMonths = Math.ceil(remaining / perMonth);
    } else if (perMonth <= 0 && calculatedMonths > 0) {
      perMonth = remaining / calculatedMonths;
    } else if (perMonth <= 0 && calculatedMonths <= 0) {
      toast.error(t('fill_required'));
      return;
    }
    
    if (calculatedMonths <= 0) { toast.error(t('fill_required')); return; }
    
    const arr = []; const start = new Date(startDate);
    let totalAllocated = 0;
    for (let i = 0; i < calculatedMonths; i++) {
      const d = new Date(start); d.setMonth(d.getMonth() + i + 1);
      let amt = perMonth;
      if (i === calculatedMonths - 1) {
        // Last installment gets the remainder
        amt = remaining - totalAllocated;
      }
      totalAllocated += amt;
      arr.push({ installmentNo: i + 1, dueDate: d.toISOString().split('T')[0], amount: parseFloat(amt.toFixed(2)) });
    }
    setSchedule(arr);
    setMonths(calculatedMonths);
    toast.success(t('schedule_calculated'));
  };

  const handleSave = async () => {
    if (!customerId || !productId || schedule.length === 0) { toast.error(t('fill_required')); return; }
    setLoading(true);
    try {
      const payload = {
        customerId, productId,
        totalAmount: parseFloat(totalAmount),
        downPayment: parseFloat(downPayment) || 0,
        remainingAmount: parseFloat(totalAmount) - (parseFloat(downPayment) || 0),
        numInstallments: months,
        installmentAmount: parseFloat(perMonthInstallment) || schedule[0]?.amount || 0,
        perMonthInstallment: parseFloat(perMonthInstallment) || 0,
        startDate,
        endDate: schedule[schedule.length - 1]?.dueDate || startDate,
        gracePeriodDays: graceDays,
        finePerDay: finePerDay || 0,
        serialNumber: serialNumber || '', imei: imei || '',
        engineNo: engineNo || '', chassisNo: chassisNo || '',
        model: model || '', color: color || '', company: company || '',
        createdBy: createdBy || currentUser?.displayName || currentUser?.username || ''
      };

      const res = await api.post('/installments', payload);
      toast.success(t('plan_created'));
      if (res.data?.id) setSavedPlanId(res.data.id);
      setCustomerId(''); setCustomerSearch(''); setProductId(''); setProductSearch('');
      setTotalAmount(''); setDownPayment(''); setPerMonthInstallment(''); setMonths(0); setSchedule([]);
      setSerialNumber(''); setImei(''); setEngineNo(''); setChassisNo(''); setModel(''); setColor(''); setCompany('');
    } catch (err: any) { toast.error(err?.response?.data?.error || t('error_creating')); }
    finally { setLoading(false); }
  };

  if (savedPlanId) return <PlanReceipt planId={savedPlanId} onClose={() => setSavedPlanId(null)} />;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 text-gray-800 dark:text-white">{t('new_installment')}</h1>
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-5 sm:p-6 space-y-5">

        {/* Customer */}
        <div><label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('customer')} *</label><div className="flex gap-2"><div className="relative flex-1"><div className="absolute inset-y-0 left-0 pl-3 flex items-center"><svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg></div><input type="text" placeholder={t('search_customer_placeholder')} value={customerSearch || (selectedCustomer && !showCustomerDropdown ? `${isUrdu ? selectedCustomer.nameUrdu || selectedCustomer.name : selectedCustomer.name} (${formatPhone(selectedCustomer.phone)})` : customerSearch)} onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); if (!e.target.value) setCustomerId(''); }} onFocus={() => { setShowCustomerDropdown(true); setCustomerSearch(''); }} className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm" />{showCustomerDropdown && <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border rounded-xl shadow-lg max-h-48 overflow-y-auto">{filteredCustomers.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">{t('no_customers_found')}</p> : filteredCustomers.map(c => <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(''); setShowCustomerDropdown(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-0"><div className="font-semibold">{isUrdu ? c.nameUrdu || c.name : c.name}</div><div className="text-xs text-gray-500"><span dir="ltr" style={{ unicodeBidi: 'bidi-override' }}>{formatPhone(c.phone)}</span>{c.fatherName ? ` | ${c.fatherName}` : ''}{c.cnic ? ` | ${formatCNIC(c.cnic)}` : ''}</div></button>)}</div>}</div><button onClick={() => setShowCustomerModal(true)} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold whitespace-nowrap">+ {t('add_customer')}</button></div></div>

        {/* Product */}
        <div><label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('product')} *</label><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center"><svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" /></svg></div><input type="text" placeholder={t('search') + ' ' + t('product') + '...'} value={productSearch || (selectedProduct && !showProductDropdown ? `${isUrdu ? selectedProduct.nameUrdu || selectedProduct.name : selectedProduct.name} - Rs. ${selectedProduct.price?.toLocaleString()}` : productSearch)} onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); if (!e.target.value) setProductId(''); }} onFocus={() => { setShowProductDropdown(true); setProductSearch(''); }} className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm" />{showProductDropdown && <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border rounded-xl shadow-lg max-h-48 overflow-y-auto">{filteredProducts.length === 0 ? <p className="px-4 py-3 text-sm text-gray-500">{t('no_products')}</p> : filteredProducts.map(p => <button key={p.id} onClick={() => { setProductId(p.id); setProductSearch(''); setShowProductDropdown(false); }} className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 flex justify-between border-b last:border-0"><div><div className="font-semibold">{isUrdu ? p.nameUrdu || p.name : p.name}</div><div className="text-xs text-gray-500">{p.category || ''} {p.company ? `| ${p.company}` : ''}</div></div><div className="font-bold">Rs. {p.price?.toLocaleString()}</div></button>)}</div>}</div>{selectedProduct && <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-xl text-xs"><p><strong>{t('category')}:</strong> {selectedProduct.category || '—'} | <strong>{t('company')}:</strong> {isUrdu ? selectedProduct.companyUrdu || selectedProduct.company || '—' : selectedProduct.company || '—'}</p><p><strong>{t('selling_price')}:</strong> Rs. {selectedProduct.price?.toLocaleString()} | <strong>{t('purchase_price')}:</strong> Rs. {selectedProduct.purchasePrice?.toLocaleString() || '—'}</p></div>}</div>

        {/* Product Details */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-5 border border-purple-200 dark:border-purple-800"><h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-4 flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>{t('product_details') || 'Product Details'} ({t('optional')})</h3><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"><div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('serial_number')}</label><input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="SN-12345" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('model')}</label><input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="2024" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('color')}</label><input type="text" value={color} onChange={e => setColor(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="Black" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('company')}</label><input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="Samsung" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('engine_no')}</label><input type="text" value={engineNo} onChange={e => setEngineNo(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="ENG-56789" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('chassis_no')}</label><input type="text" value={chassisNo} onChange={e => setChassisNo(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="CHS-98765" /></div><div><label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('imei')}</label><input type="text" value={imei} onChange={e => setImei(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="123456789012345" /></div></div></div>

        {/* Created By */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            {t('plan_created_by') || 'Plan Created By'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">{t('enter_name') || 'Enter your name'} *</label>
              <input type="text" value={createdBy} onChange={e => setCreatedBy(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder="e.g. Huzaifa, Ali" />
            </div>
          </div>
        </div>


        {/* Amount Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('total_amount')} *</label><input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
          <div><label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('down_payment')}</label><input type="number" value={downPayment} onChange={e => setDownPayment(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
        </div>

        {/* Per Month Installment + Auto Months */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('per_month_installment') || 'Per Month Installment'} *</label>
            <input type="number" min={1} value={perMonthInstallment} onChange={e => setPerMonthInstallment(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" placeholder="e.g. 10000" />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('months')} <span className="text-blue-600 dark:text-blue-400 font-bold">({months})</span></label>
            <div className="w-full border rounded-xl px-4 py-2.5 bg-gray-100 dark:bg-gray-600 text-sm text-gray-600 dark:text-gray-300">
              {months > 0 ? `${months} ${t('months')}` : t('auto_calculated') || 'Auto-calculated'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('start_date')} *</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
          <div><label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('grace_days')}</label><input type="number" min={0} value={graceDays} onChange={e => setGraceDays(Number(e.target.value))} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
          <div><label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('fine_per_day')}</label><input type="number" min={0} step="0.01" value={finePerDay} onChange={e => setFinePerDay(Number(e.target.value))} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
        </div>

        {/* Buttons */}
        <div className="flex flex-wrap gap-3 pt-3">
          <button onClick={calculateSchedule} className="px-6 py-3 bg-blue-600 text-white rounded-2xl text-sm font-semibold shadow-lg">{t('calculate_schedule')}</button>
          {schedule.length > 0 && <button onClick={handleSave} disabled={loading} className="px-6 py-3 bg-emerald-600 text-white rounded-2xl text-sm font-semibold shadow-lg disabled:opacity-50">{loading ? t('saving') : t('save_plan')}</button>}
        </div>

        {/* Schedule */}
        {schedule.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
                <th className="px-5 py-3 text-start font-semibold">{t('installment_no')}</th>
                <th className="px-5 py-3 text-start font-semibold">{t('due_date')}</th>
                <th className="px-5 py-3 text-start font-semibold">{t('amount')}</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {schedule.map((inst, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-700/30'} text-gray-800 dark:text-gray-200`}>
                    <td className="px-5 py-3 font-semibold">{inst.installmentNo}</td>
                    <td className="px-5 py-3">{inst.dueDate}</td>
                    <td className="px-5 py-3">Rs. {inst.amount?.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {showCustomerModal && <CustomerCreateModal onClose={() => setShowCustomerModal(false)} onSuccess={() => { setShowCustomerModal(false); fetchCustomers(); }} />}
    </div>
  );
};

export default InstallmentCreate;
