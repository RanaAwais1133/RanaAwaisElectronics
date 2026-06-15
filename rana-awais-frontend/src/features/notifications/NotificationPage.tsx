import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';

const NotificationPage: React.FC = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);

  const triggerReminders = async () => {
    setLoading(true);
    try {
      await api.post('/notifications/reminders');
      toast.success(t('reminders_sent'));
    } catch (err) {
      toast.error(t('reminders_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-8 sm:p-10 text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 mb-6">
            <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-3">
            {t('send_reminders')}
          </h2>
          <p className="text-base text-gray-500 dark:text-gray-400 max-w-lg mx-auto mb-8">
            {t('reminder_description')}
          </p>

          <button
            onClick={triggerReminders}
            disabled={loading}
            className="inline-flex items-center justify-center px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-base font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <div className="spinner spinner-sm"></div>
                {t('sending')}
              </span>
            ) : (
              t('send_now')
            )}
          </button>

          {loading && (
            <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
              {t('please_wait')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationPage;