import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import { APP_CONFIG } from '../../config/app';
import { useAuthStore } from '../../store/useAuthStore';

// ✅ Notification Stats Component
const NotificationStats: React.FC<{ 
  totalSent: number; 
  totalFailed: number; 
  lastSent: string | null;
  isUrdu: boolean;
}> = ({ totalSent, totalFailed, lastSent, isUrdu }) => {
  if (totalSent === 0 && totalFailed === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isUrdu ? 'کامیاب' : 'Sent'}
        </p>
        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{totalSent}</p>
      </div>
      <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isUrdu ? 'ناکام' : 'Failed'}
        </p>
        <p className="text-lg font-bold text-red-600 dark:text-red-400">{totalFailed}</p>
      </div>
      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {isUrdu ? 'آخری بار' : 'Last Sent'}
        </p>
        <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
          {lastSent || (isUrdu ? 'کبھی نہیں' : 'Never')}
        </p>
      </div>
    </div>
  );
};

const NotificationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalSent: 0,
    totalFailed: 0,
    lastSent: null as string | null,
  });
  const [fetchingStats, setFetchingStats] = useState(false);

  // ✅ Page title
  useEffect(() => {
    document.title = `${isUrdu ? 'نوٹیفیکیشنز' : 'Notifications'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  // ✅ Fetch notification stats
  const fetchStats = async () => {
    setFetchingStats(true);
    try {
      const res = await api.get('/notifications/stats');
      setStats(res.data || { totalSent: 0, totalFailed: 0, lastSent: null });
    } catch (err) {
      // Silent fail for stats
    } finally {
      setFetchingStats(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  // ✅ Trigger reminders
  const triggerReminders = async () => {
    setLoading(true);
    try {
      const res = await api.post('/notifications/reminders', {
        triggered_by: currentUser?.displayName || currentUser?.username || '',
      });
      toast.success(isUrdu ? 'یاد دہانیاں بھیج دی گئیں' : t('reminders_sent'));
      
      // Update stats after sending
      if (res.data?.sentCount !== undefined) {
        setStats(prev => ({
          ...prev,
          totalSent: prev.totalSent + (res.data.sentCount || 0),
          totalFailed: prev.totalFailed + (res.data.failedCount || 0),
          lastSent: new Date().toISOString(),
        }));
      } else {
        fetchStats();
      }
    } catch (err: any) {
      const errorMsg = err?.response?.data?.error || err?.response?.data?.message || 
                       (isUrdu ? 'یاد دہانیاں بھیجنے میں ناکامی' : t('reminders_failed'));
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Format date
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return isUrdu ? 'کبھی نہیں' : 'Never';
    const d = new Date(dateStr);
    return d.toLocaleDateString(isUrdu ? 'ur-PK' : 'en-PK', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 sm:p-10 text-center">
          {/* ✅ Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-6">
            <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>

          {/* ✅ Title */}
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-3">
            {isUrdu ? 'یاد دہانیاں بھیجیں' : t('send_reminders')}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-6">
            {isUrdu 
              ? 'تمام گاہکوں کو ان کی آنے والی اقساط کی یاد دہانیاں بھیجیں' 
              : t('reminder_description')}
          </p>

          {/* ✅ Features List */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-6 text-left">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isUrdu ? 'WhatsApp کے ذریعے' : 'via WhatsApp'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isUrdu ? 'SMS کے ذریعے' : 'via SMS'}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {isUrdu ? 'خودکار یاد دہانی' : 'Automatic Reminder'}
            </div>
          </div>

          {/* ✅ Stats */}
          {!fetchingStats && (stats.totalSent > 0 || stats.totalFailed > 0) && (
            <NotificationStats
              totalSent={stats.totalSent}
              totalFailed={stats.totalFailed}
              lastSent={stats.lastSent}
              isUrdu={isUrdu}
            />
          )}

          {/* ✅ Send Button */}
          <button
            onClick={triggerReminders}
            disabled={loading}
            className={`mt-6 inline-flex items-center justify-center px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-base font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              loading ? 'cursor-wait' : ''
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                {isUrdu ? 'بھیج رہا ہے...' : t('sending')}
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {isUrdu ? 'ابھی بھیجیں' : t('send_now')}
              </span>
            )}
          </button>

          {loading && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {isUrdu ? 'براہ کرم انتظار کریں...' : t('please_wait')}
            </p>
          )}

          {/* ✅ Info Note */}
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-xl text-xs text-gray-500 dark:text-gray-400">
            <p>
              {isUrdu 
                ? 'یاد دہانیاں صرف ان گاہکوں کو بھیجی جائیں گی جن کی اگلی 2 دنوں میں قسط واجب الادا ہے' 
                : 'Reminders will be sent to customers whose next installment is due in the next 2 days'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;