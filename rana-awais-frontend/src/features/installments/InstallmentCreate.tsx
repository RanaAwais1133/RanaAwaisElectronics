// Fixed BOM issue for CI build
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useCustomerStore } from '../../store/useCustomerStore';
import { useProductStore } from '../../store/useProductStore';
import CustomerCreateModal from '../customers/CustomerCreateModal';
import PlanReceipt from './PlanReceipt';
import api from '../../utils/api';
import { formatPhone, formatCNIC } from '../../utils/helpers';
import { useAuthStore } from '../../store/useAuthStore';
import { APP_CONFIG } from '../../config/app';
import { useInstallmentStore } from '../../store/useInstallmentStore';
import { roundMoney } from '../../utils/math';

const InstallmentCreate: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  
  const { customers, fetchCustomers } = useCustomerStore();
  const { products, fetchProducts } = useProductStore();
  const currentUser = useAuthStore((s) => s.user);

  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  const [productId, setProductId] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);

  // ✅ Use Installment Store with Undo/Redo
  const plan = useInstallmentStore((s: any) => s.plan);
  const isCalculating = useInstallmentStore((s: any) => s.isCalculating);
  const storeError = useInstallmentStore((s: any) => s.error);
  const setCustomerIdStore = useInstallmentStore((s: any) => s.setCustomerId);
  const setProductIdStore = useInstallmentStore((s: any) => s.setProductId);
  const setTotalAmountStore = useInstallmentStore((s: any) => s.setTotalAmount);
  const setDownPaymentStore = useInstallmentStore((s: any) => s.setDownPayment);
  const setNumInstallmentsStore = useInstallmentStore((s: any) => s.setNumInstallments);
  const setInstallmentAmountStore = useInstallmentStore((s: any) => s.setInstallmentAmount);
  const setStartDateStore = useInstallmentStore((s: any) => s.setStartDate);
  const setGracePeriodStore = useInstallmentStore((s: any) => s.setGracePeriod);
  const setFinePerDayStore = useInstallmentStore((s: any) => s.setFinePerDay);
  const setProductDetailsStore = useInstallmentStore((s: any) => s.setProductDetails);
  const setAdditionalFieldsStore = useInstallmentStore((s: any) => s.setAdditionalFields);
  const setScheduleStore = useInstallmentStore((s: any) => s.setSchedule);
  const calculateScheduleStore = useInstallmentStore((s: any) => s.calculateSchedule);
  const resetStore = useInstallmentStore((s: any) => s.reset);
  const loadPlanStore = useInstallmentStore((s: any) => s.loadPlan);
  const undo = useInstallmentStore((s: any) => s.undo);
  const redo = useInstallmentStore((s: any) => s.redo);
  const canUndo = useInstallmentStore((s: any) => s.canUndo);
  const canRedo = useInstallmentStore((s: any) => s.canRedo);

  // ✅ Local state for UI-only fields
  const [totalAmount, setTotalAmount] = useState('');
  const [downPayment, setDownPayment] = useState('');
  const [perMonthInstallment, setPerMonthInstallment] = useState('');
  const [months, setMonths] = useState(0);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [graceDays, setGraceDays] = useState(0);
  const [finePerDay, setFinePerDay] = useState(0);
  const [fineType, setFineType] = useState('per_day');
  const [fixedFineAmount, setFixedFineAmount] = useState(0);
  const [schedule, setSchedule] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [serialNumber, setSerialNumber] = useState('');
  const [imei, setImei] = useState('');
  const [engineNo, setEngineNo] = useState('');
  const [chassisNo, setChassisNo] = useState('');
  const [model, setModel] = useState('');
  const [color, setColor] = useState('');
  const [company, setCompany] = useState('');

  // ✅ Inventory Variant Selection
  const [inventoryItemId, setInventoryItemId] = useState('');
  const [inventoryVariants, setInventoryVariants] = useState<any[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [showVariantDropdown, setShowVariantDropdown] = useState(false);

  // ✅ Fetch inventory variants for ALL in-stock products on mount (cached)
  const [allInventoryItems, setAllInventoryItems] = useState<any[]>([]);
  useEffect(() => {
    api.get('/inventory?show_all=false&limit=9999').then(res => {
      const data = res.data?.data || res.data || [];
      setAllInventoryItems(Array.isArray(data) ? data.filter((i: any) => i.status === 'in_stock') : []);
    }).catch(() => {});
  }, []);

  // ✅ Fields
  const [installmentDate, setInstallmentDate] = useState('');
  const [processFee, setProcessFee] = useState('');
  const [discount, setDiscount] = useState('');
  const [paymentType, setPaymentType] = useState('installments'); // ✅ NEW: "cash" or "installments"

  const [createdBy, setCreatedBy] = useState(currentUser?.displayName || currentUser?.username || '');
  const [savedPlanId, setSavedPlanId] = useState<string | null>(null);

  // ✅ Refs for click-outside detection
  const customerDropdownRef = useRef<HTMLDivElement>(null);
  const productDropdownRef = useRef<HTMLDivElement>(null);

  // ✅ Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerDropdownRef.current && !customerDropdownRef.current.contains(event.target as Node)) {
        setShowCustomerDropdown(false);
      }
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setShowProductDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ✅ Keyboard shortcuts for Undo/Redo (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (canUndo()) undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (canRedo()) redo();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, canUndo, canRedo]);

  useEffect(() => {
    fetchCustomers();
    fetchProducts();
  }, [fetchCustomers, fetchProducts]);

  useEffect(() => {
    document.title = `${t('new_installment')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.nameUrdu?.includes(q) ||
      c.phone?.includes(q) ||
      c.cnic?.includes(q) ||
      (c.fatherName || c.father_name || '').toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  // ✅ Filtered inventory items (individual variants) for search dropdown
  // Each item has: id, productId, product_name, serialNumber, engineNo, chassisNo, model, color, company, imei, etc.
  const filteredInventoryItems = useMemo(() => {
    const q = productSearch.toLowerCase();
    // ✅ When empty search, show ALL in-stock items so user can browse & pick
    if (!q) return allInventoryItems;
    return allInventoryItems.filter((item: any) => {
      const pn = (item.product_name || '').toLowerCase();
      const pnu = (item.product_name_urdu || '').toLowerCase();
      const sn = (item.serialNumber || '').toLowerCase();
      const eng = (item.engineNo || '').toLowerCase();
      const ch = (item.chassisNo || '').toLowerCase();
      const mdl = (item.model || '').toLowerCase();
      const clr = (item.color || '').toLowerCase();
      const cmp = (item.company || '').toLowerCase();
      const im = (item.imei || '').toLowerCase();
      const purc = (item.purchasePrice?.toString() || '').includes(q);
      const sell = (item.sellingPrice?.toString() || '').includes(q);
      return pn.includes(q) || pnu.includes(q) || sn.includes(q) || eng.includes(q) || ch.includes(q) || mdl.includes(q) || clr.includes(q) || cmp.includes(q) || im.includes(q) || purc || sell;
    });
  }, [allInventoryItems, productSearch]);

  // ✅ Filter products: only show products that have NO inventory items (avoid duplicate)
  const productIdsInInventory = useMemo(() => {
    const ids = new Set<string>();
    allInventoryItems.forEach((item: any) => { if (item.productId) ids.add(item.productId); });
    return ids;
  }, [allInventoryItems]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    // Only products without inventory entries
    const productsWithoutInventory = products.filter(p => p.in_stock !== false && (p.stockCount ?? 0) > 0 && !productIdsInInventory.has(p.id));
    if (!q) return productsWithoutInventory;
    return productsWithoutInventory.filter(p => {
      return (
        (p.name || '').toLowerCase().includes(q) ||
        (p.nameUrdu || '').includes(q) ||
        (p.category || '').toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.companyUrdu || '').includes(q) ||
        (p.serialNumber || '').toLowerCase().includes(q) ||
        (p.imei || '').toLowerCase().includes(q) ||
        (p.engineNo || '').toLowerCase().includes(q) ||
        (p.chassisNo || '').toLowerCase().includes(q) ||
        (p.model || '').toLowerCase().includes(q) ||
        (p.color || '').toLowerCase().includes(q)
      );
    });
  }, [products, productSearch, productIdsInInventory]);

  const selectedProduct = products.find(p => p.id === productId);
  const selectedCustomer = customers.find(c => c.id === customerId);

  // ✅ Auto-fill product details when product is selected without a variant
  useEffect(() => {
    if (!selectedProduct || !productId || inventoryItemId) return;
    // Only auto-fill from product if no inventory variant was explicitly selected
    setSerialNumber(selectedProduct.serialNumber || '');
    setImei(selectedProduct.imei || '');
    setEngineNo(selectedProduct.engineNo || '');
    setChassisNo(selectedProduct.chassisNo || '');
    setModel(selectedProduct.model || '');
    setColor(selectedProduct.color || '');
    setCompany(selectedProduct.company || selectedProduct.companyUrdu || '');
  }, [selectedProduct, productId, inventoryItemId]);

  // ✅ Handler: Select a specific inventory variant (one click = everything set)
  const handleSelectInventoryItem = useCallback((item: any) => {
    setProductId(item.productId || '');
    setInventoryItemId(item.id || '');
    setSelectedVariantId(item.id || '');
    setSerialNumber(item.serialNumber || '');
    setImei(item.imei || '');
    setEngineNo(item.engineNo || '');
    setChassisNo(item.chassisNo || '');
    setModel(item.model || '');
    setColor(item.color || '');
    setCompany(item.company || '');
    setProductSearch('');
    setShowProductDropdown(false);
  }, []);

  // ✅ Handler: Select just a product (no variant)
  const handleSelectProductOnly = useCallback((p: any) => {
    setProductId(p.id);
    setProductSearch('');
    setShowProductDropdown(false);
    setInventoryItemId('');
    setSelectedVariantId('');
    setSerialNumber(p.serialNumber || '');
    setImei(p.imei || '');
    setEngineNo(p.engineNo || '');
    setChassisNo(p.chassisNo || '');
    setModel(p.model || '');
    setColor(p.color || '');
    setCompany(p.company || p.companyUrdu || '');
  }, []);

  useEffect(() => {
    const total = parseFloat(totalAmount) || 0;
    const down = parseFloat(downPayment) || 0;
    const perMonth = parseFloat(perMonthInstallment) || 0;
    const remaining = total - down;
    
    if (remaining > 0 && perMonth > 0) {
      const calculatedMonths = Math.ceil(remaining / perMonth);
      setMonths(calculatedMonths);
    } else if (remaining <= 0) {
      setMonths(0);
    }
  }, [totalAmount, downPayment, perMonthInstallment]);

  const calculateSchedule = useCallback(() => {
    if (!totalAmount) {
      toast.error(isUrdu ? 'کل رقم درج کریں' : t('fill_required'));
      return;
    }
    
    const total = parseFloat(totalAmount);
    const down = parseFloat(downPayment) || 0;
    const remaining = total - down;
    
    if (remaining <= 0) {
      toast.error(isUrdu ? 'باقی رقم صفر سے زیادہ ہونی چاہیے' : 'Remaining amount must be greater than zero');
      return;
    }
    
    let calculatedMonths = months;
    let perMonth = parseFloat(perMonthInstallment) || 0;
    
    if (perMonth > 0 && calculatedMonths <= 0) {
      calculatedMonths = Math.ceil(remaining / perMonth);
    } else if (perMonth <= 0 && calculatedMonths > 0) {
      perMonth = remaining / calculatedMonths;
    } else if (perMonth <= 0 && calculatedMonths <= 0) {
      toast.error(isUrdu ? 'ماہانہ قسط یا ماہ کی تعداد درج کریں' : 'Enter either monthly installment or number of months');
      return;
    }
    
    if (calculatedMonths <= 0) {
      toast.error(isUrdu ? 'ماہ کی تعداد درست نہیں' : 'Invalid number of months');
      return;
    }
    
    const arr: any[] = [];
    const start = new Date(startDate);
    let totalAllocated = 0;
    
    // ✅ Use installment date if provided (day of month), otherwise use start date day
    const installDateDay = parseInt(installmentDate) || start.getDate();
    
    for (let i = 0; i < calculatedMonths; i++) {
      const d = new Date(start);
      d.setMonth(d.getMonth() + i + 1);
      
      // ✅ Set to installment date (day of month)
      // Handle edge case: if day > max days in month, use last day of month
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(installDateDay, lastDay));
      
      let amt = perMonth;
      if (i === calculatedMonths - 1) {
        amt = remaining - totalAllocated;
      }
      totalAllocated += amt;
      arr.push({
        installmentNo: i + 1,
        dueDate: d.toISOString().split('T')[0],
        amount: parseFloat(amt.toFixed(2))
      });
    }
    
    setSchedule(arr);
    setMonths(calculatedMonths);
    toast.success(isUrdu ? 'قسط کا شیڈول تیار' : t('schedule_calculated'));
  }, [totalAmount, downPayment, perMonthInstallment, months, startDate, installmentDate, t, isUrdu]);

  const handleSave = useCallback(async () => {
    if (!customerId) {
      toast.error(isUrdu ? 'گاہک منتخب کریں' : 'Select a customer');
      return;
    }
    if (!productId) {
      toast.error(isUrdu ? 'پروڈکٹ منتخب کریں' : 'Select a product');
      return;
    }
    if (schedule.length === 0) {
      toast.error(isUrdu ? 'قسط کا شیڈول تیار کریں' : 'Calculate schedule first');
      return;
    }

    setLoading(true);
    
    try {
      const payload = {
        customerId,
        productId,
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
        fineType: fineType || 'per_day',
        fixedFineAmount: fixedFineAmount || 0,
        serialNumber: serialNumber || '',
        imei: imei || '',
        engineNo: engineNo || '',
        chassisNo: chassisNo || '',
        model: model || '',
        color: color || '',
        company: company || '',
        installmentDate: installmentDate ? parseInt(installmentDate) : 0,
        processFee: parseFloat(processFee) || 0,
        discount: parseFloat(discount) || 0,
        paymentType: paymentType || 'installments', // ✅ NEW: Payment type (cash or installments)
        createdBy: createdBy || currentUser?.displayName || currentUser?.username || '',
        inventoryItemId: inventoryItemId || '', // ✅ FIX: Send selected inventory variant ID to backend
      };

      const res = await api.post('/installments', payload);
      toast.success(isUrdu ? 'پلان بن گیا' : t('plan_created'));
      
      if (res.data?.id) {
        setSavedPlanId(res.data.id);
      }
      
      // Reset form
      setCustomerId('');
      setCustomerSearch('');
      setProductId('');
      setProductSearch('');
      setTotalAmount('');
      setDownPayment('');
      setPerMonthInstallment('');
      setMonths(0);
      setSchedule([]);
      setSerialNumber('');
      setImei('');
      setEngineNo('');
      setChassisNo('');
      setModel('');
      setColor('');
      setCompany('');
      setInstallmentDate('');
      setProcessFee('');
      setDiscount('');
      setInventoryItemId('');
      setSelectedVariantId('');
      
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 
                       (isUrdu ? 'پلان بنانے میں ناکامی' : t('error_creating'));
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [
    customerId, productId, schedule, totalAmount, downPayment, months, perMonthInstallment,
    startDate, graceDays, finePerDay, serialNumber, imei, engineNo, chassisNo, model, color, company,
    installmentDate, processFee, discount, paymentType, createdBy, currentUser, inventoryItemId, t, isUrdu
  ]);

  if (savedPlanId) {
    return <PlanReceipt planId={savedPlanId} onClose={() => setSavedPlanId(null)} />;
  }

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 pb-10">
      <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 text-gray-800 dark:text-white">
        {isUrdu ? 'نیا قسط پلان' : t('new_installment')}
      </h1>
      
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 space-y-4 sm:space-y-5">

        {/* ✅ Customer */}
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('customer')} *</label>
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1" ref={customerDropdownRef}>
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder={isUrdu ? 'گاہک تلاش کریں...' : t('search_customer_placeholder')}
                value={customerSearch || (selectedCustomer && !showCustomerDropdown ? 
                  `${isUrdu ? selectedCustomer.nameUrdu || selectedCustomer.name : selectedCustomer.name} (${formatPhone(selectedCustomer.phone)})` : 
                  customerSearch)}
                onChange={e => { setCustomerSearch(e.target.value); setShowCustomerDropdown(true); if (!e.target.value) setCustomerId(''); }}
                onFocus={() => { setShowCustomerDropdown(true); setCustomerSearch(''); }}
                className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
              />
              {showCustomerDropdown && (
                <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                  {filteredCustomers.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-gray-500">{isUrdu ? 'کوئی گاہک نہیں ملا' : t('no_customers_found')}</p>
                  ) : (
                    filteredCustomers.map(c => (
                      <button key={c.id} onClick={() => { setCustomerId(c.id); setCustomerSearch(''); setShowCustomerDropdown(false); }}
                        className="w-full text-left px-4 py-3 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-0">
                        <div className="font-semibold">{isUrdu ? c.nameUrdu || c.name : c.name}</div>
                        <div className="text-xs text-gray-500"><span dir="ltr">{formatPhone(c.phone)}</span>{c.fatherName ? ` | ${c.fatherName}` : ''}{c.cnic ? ` | ${formatCNIC(c.cnic)}` : ''}</div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <button onClick={() => setShowCustomerModal(true)} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold whitespace-nowrap hover:bg-emerald-700 transition-colors">
              + {t('add_customer')}
            </button>
          </div>
        </div>

        {/* ✅ Product - Individual Inventory Items in Dropdown (One-Click Selection) */}
        <div>
          <label className="block text-sm font-semibold mb-1.5 text-gray-700 dark:text-gray-300">{t('product')} *</label>
          <div className="relative" ref={productDropdownRef}>
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder={isUrdu ? 'نام، انجن#، چیسس#، ماڈل سے تلاش کریں...' : `${t('search')} by name, engine#, chassis#, model...`}
              value={productSearch || (selectedVariantId && !showProductDropdown ? `${isUrdu ? 'منتخب' : 'Selected'}: ${serialNumber || model || engineNo || chassisNo || (selectedProduct ? (isUrdu ? selectedProduct.nameUrdu || selectedProduct.name : selectedProduct.name) : '—')}` : productSearch)}
              onChange={e => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
              onFocus={() => { setShowProductDropdown(true); setProductSearch(''); }}
              className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
            />
            {showProductDropdown && (
              <div className="absolute z-20 mt-1 w-full bg-white dark:bg-gray-700 border rounded-xl shadow-lg max-h-72 overflow-y-auto">
                {/* Show individual inventory items matching search */}
                {filteredInventoryItems.length > 0 && (
                  <>
                    <p className="px-3 py-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider bg-emerald-50/50 dark:bg-emerald-900/20">
                      {isUrdu ? 'موجودہ اسٹاک' : 'In Stock'} ({filteredInventoryItems.length})
                    </p>
                    {filteredInventoryItems.map((item: any) => {
                      const itemId = item.id || '';
                      const isSelected = selectedVariantId === itemId;
                      const details = [
                        item.engineNo && `Eng: ${item.engineNo}`,
                        item.chassisNo && `Ch: ${item.chassisNo}`,
                        item.model && `Mdl: ${item.model}`,
                        item.color && `Color: ${item.color}`,
                        item.serialNumber && `S/N: ${item.serialNumber}`,
                      ].filter(Boolean).join(' | ');
                      return (
                        <button
                          key={itemId}
                          onClick={() => handleSelectInventoryItem(item)}
                          className={`w-full text-left px-4 py-2.5 text-sm border-b last:border-0 transition-colors ${
                            isSelected
                              ? 'bg-emerald-50 dark:bg-emerald-900/30 border-l-4 border-emerald-500'
                              : 'hover:bg-blue-50 dark:hover:bg-blue-900/20'
                          }`}
                        >
                          <div className="font-semibold text-gray-900 dark:text-white text-xs">
                            {isUrdu ? (item.product_name_urdu || item.product_name) : item.product_name}
                            {isSelected && <span className="ml-1 text-emerald-600 dark:text-emerald-400 text-[10px]">✓</span>}
                          </div>
                          {details && <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{details}</div>}
                          {item.sellingPrice > 0 && <div className="text-[10px] text-gray-400 mt-0.5">Rs. {item.sellingPrice?.toLocaleString()}</div>}
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Also show product-level entries (fallback when no inventory items match) */}
                {filteredProducts.length > 0 && (
                  <>
                    {filteredInventoryItems.length > 0 && (
                      <p className="px-3 py-1.5 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50/50 dark:bg-blue-900/20 border-t border-gray-200 dark:border-gray-600">
                        {isUrdu ? 'پروڈکٹس' : 'Products'} ({filteredProducts.length})
                      </p>
                    )}
                    {filteredProducts.map(p => (
                      <button key={`prod-${p.id}`} onClick={() => handleSelectProductOnly(p)}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 border-b last:border-0 transition-colors ${
                          selectedProduct?.id === p.id && !selectedVariantId ? 'bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500' : ''
                        }`}>
                        <div className="font-semibold text-gray-900 dark:text-white text-xs">
                          {isUrdu ? p.nameUrdu || p.name : p.name}
                          {selectedProduct?.id === p.id && !selectedVariantId && <span className="ml-1 text-blue-600 dark:text-blue-400 text-[10px]">✓</span>}
                        </div>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500 mt-0.5">
                          {p.category && <span className="bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">Cat: {p.category}</span>}
                          {p.company && <span className="bg-purple-50 dark:bg-purple-900/30 px-1 py-0.5 rounded">Co: {p.company}</span>}
                          {p.model && <span className="bg-gray-50 dark:bg-gray-700 px-1 py-0.5 rounded">Mdl: {p.model}</span>}
                        </div>
                        <div className="text-right text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Rs. {p.price?.toLocaleString()}</div>
                      </button>
                    ))}
                  </>
                )}

                {filteredInventoryItems.length === 0 && filteredProducts.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-500">{isUrdu ? 'کوئی پروڈکٹ نہیں' : t('no_products')}</p>
                )}
              </div>
            )}
          </div>
          {/* Selected product/variant summary */}
          {(selectedProduct || selectedVariantId) && (
            <div className={`mt-2 p-3 rounded-xl text-xs space-y-1 ${selectedVariantId ? 'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800' : 'bg-blue-50 dark:bg-blue-900/30'}`}>
              {selectedVariantId && (
                <p className="text-emerald-700 dark:text-emerald-300 font-semibold text-[10px]">
                  {isUrdu ? '✓ منتخب ویریئنٹ' : '✓ Variant Selected'}
                </p>
              )}
              <p>
                <strong>{t('product')}:</strong> {selectedProduct ? (isUrdu ? selectedProduct.nameUrdu || selectedProduct.name : selectedProduct.name) : '—'} | 
                <strong>{t('company')}:</strong> {company || (isUrdu ? selectedProduct?.companyUrdu || selectedProduct?.company || '—' : selectedProduct?.company || '—')}
              </p>
              <p className="text-gray-500">
                {serialNumber && <><strong>S/N:</strong> {serialNumber} </>}
                {engineNo && <><strong>Eng:</strong> {engineNo} </>}
                {chassisNo && <><strong>Ch:</strong> {chassisNo} </>}
                {model && <><strong>Mdl:</strong> {model} </>}
                {color && <><strong>{isUrdu ? 'رنگ' : 'Color'}:</strong> {color}</>}
                {imei && <><strong> IMEI:</strong> {imei}</>}
              </p>
            </div>
          )}
        </div>

        {/* ✅ Product Details */}
        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-2xl p-4 sm:p-5 border border-purple-200 dark:border-purple-800">
          <h3 className="text-sm font-bold text-purple-700 dark:text-purple-300 mb-3">{t('product_details') || 'Product Details'} ({t('optional')})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div><label className="block text-xs font-medium mb-1">{t('serial_number')}</label><input type="text" value={serialNumber} onChange={e => setSerialNumber(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">{t('model')}</label><input type="text" value={model} onChange={e => setModel(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">{t('color')}</label><input type="text" value={color} onChange={e => setColor(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">{t('company')}</label><input type="text" value={company} onChange={e => setCompany(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">{t('engine_no')}</label><input type="text" value={engineNo} onChange={e => setEngineNo(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">{t('chassis_no')}</label><input type="text" value={chassisNo} onChange={e => setChassisNo(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
            <div className="sm:col-span-2 lg:col-span-1"><label className="block text-xs font-medium mb-1">{t('imei')}</label><input type="text" value={imei} onChange={e => setImei(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* ✅ Additional Plan Fields */}
        <div className="bg-teal-50 dark:bg-teal-900/20 rounded-2xl p-4 sm:p-5 border border-teal-200 dark:border-teal-800">
          <h3 className="text-sm font-bold text-teal-700 dark:text-teal-300 mb-3">{t('additional_plan_fields') || 'Additional Plan Fields'} ({t('optional')})</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-xs font-medium mb-1">{t('installment_date') || 'Installment Date'}</label><input type="number" min="1" max="31" value={installmentDate} onChange={e => setInstallmentDate(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder={isUrdu ? 'مثلاً 15' : 'e.g. 15'} /></div>
            <div><label className="block text-xs font-medium mb-1">{t('process_fee') || 'Process Fee'}</label><input type="number" min="0" step="0.01" value={processFee} onChange={e => setProcessFee(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
            <div><label className="block text-xs font-medium mb-1">{t('discount') || 'Discount'}</label><input type="number" min="0" step="0.01" value={discount} onChange={e => setDiscount(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" /></div>
          </div>
        </div>

        {/* ✅ Created By */}
        <div className="bg-amber-50 dark:bg-amber-900/20 rounded-2xl p-4 sm:p-5 border border-amber-200 dark:border-amber-800">
          <h3 className="text-sm font-bold text-amber-700 dark:text-amber-300 mb-3">{t('plan_created_by') || 'Plan Created By'}</h3>
          <div><label className="block text-xs font-medium mb-1">{t('enter_name') || 'Enter your name'} *</label>
            <input type="text" value={createdBy} onChange={e => setCreatedBy(e.target.value)} className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" placeholder={isUrdu ? 'مثال: حذیفہ' : 'e.g. Huzaifa'} /></div>
        </div>

        {/* ✅ Amount Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1.5">{t('total_amount')} *</label><input type="number" min="0" step="0.01" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
          <div><label className="block text-sm font-semibold mb-1.5">{t('down_payment')}</label><input type="number" min="0" step="0.01" value={downPayment} onChange={e => setDownPayment(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
        </div>

        {/* ✅ Per Month + Months */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1.5">{t('per_month_installment') || 'Per Month Installment'} *</label><input type="number" min="1" step="0.01" value={perMonthInstallment} onChange={e => setPerMonthInstallment(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
          <div><label className="block text-sm font-semibold mb-1.5">{t('months')} <span className="text-blue-600 dark:text-blue-400 font-bold">({months})</span></label><div className="w-full border rounded-xl px-4 py-2.5 bg-gray-100 dark:bg-gray-600 text-sm">{months > 0 ? `${months} ${t('months')}` : (isUrdu ? 'خودکار حساب' : t('auto_calculated') || 'Auto-calculated')}</div></div>
        </div>

        {/* ✅ Start Date + Grace Days */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-sm font-semibold mb-1.5">{t('start_date')} *</label><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
          <div><label className="block text-sm font-semibold mb-1.5">{t('grace_days')}</label><input type="number" min="0" value={graceDays} onChange={e => setGraceDays(Number(e.target.value))} className="w-full border rounded-xl px-4 py-2.5 bg-white dark:bg-gray-700 text-sm" /></div>
        </div>

        {/* ✅ Fine Type - Dynamic (Option C) */}
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 sm:p-5 border border-red-200 dark:border-red-800">
          <h3 className="text-sm font-bold text-red-700 dark:text-red-300 mb-3">{isUrdu ? 'جرمانے کی قسم' : 'Fine Configuration'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">{isUrdu ? 'جرمانے کی قسم' : 'Fine Type'}</label>
              <select value={fineType} onChange={e => setFineType(e.target.value)}
                className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm">
                <option value="per_day">{isUrdu ? 'فی دن' : 'Per Day'}</option>
                <option value="fixed">{isUrdu ? 'مقررہ' : 'Fixed'}</option>
                <option value="both">{isUrdu ? 'دونوں' : 'Both'}</option>
                <option value="none">{isUrdu ? 'کوئی نہیں' : 'None'}</option>
              </select>
            </div>
            {(fineType === 'per_day' || fineType === 'both') && (
              <div>
                <label className="block text-xs font-medium mb-1">{isUrdu ? 'فی دن جرمانہ' : 'Fine Per Day (Rs.)'}</label>
                <input type="number" min="0" step="0.01" value={finePerDay} onChange={e => setFinePerDay(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" />
              </div>
            )}
            {(fineType === 'fixed' || fineType === 'both') && (
              <div>
                <label className="block text-xs font-medium mb-1">{isUrdu ? 'مقررہ جرمانہ' : 'Fixed Fine (Rs.)'}</label>
                <input type="number" min="0" step="0.01" value={fixedFineAmount} onChange={e => setFixedFineAmount(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-sm" />
              </div>
            )}
            {fineType === 'none' && (
              <div className="col-span-2 flex items-center">
                <p className="text-sm text-gray-500 italic">{isUrdu ? 'اس پلان پر کوئی جرمانہ نہیں لگے گا' : 'No fine will be applied to this plan'}</p>
              </div>
            )}
          </div>
        </div>

        {/* ✅ Payment Type Selection */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 sm:p-5 border border-indigo-200 dark:border-indigo-800">
          <h3 className="text-sm font-bold text-indigo-700 dark:text-indigo-300 mb-3">{isUrdu ? 'ادائیگی کی قسم' : 'Payment Type'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="paymentType"
                value="installments"
                checked={paymentType === 'installments'}
                onChange={e => setPaymentType(e.target.value)}
                className="w-4 h-4 text-blue-600 rounded-full"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {isUrdu ? 'قسطوں میں ادا کریں' : 'Installments'}
              </span>
              <span className="ml-auto text-xs text-gray-500">({isUrdu ? 'ماہانہ' : 'Monthly'})</span>
            </label>
            <label className="flex items-center cursor-pointer">
              <input
                type="radio"
                name="paymentType"
                value="cash"
                checked={paymentType === 'cash'}
                onChange={e => setPaymentType(e.target.value)}
                className="w-4 h-4 text-emerald-600 rounded-full"
              />
              <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                {isUrdu ? 'نقد رقم' : 'Cash'}
              </span>
              <span className="ml-auto text-xs text-gray-500">({isUrdu ? 'فوری' : 'Immediate'})</span>
            </label>
          </div>
        </div>


        {/* ✅ Undo/Redo Controls */}
        <div className="flex items-center gap-2 pt-2 pb-1">
          <button
            onClick={undo}
            disabled={!canUndo()}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1"
            title={isUrdu ? 'واپس' : 'Undo'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            {isUrdu ? 'واپس' : 'Undo'}
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center gap-1"
            title={isUrdu ? 'آگے' : 'Redo'}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 0 0-8 8v2m18-10l-6 6m6-6l-6-6" />
            </svg>
            {isUrdu ? 'آگے' : 'Redo'}
          </button>
          <span className="text-[10px] text-gray-400 ml-1">
            {isUrdu ? 'Ctrl+Z / Ctrl+Y' : 'Ctrl+Z / Ctrl+Y'}
          </span>
        </div>

        {/* ✅ Buttons */}
        <div className="flex flex-wrap gap-3 pt-3">
          <button onClick={calculateSchedule} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95">
            {isUrdu ? 'قسط کا حساب لگائیں' : t('calculate_schedule')}
          </button>
          {schedule.length > 0 && (
            <button onClick={handleSave} disabled={loading} className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95">
              {loading ? (<span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{isUrdu ? 'محفوظ ہو رہا...' : t('saving')}</span>) : (isUrdu ? 'پلان محفوظ کریں' : t('save_plan'))}
            </button>
          )}
        </div>

        {/* ✅ Schedule Table */}
        {schedule.length > 0 && (
          <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs"><th className="px-5 py-3 text-start font-semibold">{t('installment_no')}</th><th className="px-5 py-3 text-start font-semibold">{t('due_date')}</th><th className="px-5 py-3 text-start font-semibold">{t('amount')}</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                {schedule.map((inst, idx) => (
                  <tr key={idx} className={`${idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/30 dark:bg-gray-700/30'} text-gray-800 dark:text-gray-200`}><td className="px-5 py-3 font-semibold">{inst.installmentNo}</td><td className="px-5 py-3">{inst.dueDate}</td><td className="px-5 py-3">Rs. {inst.amount?.toFixed(2)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCustomerModal && (
        <CustomerCreateModal onClose={() => setShowCustomerModal(false)} onSuccess={() => { setShowCustomerModal(false); fetchCustomers(); }} />
      )}
    </div>
  );
};

export default InstallmentCreate;