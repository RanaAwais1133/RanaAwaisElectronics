import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';

interface CustomerHistoryProps {
  customerId: string;
  onClose: () => void;
}

interface PlanData {
  id: string;
  product_name: string;
  product_name_urdu: string;
  total_amount: number;
  down_payment: number;
  remaining_amount: number;
  num_installments: number;
  status: string;
  created_at: string;
  completed_date: string;
  completed_by: string;
  payments: { amount: number; method: string; date: string; remarks: string }[];
  promises: { date: string; amount: number; status: string; remarks: string }[];
}

interface CustomerData {
  id: string;
  name: string;
  nameUrdu: string;
  phone: string;
  cnic: string;
  address: string;
  remarks: string;
  completedRemarks: string;
}

const CustomerHistory: React.FC<CustomerHistoryProps> = ({ customerId, onClose }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [plans, setPlans] = useState<PlanData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/customers/${customerId}/history`)
      .then(res => {
        if (cancelled) return;
        const d = res.data;
        setCustomer(d.customer);
        setPlans(Array.isArray(d.plans) ? d.plans : []);
      })
      .catch(() => {
        // ✅ OFFLINE FALLBACK: Try to load from IndexedDB cached installments
        if (!cancelled) {
          import('../../db/indexeddb').then(({ offlineDB }) => {
            offlineDB.getCachedInstallments().then(cached => {
              if (cached && cached.length > 0 && !cancelled) {
                const filtered = cached.filter((inst: any) => 
                  inst.customer_id === customerId || inst.customerId === customerId
                );
                if (filtered.length > 0) {
                  // Group by plan_id to reconstruct plans
                  const planMap = new Map<string, any>();
                  filtered.forEach((inst: any) => {
                    const pid = inst.plan_id || inst.planId || inst.id;
                    if (!planMap.has(pid)) {
                      planMap.set(pid, {
                        id: pid,
                        product_name: inst.product_name || '',
                        product_name_urdu: inst.product_name_urdu || '',
                        total_amount: inst.total_amount || inst.totalAmount || 0,
                        down_payment: inst.down_payment || inst.downPayment || 0,
                        remaining_amount: inst.remaining_amount || inst.remainingAmount || 0,
                        num_installments: inst.total_installments || inst.numInstallments || 0,
                        status: inst.status || 'active',
                        created_at: inst.created_at || inst.createdAt || '',
                        payments: [],
                        promises: []
                      });
                    }
                  });
                  setPlans(Array.from(planMap.values()));
                  return;
                }
              }
              if (!cancelled) setError(isUrdu ? 'ہسٹری لوڈ نہیں ہو سکی' : 'Failed to load history');
            }).catch(() => {
              if (!cancelled) setError(isUrdu ? 'ہسٹری لوڈ نہیں ہو سکی' : 'Failed to load history');
            });
          }).catch(() => {
            if (!cancelled) setError(isUrdu ? 'ہسٹری لوڈ نہیں ہو سکی' : 'Failed to load history');
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [customerId, isUrdu]);

  const getStatusBadge = (status: string) => {
    const s = status?.toLowerCase() || '';
    if (s === 'active' || s === 'open') {
      return <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-semibold">{isUrdu ? 'فعال' : 'Active'}</span>;
    }
    if (s === 'completed' || s === 'closed') {
      return <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full text-[10px] font-semibold">{isUrdu ? 'مکمل' : 'Completed'}</span>;
    }
    return <span className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 text-gray-500 rounded-full text-[10px] font-semibold">{s || '—'}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
              <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isUrdu ? 'گاہک کی ہسٹری' : 'Customer History'}
              </h2>
              {customer && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {isUrdu ? (customer.nameUrdu || customer.name) : customer.name} — {customer.phone}
                </p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-red-500 font-medium">{error}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Remarks Section */}
              {customer && (customer.remarks || customer.completedRemarks) && (
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                    {isUrdu ? 'گاہک کے ریمارکس' : 'Customer Remarks'}
                  </h3>
                  {customer.remarks && (
                    <div className="mb-2">
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">{isUrdu ? 'ریمارکس' : 'Remarks'}:</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{customer.remarks}</p>
                    </div>
                  )}
                  {customer.completedRemarks && (
                    <div>
                      <span className="text-[10px] font-semibold text-gray-500 uppercase">{isUrdu ? 'مکمل ہونے کے ریمارکس' : 'Completed Remarks'}:</span>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{customer.completedRemarks}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Plans List */}
              {plans.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-3">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 font-medium">{isUrdu ? 'کوئی منصوبہ نہیں' : 'No plans found'}</p>
                </div>
              ) : (
                plans.map((plan, idx) => (
                  <div key={plan.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                    {/* Plan Header */}
                    <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-700/50 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <span className="text-sm font-semibold text-gray-800 dark:text-white">
                          {isUrdu ? (plan.product_name_urdu || plan.product_name) : plan.product_name}
                        </span>
                        {getStatusBadge(plan.status)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {plan.created_at || '—'}
                      </div>
                    </div>

                    {/* Plan Details */}
                    <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-gray-500">{isUrdu ? 'کل رقم' : 'Total'}:</span>
                        <span className="ml-1 font-bold text-gray-800 dark:text-white">Rs. {(plan.total_amount || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{isUrdu ? 'ادائیگی' : 'Down'}:</span>
                        <span className="ml-1 font-semibold text-gray-700 dark:text-gray-300">Rs. {(plan.down_payment || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{isUrdu ? 'باقی' : 'Remaining'}:</span>
                        <span className="ml-1 font-semibold text-amber-600">Rs. {(plan.remaining_amount || 0).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">{isUrdu ? 'قسطیں' : 'Insts'}:</span>
                        <span className="ml-1 font-semibold text-gray-700 dark:text-gray-300">{plan.num_installments || 0}</span>
                      </div>
                    </div>

                    {/* Payments */}
                    {plan.payments.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-2">
                          {isUrdu ? 'ادائیگیاں' : 'Payments'} ({plan.payments.length})
                        </p>
                        <div className="space-y-1">
                          {plan.payments.map((pay, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-emerald-50 dark:bg-emerald-900/10 rounded-lg px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{pay.date || '—'}</span>
                                <span className="text-gray-400">|</span>
                                <span className="text-gray-600 dark:text-gray-300">{pay.method || '—'}</span>
                              </div>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">Rs. {(pay.amount || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Promises */}
                    {plan.promises.length > 0 && (
                      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase mb-2">
                          {isUrdu ? 'وعدے' : 'Promises'} ({plan.promises.length})
                        </p>
                        <div className="space-y-1">
                          {plan.promises.map((prom, i) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-amber-50 dark:bg-amber-900/10 rounded-lg px-3 py-1.5">
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">{prom.date || '—'}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                                  prom.status === 'kept' ? 'bg-emerald-100 text-emerald-700' :
                                  prom.status === 'broken' ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                                }`}>
                                  {prom.status === 'kept' ? (isUrdu ? 'پورا' : 'Kept') :
                                   prom.status === 'broken' ? (isUrdu ? 'ٹوٹا' : 'Broken') :
                                   (isUrdu ? 'زیر التوا' : 'Pending')}
                                </span>
                              </div>
                              <span className="font-bold text-amber-600">Rs. {(prom.amount || 0).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Completed Info */}
                    {plan.status === 'completed' && plan.completed_date && (
                      <div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
                        <p className="text-[10px] text-blue-600 dark:text-blue-400">
                          {isUrdu ? 'مکمل ہوا' : 'Completed'}: {plan.completed_date} {plan.completed_by ? `— ${plan.completed_by}` : ''}
                        </p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CustomerHistory;