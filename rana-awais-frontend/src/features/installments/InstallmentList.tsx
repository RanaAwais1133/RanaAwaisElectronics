import React, { useEffect, useState, useCallback, useMemo } from 'react';
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
import { APP_CONFIG } from '../../config/app';

// ✅ Status Badge Component
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const getStatusStyles = () => {
    switch (status?.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300';
      case 'completed':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
      case 'defaulted':
        return 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300';
      case 'overdue':
        return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
      default:
        return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusStyles()}`}>
      {status || '—'}
    </span>
  );
};

// ✅ Payment Status Badge
const PaymentStatusBadge: React.FC<{ paid: boolean; partialPaid: number; t: (key: string) => string; isUrdu: boolean }> = ({ paid, partialPaid, t, isUrdu }) => {
  if (paid) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">{t('paid')}</span>;
  }
  if (partialPaid > 0) {
    return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{isUrdu ? 'جزوی' : 'Partial'}</span>;
  }
  return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{t('pending')}</span>;
};

const InstallmentList: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
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

  // Payment states
  const [singlePay, setSinglePay] = useState<any>(null);
  const [advancePay, setAdvancePay] = useState<string | null>(null);
  const [bulkPay, setBulkPay] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletePlanId, setDeletePlanId] = useState<string | null>(null);
  const [receiptPlanId, setReceiptPlanId] = useState<string | null>(null);
  const [reschedulePlan, setReschedulePlan] = useState<{ id: string; status: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { customers, fetchCustomers } = useCustomerStore();

  // ✅ Page title
  useEffect(() => {
    document.title = `${t('installments')} | ${APP_CONFIG.companyName}`;
  }, [t]);

  // ✅ Fetch customers
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // ✅ Set customer from URL
  useEffect(() => {
    const custFromUrl = searchParams.get('customer_id');
    if (custFromUrl && custFromUrl !== selectedCustomer) {
      setSelectedCustomer(custFromUrl);
    }
  }, [searchParams, selectedCustomer]);

  // ✅ Fetch installments
  useEffect(() => {
    if (!selectedCustomer) {
      setPlans([]);
      setError('');
      setErrorDetails('');
      return;
    }
    
    setLoading(true);
    setError('');
    setErrorDetails('');
    
    getInstallmentsByCustomer(selectedCustomer)
      .then(data => {
        setPlans(Array.isArray(data) ? data : []);
      })
      .catch((err) => {
        setErrorDetails(err?.response?.data?.error || err?.message);
        setError(t('error_loading_installments'));
      })
      .finally(() => setLoading(false));
  }, [selectedCustomer, t]);

  // ✅ Refresh
  const refresh = useCallback(() => {
    if (selectedCustomer) {
      setLoading(true);
      getInstallmentsByCustomer(selectedCustomer)
        .then(data => setPlans(Array.isArray(data) ? data : []))
        .catch((err) => {
          setErrorDetails(err?.response?.data?.error || err?.message);
          setError(t('error_loading_installments'));
        })
        .finally(() => setLoading(false));
    }
    setSelectedIds(new Set());
  }, [selectedCustomer, t]);

  // ✅ Toggle selection
  const toggleSelection = useCallback((planId: string, instNo: number) => {
    const key = `${planId}_${instNo}`;
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  // ✅ Get selected for plan
  const getSelectedForPlan = useCallback((planId: string) => {
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
  }, [plans, selectedIds]);

  // ✅ Delete plan
  const handleDeletePlan = useCallback(async () => {
    if (!deletePlanId) return;
    setIsDeleting(true);
    try {
      await api.delete(`/installments/${deletePlanId}`);
      toast.success(isUrdu ? 'پلان ڈیلیٹ ہو گیا' : t('plan_deleted'));
      refresh();
    } catch {
      toast.error(isUrdu ? 'پلان ڈیلیٹ کرنے میں ناکامی' : t('error_deleting_plan'));
    } finally {
      setIsDeleting(false);
      setDeletePlanId(null);
    }
  }, [deletePlanId, refresh, t, isUrdu]);

  // ✅ Filter plans
  const filteredPlans = useMemo(() => {
    let filtered = plans;
    
    if (filterStatus !== 'all') {
      filtered = filtered.filter(p => p.status?.toLowerCase() === filterStatus.toLowerCase());
    }
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const customer = customers.find(c => c.id === p.customerId);
        return customer?.name?.toLowerCase().includes(q) ||
               customer?.phone?.includes(q) ||
               p.id?.toLowerCase().includes(q) ||
               p.installments?.some((i: any) => 
                 i.installmentNo?.toString().includes(q) ||
                 i.amount?.toString().includes(q)
               );
      });
    }
    
    return filtered;
  }, [plans, filterStatus, searchQuery, customers]);

  // ✅ Render plan card
  const renderPlan = useCallback((plan: any) => {
    const selectedForPlan = getSelectedForPlan(plan.id);
    
    return (
      <div key={plan.id} className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Plan Header */}
        <div className="p-4 sm:p-5 flex flex-wrap justify-between items-center border-b border-gray-100 dark:border-gray-700 gap-2">
          <div>
            <h3 className="font-semibold text-lg text-gray-800 dark:text-white">
              {t('plan_id')}: {plan.id.slice(-8)}
            </h3>
            <p className="text-sm text-gray-500">
              {t('total_amount')}: Rs. {plan.totalAmount}
              {plan.createdBy && ` | ${t('created_by') || 'Created By'}: ${plan.createdBy}`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={plan.status} />
            
            <button
              onClick={() => setAdvancePay(plan.id)}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700 transition-colors"
            >
              {isUrdu ? 'ایڈوانس ادائیگی' : t('advance_payment')}
            </button>
            
            {selectedForPlan.length > 0 && (
              <button
                onClick={() => setBulkPay({ planId: plan.id, selectedInstallments: selectedForPlan })}
                className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-xs hover:bg-yellow-700 transition-colors"
              >
                {isUrdu ? 'منتخب ادائیگی' : t('pay_selected')} ({selectedForPlan.length})
              </button>
            )}
            
            {(plan.status === 'defaulted' || plan.status === 'overdue') && (
              <button
                onClick={() => setReschedulePlan({ id: plan.id, status: plan.status })}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-semibold transition-colors"
                title={isUrdu ? 'دوبارہ شیڈول کریں' : 'Reschedule'}
              >
                🔄 {isUrdu ? 'دوبارہ شیڈول' : 'Reschedule'}
              </button>
            )}
            
            <button
              onClick={() => setReceiptPlanId(plan.id)}
              className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
              title={t('view_receipt')}
            >
              🧾 {t('receipt')}
            </button>
            
            <button
              onClick={() => setDeletePlanId(plan.id)}
              className="px-2 py-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-lg text-xs hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
              title={t('delete')}
            >
              🗑️
            </button>
          </div>
        </div>

        {/* Installments Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2 text-start">#</th>
                <th className="px-4 py-2 text-start">{t('due_date')}</th>
                <th className="px-4 py-2 text-start">{t('amount')}</th>
                <th className="px-4 py-2 text-start">{isUrdu ? 'فائن' : 'Fine'}</th>
                <th className="px-4 py-2 text-start">{isUrdu ? 'کل' : 'Total'}</th>
                <th className="px-4 py-2 text-start">{t('paid')}</th>
                <th className="px-4 py-2 text-start">{t('paid_date') || 'Paid Date'}</th>
                <th className="px-4 py-2 text-start">{isUrdu ? 'باقی' : 'Remaining'}</th>
                <th className="px-4 py-2 text-start">{t('action')}</th>
                <th className="px-4 py-2 text-center">{t('select')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
              {(plan.installments || []).map((inst: any) => {
                const key = `${plan.id}_${inst.installmentNo}`;
                const isPaid = inst.paid === true;
                const partialPaid = inst.partialPaid || 0;
                const instAmt = inst.amount || 0;
                const fineAmt = inst.fine || 0;
                const totalDue = instAmt + fineAmt;
                const remaining = inst.remaining > 0 ? inst.remaining : (isPaid ? 0 : totalDue);
                
                return (
                  <tr key={inst.installmentNo} className="hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors text-gray-800 dark:text-gray-200">
                    <td className="px-4 py-2 font-medium">{inst.installmentNo}</td>
                    <td className="px-4 py-2">
                      {(() => {
                        const d = new Date(inst.dueDate);
                        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      })()}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      Rs. {instAmt.toFixed(0)}
                    </td>
                    <td className="px-4 py-2">
                      {fineAmt > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Rs. {fineAmt.toFixed(0)}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2 font-semibold">
                      Rs. {totalDue.toFixed(0)}
                    </td>
                    <td className="px-4 py-2">
                      <PaymentStatusBadge paid={isPaid} partialPaid={partialPaid} t={t} isUrdu={isUrdu} />
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {(() => {
                        if (isPaid) {
                          const pd = inst.paidDate || inst.paid_date || null;
                          if (pd) {
                            try {
                              const dd = new Date(pd);
                              return `${String(dd.getDate()).padStart(2, '0')}/${String(dd.getMonth() + 1).padStart(2, '0')}/${dd.getFullYear()}`;
                            } catch (e) {
                              return pd;
                            }
                          }
                          if (plan.payments) {
                            const matchingPayments = plan.payments.filter((p: any) => 
                              p.installment_no === inst.installmentNo || p.installmentNo === inst.installmentNo
                            );
                            if (matchingPayments.length > 0) {
                              const latestPay = matchingPayments.sort((a: any, b: any) => 
                                new Date(b.transaction_date || b.payment_date || 0).getTime() - 
                                new Date(a.transaction_date || a.payment_date || 0).getTime()
                              )[0];
                              const payDate = latestPay.transaction_date || latestPay.payment_date;
                              if (payDate) {
                                try {
                                  const dd2 = new Date(payDate);
                                  return `${String(dd2.getDate()).padStart(2, '0')}/${String(dd2.getMonth() + 1).padStart(2, '0')}/${dd2.getFullYear()}`;
                                } catch (e) {
                                  return payDate;
                                }
                              }
                            }
                          }
                          return isUrdu ? 'ادا شدہ' : 'Paid';
                        }
                        return '—';
                      })()}
                    </td>
                    <td className="px-4 py-2 font-medium text-xs">
                      {(() => {
                        if (isPaid) return <span className="text-emerald-600 dark:text-emerald-400">Rs 0</span>;
                        if (partialPaid > 0) return <span className="text-amber-600 dark:text-amber-400">Rs {(totalDue - partialPaid).toFixed(0)}</span>;
                        return <span className="text-rose-600 dark:text-rose-400">Rs {totalDue.toFixed(0)}</span>;
                      })()}
                    </td>
                    <td className="px-4 py-2">
                      {!isPaid && (
                        <button
                          onClick={() => setSinglePay({
                            planId: plan.id,
                            installmentNo: inst.installmentNo,
                            dueAmount: inst.remaining > 0 && inst.remaining < instAmt ? inst.remaining : instAmt,
                            finePerDay: plan.finePerDay || 10,
                            graceDays: plan.gracePeriodDays || 2,
                            dueDate: inst.dueDate,
                            fineAmount: fineAmt
                          })}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-xs transition-colors"
                        >
                          {t('pay')}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2 text-center">
                      {!isPaid && (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(key)}
                          onChange={() => toggleSelection(plan.id, inst.installmentNo)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }, [getSelectedForPlan, t, isUrdu, selectedIds, toggleSelection]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-4 pb-10">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-gray-800 dark:text-white">
        {isUrdu ? 'اقساط' : t('installments')}
      </h1>

      {/* ✅ Customer Selection */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-gray-700 dark:text-gray-300">
          {isUrdu ? 'گاہک منتخب کریں' : t('select_customer')}
        </label>
        <CustomerSearch
          selectedCustomerId={selectedCustomer}
          onSelect={(id) => setSelectedCustomer(id)}
        />
      </div>

      {/* ✅ Filters */}
      {selectedCustomer && plans.length > 0 && (
        <div className="mb-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="w-full sm:w-auto flex items-end">
              <button
                onClick={async () => {
                  // Print all plans functionality
                  toast(isUrdu ? 'پرنٹ تیار ہو رہا ہے...' : 'Preparing print...');
                }}
                className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-800 dark:hover:bg-gray-100 transition-all shadow-sm"
              >
                🖨️ {isUrdu ? 'تمام پلان پرنٹ کریں' : 'Print All Plans'}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('status')}</label>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400"
              >
                <option value="all">{t('all')}</option>
                <option value="active">{t('active')}</option>
                <option value="completed">{t('completed')}</option>
                <option value="defaulted">{t('defaulted')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('from_date')}</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={e => setFilterDateFrom(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('to_date')}</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={e => setFilterDateTo(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{t('search')}</label>
              <input
                type="text"
                placeholder={isUrdu ? 'نام یا فون نمبر...' : 'Name or phone...'}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400 w-48"
              />
            </div>

            <button
              onClick={() => {
                setFilterStatus('all');
                setFilterDateFrom('');
                setFilterDateTo('');
                setSearchQuery('');
              }}
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
            >
              {t('clear')}
            </button>
          </div>
        </div>
      )}

      {/* ✅ Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{isUrdu ? 'لوڈ ہو رہا ہے...' : t('loading')}</p>
          </div>
        </div>
      )}

      {/* ✅ Error */}
      {error && !loading && (
        <div className="text-center py-16">
          <p className="text-red-500 mb-2 font-semibold">{error}</p>
          {errorDetails && (
            <p className="text-red-400 text-sm bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg inline-block mb-4">
              {errorDetails}
            </p>
          )}
          <div className="flex justify-center gap-3">
            <button onClick={refresh} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
              {t('retry')}
            </button>
            <button onClick={() => { setError(''); setErrorDetails(''); }} className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors">
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* ✅ Empty States */}
      {!loading && !error && !selectedCustomer && (
        <div className="text-center py-16">
          <p className="text-gray-500">{isUrdu ? 'براہ کرم گاہک منتخب کریں' : t('no_customer_selected')}</p>
        </div>
      )}
      
      {!loading && !error && selectedCustomer && plans.length === 0 && (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-600">
          <svg className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-gray-500">{isUrdu ? 'اس گاہک کی کوئی قسط نہیں' : t('no_installments')}</p>
        </div>
      )}

      {/* ✅ Plans */}
      {!loading && !error && selectedCustomer && filteredPlans.map(renderPlan)}

      {/* ✅ Modals */}
      {singlePay && (
        <PaymentModal
          {...singlePay}
          mode="single"
          onClose={() => setSinglePay(null)}
          onSuccess={refresh}
        />
      )}
      
      {advancePay && (
        <PaymentModal
          planId={advancePay}
          mode="advance"
          onClose={() => setAdvancePay(null)}
          onSuccess={refresh}
        />
      )}
      
      {bulkPay && (
        <BulkPaymentModal
          planId={bulkPay.planId}
          selectedInstallments={bulkPay.selectedInstallments}
          onClose={() => setBulkPay(null)}
          onSuccess={refresh}
        />
      )}
      
      {receiptPlanId && (
        <PlanReceipt
          planId={receiptPlanId}
          onClose={() => setReceiptPlanId(null)}
        />
      )}

      {/* ✅ Delete Confirmation */}
      {deletePlanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">
              {isUrdu ? 'پلان ڈیلیٹ کریں؟' : t('delete_plan_confirm_title')}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {isUrdu ? 'کیا آپ واقعی اس پلان کو ڈیلیٹ کرنا چاہتے ہیں؟' : t('delete_plan_confirm_message')}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeletePlanId(null)}
                className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {isUrdu ? 'منسوخ کریں' : t('cancel')}
              </button>
              <button
                onClick={handleDeletePlan}
                disabled={isDeleting}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white transition-colors"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    {isUrdu ? 'ڈیلیٹ ہو رہا...' : t('deleting')}
                  </span>
                ) : (
                  isUrdu ? 'ڈیلیٹ کریں' : t('delete')
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Reschedule Modal */}
      {reschedulePlan && (
        <RescheduleModal
          planId={reschedulePlan.id}
          planStatus={reschedulePlan.status}
          onClose={() => setReschedulePlan(null)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
};

export default InstallmentList;