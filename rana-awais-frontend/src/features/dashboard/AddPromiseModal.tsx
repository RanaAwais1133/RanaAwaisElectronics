import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import { useCustomerStore } from '../../store/useCustomerStore';
import toast from 'react-hot-toast';
import { formatPhone } from '../../utils/helpers';

interface AddPromiseModalProps {
  isUrdu: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const AddPromiseModal: React.FC<AddPromiseModalProps> = ({ isUrdu, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { customers, fetchCustomers } = useCustomerStore();
  
  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerInstallments, setCustomerInstallments] = useState<any[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedInstallmentNo, setSelectedInstallmentNo] = useState(0);
  const [selectedAmount, setSelectedAmount] = useState(0);
  const [promiseDate, setPromiseDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Load customers
  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  // Filter customers by search
  const filteredCustomers = useMemo(() => {
    if (!search.trim()) return customers.slice(0, 20);
    const q = search.toLowerCase();
    return customers.filter((c: any) =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.nameUrdu || '').includes(q) ||
      (c.phone || '').includes(q) ||
      (c.fatherName || c.father_name || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [customers, search]);

  // Fetch customer's installment plan when customer selected
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerInstallments([]);
      return;
    }
    setLoading(true);
    api.get(`/installments/customer?customer_id=${selectedCustomerId}`)
      .then((res: any) => {
        const data = res.data?.data || res.data || [];
        const plans = Array.isArray(data) ? data : [];
        // Flatten: get all unpaid installments across all active plans
        const allInstallments: any[] = [];
        plans.forEach((plan: any) => {
          const installments = plan.schedule || plan.installments || [];
          installments.forEach((inst: any) => {
            if (!inst.paid) {
              allInstallments.push({
                ...inst,
                plan_id: plan.id || plan.ID,
                product_name: plan.product_name || inst.product_name || '—',
                total_installments: plan.num_installments || plan.numInstallments || plan.total_installments || 0,
                customer_name: plan.customer_name || '',
              });
            }
          });
        });
        setCustomerInstallments(allInstallments);
      })
      .catch(() => setCustomerInstallments([]))
      .finally(() => setLoading(false));
  }, [selectedCustomerId]);

  const selectedCustomer = useMemo(() => 
    customers.find((c: any) => c.id === selectedCustomerId), 
    [customers, selectedCustomerId]
  );

  const handleSelectCustomer = (customer: any) => {
    setSelectedCustomerId(customer.id);
    setSearch(isUrdu ? (customer.nameUrdu || customer.name) : (customer.name || customer.nameUrdu));
    setShowSearchResults(false);
    setSelectedPlanId('');
    setSelectedInstallmentNo(0);
    setSelectedAmount(0);
  };

  const handleSelectInstallment = (inst: any) => {
    setSelectedPlanId(inst.plan_id);
    setSelectedInstallmentNo(inst.installment_no || inst.installmentNo || 0);
    setSelectedAmount(inst.amount || 0);
  };

  const handleSubmit = async () => {
    if (!selectedCustomerId || !selectedPlanId || !promiseDate) {
      toast.error(isUrdu ? 'براہ کرم تمام ضروری فیلڈز پُر کریں' : 'Please fill all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/promises', {
        customer_id: selectedCustomerId,
        plan_id: selectedPlanId,
        installment_no: selectedInstallmentNo,
        promise_date: promiseDate,
        amount: selectedAmount,
        remarks,
      });
      toast.success(isUrdu ? 'وعدہ کامیابی سے محفوظ ہو گیا' : 'Promise saved successfully');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(isUrdu ? 'وعدہ محفوظ نہیں ہو سکا' : 'Failed to save promise');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-2">
            <span className="text-xl">🤝</span>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
              {isUrdu ? 'نیا وعدہ شامل کریں' : 'Add New Promise'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-5 space-y-4">
          {/* Customer Search */}
          <div className="relative">
            <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              {isUrdu ? 'گاہک تلاش کریں' : 'Search Customer'} *
            </label>
            <input
              type="text"
              value={selectedCustomerId && selectedCustomer ? (isUrdu ? (selectedCustomer.nameUrdu || selectedCustomer.name) : (selectedCustomer.name || selectedCustomer.nameUrdu)) : search}
              onChange={e => { setSearch(e.target.value); setShowSearchResults(true); if (selectedCustomerId) setSelectedCustomerId(''); }}
              onFocus={() => setShowSearchResults(true)}
              placeholder={isUrdu ? 'گاہک کا نام یا فون نمبر لکھیں...' : 'Type customer name or phone...'}
              className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
              disabled={!!selectedCustomerId}
            />
            {selectedCustomerId && (
              <button
                onClick={() => { setSelectedCustomerId(''); setSearch(''); setCustomerInstallments([]); }}
                className="absolute right-2 top-8 text-xs text-red-500 hover:text-red-700 font-semibold"
              >
                {isUrdu ? 'تبدیل کریں' : 'Change'}
              </button>
            )}
            {showSearchResults && !selectedCustomerId && search && (
              <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg max-h-48 overflow-auto">
                {filteredCustomers.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-gray-500">{isUrdu ? 'کوئی گاہک نہیں ملا' : 'No customers found'}</p>
                ) : (
                  filteredCustomers.map((c: any) => (
                    <button
                      key={c.id}
                      onClick={() => handleSelectCustomer(c)}
                      className="w-full text-left px-4 py-2.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors border-b border-gray-100 dark:border-gray-600 last:border-b-0"
                    >
                      <div className="font-semibold text-sm text-gray-800 dark:text-white">
                        {isUrdu ? (c.nameUrdu || c.name) : (c.name || c.nameUrdu)}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatPhone(c.phone)} {c.fatherName || c.father_name ? `• ${c.fatherName || c.father_name}` : ''}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Customer Installments */}
          {selectedCustomerId && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                {isUrdu ? 'واجب الادا قسط منتخب کریں' : 'Select Due Installment'} *
              </label>
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="w-6 h-6 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : customerInstallments.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
                  {isUrdu ? 'کوئی واجب الادا قسط نہیں' : 'No pending installments'}
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-auto">
                  {customerInstallments.map((inst, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectInstallment(inst)}
                      className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${
                        selectedPlanId === inst.plan_id && selectedInstallmentNo === (inst.installment_no || inst.installmentNo)
                          ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/30 dark:border-amber-400'
                          : 'border-gray-200 dark:border-gray-600 hover:border-amber-300 dark:hover:border-amber-500'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-sm font-semibold text-gray-800 dark:text-white">
                            {isUrdu ? 'قسط' : 'Installment'} #{inst.installment_no || inst.installmentNo}/{inst.total_installments}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                            {inst.product_name || '—'}
                          </span>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-800 dark:text-white">
                            Rs. {(inst.amount || 0).toLocaleString()}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {inst.due_date || '—'}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Promise Date & Remarks */}
          {selectedPlanId && (
            <>
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  {isUrdu ? 'وعدے کی تاریخ' : 'Promise Date'} *
                </label>
                <input
                  type="date"
                  value={promiseDate}
                  onChange={e => setPromiseDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  {isUrdu ? 'وعدے کی رقم' : 'Promise Amount'}
                </label>
                <div className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-sm font-bold text-gray-800 dark:text-white">
                  Rs. {selectedAmount.toLocaleString()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
                  {isUrdu ? 'ریمارکس' : 'Remarks'}
                </label>
                <textarea
                  value={remarks}
                  onChange={e => setRemarks(e.target.value)}
                  rows={2}
                  placeholder={isUrdu ? 'کوئی نوٹ لکھیں (اختیاری)' : 'Add any notes (optional)'}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-amber-400 focus:border-transparent resize-none"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors"
          >
            {isUrdu ? 'منسوخ' : 'Cancel'}
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedPlanId || !promiseDate || submitting}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {isUrdu ? 'محفوظ ہو رہا ہے...' : 'Saving...'}
              </span>
            ) : (
              isUrdu ? 'وعدہ محفوظ کریں' : 'Save Promise'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddPromiseModal;