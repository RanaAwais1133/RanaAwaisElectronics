import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import api from '../../utils/api';
import UserManagement from '../users/userManagement';
import { APP_CONFIG } from '../../config/app';
import { useAuthStore } from '../../store/useAuthStore';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const currentUser = useAuthStore((state) => state.user);
  
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // ✅ Page title
  useEffect(() => {
    document.title = `${isUrdu ? 'ترتیبات' : 'Settings'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  // ✅ Theme detection
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  // ✅ Handle backup
  const handleBackup = useCallback(async () => {
    setIsBackingUp(true);
    try {
      const res = await api.get('/admin/backup', { 
        responseType: 'blob',
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      const fileName = `backup-${APP_CONFIG.appName}-${new Date().toISOString().slice(0, 10)}.json`;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(isUrdu ? 'بیک اپ ڈاؤن لوڈ ہو گیا' : t('backup_downloaded'));
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'بیک اپ ناکام' : t('backup_failed'));
      toast.error(errorMsg);
    } finally {
      setIsBackingUp(false);
    }
  }, [t, isUrdu]);

  // ✅ Handle restore
  const handleRestore = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;
      
      setIsRestoring(true);
      try {
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            await api.post('/admin/restore', data, {
              headers: {
                'Content-Type': 'application/json',
              },
            });
            toast.success(isUrdu ? 'بیک اپ بحال ہو گیا' : 'Backup restored successfully');
          } catch (parseErr) {
            toast.error(isUrdu ? 'غلط فائل فارمیٹ' : 'Invalid file format');
          }
        };
        reader.readAsText(file);
      } catch (err) {
        toast.error(isUrdu ? 'بیک اپ بحال کرنے میں ناکامی' : 'Restore failed');
      } finally {
        setIsRestoring(false);
      }
    };
    input.click();
  }, [isUrdu]);

  // ✅ Toggle theme
  const toggleTheme = useCallback(() => {
    const isDark = document.documentElement.classList.toggle('dark');
    setTheme(isDark ? 'dark' : 'light');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }, []);

  // ✅ Check if user is admin
  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen flex flex-col justify-center max-w-4xl mx-auto space-y-6 px-3 sm:px-4 py-6">
      {/* ✅ Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
          <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white">
          {isUrdu ? 'ترتیبات' : t('settings')}
        </h1>
      </div>

      {/* ✅ User Management Card */}
      {isAdmin && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                      {isUrdu ? 'صارفین کا انتظام' : t('user_management')}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {isUrdu ? 'صارفین کو شامل کریں، حذف کریں اور ان کا کردار تبدیل کریں' : t('user_management_description')}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowUserManagement(!showUserManagement)}
                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-blue-500/25 transition-all active:scale-95 whitespace-nowrap"
                  >
                    {showUserManagement ? (isUrdu ? 'چھپائیں' : t('hide')) : (isUrdu ? 'صارفین کا انتظام کریں' : t('manage_users'))}
                  </button>
                </div>
                {showUserManagement && (
                  <div className="mt-5 border-t border-gray-200 dark:border-gray-700 pt-5">
                    <UserManagement />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Theme Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {isUrdu ? 'تھیم' : 'Theme'}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {isUrdu ? 'روشنی یا تاریک تھیم منتخب کریں' : 'Choose between light and dark theme'}
                  </p>
                </div>
                <button
                  onClick={toggleTheme}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-2xl text-sm font-semibold shadow-lg shadow-purple-500/25 transition-all active:scale-95 flex items-center gap-2"
                >
                  {theme === 'light' ? (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                      {isUrdu ? 'تاریک تھیم' : 'Dark Mode'}
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {isUrdu ? 'روشنی تھیم' : 'Light Mode'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ Backup & Restore Card */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
              <svg className="w-6 h-6 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {isUrdu ? 'بیک اپ اور بحال' : t('backup_restore')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isUrdu ? 'ڈیٹا کا بیک اپ لیں یا بحال کریں' : t('backup_description')}
              </p>
              <div className="flex flex-wrap gap-3 mt-4">
                <button
                  onClick={handleBackup}
                  disabled={isBackingUp}
                  className="inline-flex items-center px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-emerald-500/25 active:scale-95 disabled:cursor-not-allowed"
                >
                  {isBackingUp ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      {isUrdu ? 'بن رہا ہے...' : 'Creating...'}
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {isUrdu ? 'بیک اپ ڈاؤن لوڈ کریں' : t('download_backup')}
                    </>
                  )}
                </button>
                <button
                  onClick={handleRestore}
                  disabled={isRestoring}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/25 active:scale-95 disabled:cursor-not-allowed"
                >
                  {isRestoring ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      {isUrdu ? 'بحال ہو رہا...' : 'Restoring...'}
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4 mr-1.5 rtl:ml-1.5 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      {isUrdu ? 'بیک اپ بحال کریں' : 'Restore Backup'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ✅ App Info */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-200/60 dark:border-gray-700/60 overflow-hidden">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-xl">
              <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
                {isUrdu ? 'ایپ کے بارے میں' : 'About'}
              </h2>
              <div className="mt-2 space-y-1 text-sm text-gray-600 dark:text-gray-300">
                <p><span className="font-medium">{isUrdu ? 'نام' : 'Name'}:</span> {APP_CONFIG.companyName}</p>
                <p><span className="font-medium">{isUrdu ? 'ورژن' : 'Version'}:</span> v1.0.0</p>
                <p><span className="font-medium">Software by:</span> {isUrdu ? APP_CONFIG.softwareByUr : APP_CONFIG.softwareBy}</p>
                {currentUser && (
                  <p><span className="font-medium">{isUrdu ? 'صارف' : 'User'}:</span> {currentUser.displayName || currentUser.username}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;