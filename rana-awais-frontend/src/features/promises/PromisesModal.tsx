import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../utils/api';
import toast from 'react-hot-toast';

interface PromiseItem {
  id: string;
  customer_id: string;
  plan_id: string;
  installment_no: number;
  promise_date: string;
  amount: number;
  status: string;
  remarks: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  customer_name: string;
  customer_phone: string;
  customer_name_ur: string;
  product_name: string;
  due_date: string;
}

interface PromisesModalProps {
  isUrdu: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const PromisesModal: React.FC<PromisesModalProps> = ({ isUrdu, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'all'>('today');
  const [promises, setPromises] = useState<PromiseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchPromises = async () => {
    setLoading(true);
    try {
      let endpoint = '/promises/pending';
      if (activeTab === 'today') endpoint = '/promises/today';
      else if (activeTab === 'all') endpoint = '/promises';

      const res = await api.get(endpoint);
      const data = res.data?.promises || res.data?.data || [];
      setPromises(Array.isArray(data) ? data : Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setPromises([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromises();
  }, [activeTab]);

  const handleUpdateStatus = async (id: string, status: 'fulfilled' | 'broken') => {
    setUpdatingId(id);
    try {
      await api.put('/promises/status', { id, status });
      toast.success(
        status === 'fulfilled'
          ? (isUrdu ? 'وعدہ پورا ہو گیا' : 'Promise fulfilled')
          : (isUrdu ? 'وعدہ ٹوٹ گیا' : 'Promise broken')
      );
      fetchPromises();
      onSuccess();
    } catch (err) {
      toast.error(isUrdu ? 'حالت تبدیل نہیں ہو سکی' : 'Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-full text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
            {isUrdu ? 'زیر التوا' : 'Pending'}
          </span>
        );
      case 'fulfilled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            {isUrdu ? 'پورا' : 'Fulfilled'}
          </span>
        );
      case 'broken':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full text-[10px] font-semibold">
            <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
            {isUrdu ? 'ٹوٹ گیا' : 'Broken'}
          </span>
        );
      default:
        return <span className="text-xs text-gray-500">{status}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isUrdu ? 'ur-PK' : 'en-GB');
    } catch {
      return dateStr.split('T')[0] || dateStr;
    }
  };

  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false;
    try {
      const d = new Date(dateStr);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return d < today;
    } catch {
      return false;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
              <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {isUrdu ? 'وعدے' : 'Promises'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {isUrdu ? 'گاہکوں کے وعدوں کا انتظام' : 'Manage customer promises'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          {[
            { key: 'today', label: isUrdu ? 'آج کے وعدے' : "Today's Promises" },
            { key: 'pending', label: isUrdu ? 'زیر التوا' : 'Pending' },
            { key: 'all', label: isUrdu ? 'تمام' : 'All' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/25'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 border border-gray-200 dark:border-gray-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-gray-400">{isUrdu ? 'لوڈ ہو رہا ہے...' : 'Loading...'}</p>
            </div>
          ) : promises.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-400 font-medium">
                {activeTab === 'today'
                  ? (isUrdu ? 'آج کوئی وعدے نہیں ہیں' : 'No promises due today')
                  : (isUrdu ? 'کوئی وعدے نہیں ہیں' : 'No promises found')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {promises.map((promise) => (
                <div
                  key={promise.id}
                  className={`bg-white dark:bg-gray-700/50 rounded-xl border-2 p-4 transition-all ${
                    promise.status === 'fulfilled'
                      ? 'border-emerald-200 dark:border-emerald-800 opacity-70'
                      : promise.status === 'broken'
                      ? 'border-red-200 dark:border-red-800 opacity-70'
                      : isOverdue(promise.promise_date)
                      ? 'border-red-300 dark:border-red-700'
                      : 'border-amber-200 dark:border-amber-800'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-gray-900 dark:text-white truncate">
                          {isUrdu
                            ? (promise.customer_name_ur || promise.customer_name || '—')
                            : (promise.customer_name || promise.customer_name_ur || '—')}
                        </span>
                        {getStatusBadge(promise.status)}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                        {promise.customer_phone && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {promise.customer_phone}
                          </span>
                        )}
                        {promise.product_name && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            {promise.product_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {isUrdu ? 'قسط' : 'Inst'} #{promise.installment_no}
                        </span>
                      </div>
                      {promise.remarks && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                          "{promise.remarks}"
                        </p>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-sm font-bold text-gray-900 dark:text-white">
                        Rs. {(promise.amount || 0).toLocaleString()}
                      </div>
                      <div className={`text-xs mt-0.5 ${
                        isOverdue(promise.promise_date) && promise.status === 'pending'
                          ? 'text-red-500 font-semibold'
                          : 'text-gray-500 dark:text-gray-400'
                      }`}>
                        {formatDate(promise.promise_date)}
                        {isOverdue(promise.promise_date) && promise.status === 'pending' && (
                          <span className="ml-1">({isUrdu ? 'تاخیر' : 'Overdue'})</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons - Only for pending promises */}
                  {promise.status === 'pending' && (
                    <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
                      <button
                        onClick={() => handleUpdateStatus(promise.id, 'fulfilled')}
                        disabled={updatingId === promise.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[10px] font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all border border-emerald-200 dark:border-emerald-800 disabled:opacity-50"
                      >
                        {updatingId === promise.id ? (
                          <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {isUrdu ? 'پورا ہوا' : 'Fulfilled'}
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(promise.id, 'broken')}
                        disabled={updatingId === promise.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-[10px] font-semibold hover:bg-red-100 dark:hover:bg-red-900/50 transition-all border border-red-200 dark:border-red-800 disabled:opacity-50"
                      >
                        {updatingId === promise.id ? (
                          <div className="w-3 h-3 border-2 border-red-500 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        )}
                        {isUrdu ? 'ٹوٹ گیا' : 'Broken'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PromisesModal;
