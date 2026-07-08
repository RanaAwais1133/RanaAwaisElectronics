import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import LanguageToggle from '../components/bilingual/LanguageToggle';
import ThemeToggle from '../components/bilingual/ThemeToggle';
import { useClientStore } from '../store/useClientStore';
import axios from 'axios';

interface LicensePageProps {
  onActivated: () => void;
}

const LicensePage: React.FC<LicensePageProps> = ({ onActivated }) => {
  const { i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const clientInfo = useClientStore((s) => s.info);
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Check if already activated
    checkLicenseStatus();
  }, []);

  const checkLicenseStatus = async () => {
    try {
      // ✅ FIX: Use window.location.origin for mobile access
      // Mobile users access via http://192.168.x.x:8080, not localhost
      const baseURL = process.env.REACT_APP_API_URL || window.location.origin;
      const cleanBase = baseURL.replace(/\/+$/, '');
      const apiUrl = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
      const res = await axios.get(`${apiUrl}/license/status`);
      if (res.data?.activated) {
        onActivated();
      }
    } catch (err) {
      // Server not ready yet, retry
      setTimeout(checkLicenseStatus, 2000);
      return;
    } finally {
      setChecking(false);
    }
  };

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey.trim()) {
      toast.error(isUrdu ? 'لائسنس کلید درج کریں' : 'Please enter license key');
      return;
    }

    setLoading(true);
    try {
      // ✅ FIX: Use window.location.origin for mobile access
      const baseURL = process.env.REACT_APP_API_URL || window.location.origin;
      const cleanBase = baseURL.replace(/\/+$/, '');
      const apiUrl = cleanBase.endsWith('/api') ? cleanBase : `${cleanBase}/api`;
      const res = await axios.post(`${apiUrl}/license/validate`, {
        licenseKey: licenseKey.trim(),
      });

      if (res.data?.valid) {
        toast.success(res.data?.message_ur || 'License activated!');
        setTimeout(() => onActivated(), 1000);
      } else {
        toast.error(res.data?.message_ur || 'Invalid license key');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message_ur || 'Activation failed');
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            {isUrdu ? 'براہ کرم انتظار کریں...' : 'Please wait...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* Header */}
      <header className="absolute top-0 right-0 z-10 flex items-center px-4 py-3 gap-2">
        <LanguageToggle size="sm" />
        <ThemeToggle size="sm" />
      </header>

      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">
            {isUrdu ? (clientInfo.nameUr || clientInfo.name) : clientInfo.name}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {isUrdu ? 'الیکٹرانکس ای آر پی سسٹم' : 'Electronics ERP System'}
          </p>
        </div>

        {/* License Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
          <div className="text-center mb-5">
            <span className="text-4xl">🔑</span>
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white mt-2">
              {isUrdu ? 'لائسنس ایکٹیویشن' : 'License Activation'}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {isUrdu 
                ? 'سافٹ ویئر استعمال کرنے کے لیے لائسنس کلید درج کریں' 
                : 'Enter license key to activate the software'}
            </p>
          </div>

          <form onSubmit={handleActivate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isUrdu ? 'لائسنس کلید' : 'License Key'}
              </label>
              <input
                type="text"
                value={licenseKey}
                onChange={e => setLicenseKey(e.target.value)}
                placeholder={isUrdu ? 'اپنی لائسنس کلید درج کریں' : 'Enter your license key'}
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400 text-center font-mono tracking-wider"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isUrdu ? 'فعال ہو رہا ہے...' : 'Activating...'}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>🚀</span>
                  {isUrdu ? 'لائسنس فعال کریں' : 'Activate License'}
                </span>
              )}
            </button>
          </form>

          {/* Info */}
          <div className="mt-5 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-700 dark:text-amber-400">
              {isUrdu 
                ? '💡 لائسنس کلید حاصل کرنے کے لیے ڈویلپر سے رابطہ کریں: 0313-6487199'
                : '💡 Contact developer to get license key: 0313-6487199'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-4 text-[11px] text-gray-400 dark:text-gray-500">
          {isUrdu ? 'سافٹ ویئر بذریعہ' : 'Software by'} {isUrdu ? (clientInfo.softwareByUr || clientInfo.softwareBy) : clientInfo.softwareBy}
        </div>
      </div>
    </div>
  );
};

export default LicensePage;
