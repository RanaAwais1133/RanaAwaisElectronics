import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { useAuthStore } from '../../store/useAuthStore';

interface RescheduleModalProps {
  planId: string;
  planStatus: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({ planId, planStatus, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  const [option, setOption] = useState<'continue' | 'new'>('continue');
  const [newNumInstallments, setNewNumInstallments] = useState(6);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [remainingBalance, setRemainingBalance] = useState<number | null>(null);
  const [fetching, setFetching] = useState(false);

  // ✅ Fetch plan details to show remaining balance
  useEffect(() => {
    if (option === 'new') {
      setFetching(true);
      api.get(`/installments/${planId}`)
        .then(res => {
          const plan = res.data;
          const remaining = plan.remainingAmount || 0;
          setRemainingBalance(remaining);
        })
        .catch(() => {
          setRemainingBalance(null);
        })
        .finally(() => setFetching(false));
    }
  }, [planId, option]);

  // ✅ Handle reschedule
  const handleReschedule = useCallback(async () => {
    if (option === 'new') {
      if (!newStartDate) {
        toast.error(isUrdu ? 'براہ کرم شروعات کی تاریخ درج کریں' : 'Please enter start date');
        return;
      }
      if (newNumInstallments <= 0) {
        toast.error(isUrdu ? 'اقساط کی تعداد ایک سے زیادہ ہونی چاہیے' : 'Number of installments must be greater than 0');
        return;
      }
      if (newNumInstallments > 60) {
        toast.error(isUrdu ? 'اقساط کی تعداد 60 سے زیادہ نہیں ہونی چاہیے' : 'Number of installments cannot exceed 60');
        return;
      }
    }

    setLoading(true);
    try {
      await api.post('/installments/reschedule', {
        plan_id: planId,
        option,
        new_num_installments: option === 'new' ? newNumInstallments : 0,
        new_start_date: option === 'new' ? newStartDate : '',
        rescheduled_by: currentUser?.displayName || currentUser?.username || '',
      });
      
      toast.success(isUrdu ? 'پلان دوبارہ شیڈول ہو گیا' : 'Plan rescheduled successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 
                       (isUrdu ? 'دوبارہ شیڈولنگ ناکام' : 'Rescheduling failed');
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  }, [planId, option, newNumInstallments, newStartDate, currentUser, onSuccess, onClose, t, isUrdu]);

  // ✅ Handle option change
  const handleOptionChange = useCallback((value: 'continue' | 'new') => {
    setOption(value);
    if (value === 'continue') {
      setNewNumInstallments(6);
      setNewStartDate(new Date().toISOString().split('T')[0]);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* ✅ Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {isUrdu ? 'پلان دوبارہ شیڈول کریں' : 'Reschedule Plan'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-all text-xl"
          >
            ✕
          </button>
        </div>

        {/* ✅ Plan Status */}
        <div className="mb-5 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {isUrdu ? 'موجودہ حالت' : 'Current status'}: 
            <span className={`font-semibold ml-2 ${
              planStatus === 'defaulted' ? 'text-red-500' : 
              planStatus === 'overdue' ? 'text-amber-500' : 
              'text-green-500'
            }`}>
              {planStatus}
            </span>
          </p>
          {option === 'new' && remainingBalance !== null && (
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              {isUrdu ? 'باقی رقم' : 'Remaining Balance'}: 
              <span className="font-semibold ml-2 text-blue-600 dark:text-blue-400">
                Rs. {remainingBalance.toFixed(2)}
              </span>
            </p>
          )}
        </div>

        {/* ✅ Option A: Continue */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all mb-3 ${
          option === 'continue' 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
        }`}>
          <input
            type="radio"
            name="option"
            value="continue"
            checked={option === 'continue'}
            onChange={() => handleOptionChange('continue')}
            className="mt-1.5 text-blue-600 focus:ring-blue-500"
          />
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">
              {isUrdu ? 'جاری رکھیں (موجودہ شیڈول)' : 'Continue (Same Schedule)'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isUrdu ? 'پلان کو دوبارہ فعال کریں اور موجودہ اقساط کے شیڈول کو برقرار رکھیں' : 'Reactivate the plan and keep the existing installment schedule'}
            </p>
          </div>
        </label>

        {/* ✅ Option B: New Schedule */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all mb-4 ${
          option === 'new' 
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
            : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
        }`}>
          <input
            type="radio"
            name="option"
            value="new"
            checked={option === 'new'}
            onChange={() => handleOptionChange('new')}
            className="mt-1.5 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <p className="font-semibold text-gray-800 dark:text-white">
              {isUrdu ? 'نیا شیڈول بنائیں' : 'Create New Schedule'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {isUrdu ? 'بقیہ رقم کی بنیاد پر نئی اقساط کا شیڈول بنائیں' : 'Create a new installment schedule based on remaining balance'}
            </p>
            
            {option === 'new' && (
              <div className="space-y-3 mt-2">
                {/* Number of Installments */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {isUrdu ? 'نئی اقساط کی تعداد' : 'Number of Installments'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={newNumInstallments}
                    onChange={e => setNewNumInstallments(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {isUrdu ? 'زیادہ سے زیادہ 60 اقساط' : 'Maximum 60 installments'}
                  </p>
                </div>
                
                {/* New Start Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                    {isUrdu ? 'نئی شروعات کی تاریخ' : 'New Start Date'}
                  </label>
                  <input
                    type="date"
                    value={newStartDate}
                    onChange={e => setNewStartDate(e.target.value)}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-colors"
                  />
                </div>

                {/* Preview new installment amount */}
                {!fetching && remainingBalance !== null && remainingBalance > 0 && newNumInstallments > 0 && (
                  <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      {isUrdu ? 'نئی قسط کی تخمینہ رقم' : 'Estimated new installment amount'}:
                      <span className="font-bold text-blue-600 dark:text-blue-400 ml-2">
                        Rs. {(remainingBalance / newNumInstallments).toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </label>

        {/* ✅ Buttons */}
        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm font-medium"
          >
            {isUrdu ? 'منسوخ کریں' : t('cancel')}
          </button>
          <button
            onClick={handleReschedule}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                {isUrdu ? 'ہو رہا ہے...' : 'Processing...'}
              </span>
            ) : (
              isUrdu ? 'شیڈول کریں' : 'Reschedule'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;