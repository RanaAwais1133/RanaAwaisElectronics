import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';

interface RescheduleModalProps {
  planId: string;
  planStatus: string;
  onClose: () => void;
  onSuccess: () => void;
}

const RescheduleModal: React.FC<RescheduleModalProps> = ({ planId, planStatus, onClose, onSuccess }) => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [option, setOption] = useState<'continue' | 'new'>('continue');
  const [newNumInstallments, setNewNumInstallments] = useState(6);
  const [newStartDate, setNewStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  const handleReschedule = async () => {
    if (option === 'new' && (!newStartDate || newNumInstallments <= 0)) {
      toast.error(isUrdu ? 'براہ کرم درست تاریخ اور اقساط کی تعداد درج کریں' : 'Please enter valid date and number of installments');
      return;
    }
    setLoading(true);
    try {
      await api.post('/installments/reschedule', {
        plan_id: planId,
        option,
        new_num_installments: option === 'new' ? newNumInstallments : 0,
        new_start_date: option === 'new' ? newStartDate : '',
      });
      toast.success(isUrdu ? 'پلان دوبارہ شیڈول ہو گیا' : 'Plan rescheduled successfully');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || (isUrdu ? 'دوبارہ شیڈولنگ ناکام' : 'Rescheduling failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 max-w-md w-full shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-2">
          {isUrdu ? 'پلان دوبارہ شیڈول کریں' : 'Reschedule Plan'}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
          {isUrdu ? 'اس پلان کی موجودہ حالت: ' : 'Current plan status: '}
          <span className={`font-semibold ${planStatus === 'defaulted' ? 'text-red-500' : 'text-amber-500'}`}>{planStatus}</span>
        </p>

        {/* Option A: Continue */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all mb-3 ${option === 'continue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
          <input type="radio" name="option" value="continue" checked={option === 'continue'} onChange={() => setOption('continue')} className="mt-1" />
          <div>
            <p className="font-semibold text-gray-800 dark:text-white">{isUrdu ? 'جاری رکھیں (موجودہ شیڈول)' : 'Continue (Same Schedule)'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{isUrdu ? 'پلان کو دوبارہ فعال کریں اور موجودہ اقساط کے شیڈول کو برقرار رکھیں' : 'Reactivate the plan and keep the existing installment schedule'}</p>
          </div>
        </label>

        {/* Option B: New Schedule */}
        <label className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all mb-4 ${option === 'new' ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'}`}>
          <input type="radio" name="option" value="new" checked={option === 'new'} onChange={() => setOption('new')} className="mt-1" />
          <div className="flex-1">
            <p className="font-semibold text-gray-800 dark:text-white">{isUrdu ? 'نیا شیڈول بنائیں' : 'Create New Schedule'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{isUrdu ? 'بقیہ رقم کی بنیاد پر نئی اقساط کا شیڈول بنائیں' : 'Create a new installment schedule based on remaining balance'}</p>
            
            {option === 'new' && (
              <div className="space-y-3 mt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{isUrdu ? 'نئی اقساط کی تعداد' : 'Number of Installments'}</label>
                  <input type="number" min={1} max={60} value={newNumInstallments} onChange={e => setNewNumInstallments(Math.max(1, parseInt(e.target.value) || 1))} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{isUrdu ? 'نئی شروعات کی تاریخ' : 'New Start Date'}</label>
                  <input type="date" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2 text-sm dark:bg-gray-700 focus:ring-2 focus:ring-blue-400" />
                </div>
              </div>
            )}
          </div>
        </label>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all text-sm">
            {t('cancel')}
          </button>
          <button onClick={handleReschedule} disabled={loading} className="px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 text-white text-sm font-semibold hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25">
            {loading ? (isUrdu ? 'ہو رہا ہے...' : 'Processing...') : (isUrdu ? 'شیڈول کریں' : 'Reschedule')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RescheduleModal;
