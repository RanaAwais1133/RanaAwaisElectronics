import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { login } from '../utils/api';
import toast from 'react-hot-toast';
import LanguageToggle from '../components/bilingual/LanguageToggle';
import ThemeToggle from '../components/bilingual/ThemeToggle';
import { useClientStore } from '../store/useClientStore';

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const clientInfo = useClientStore((s) => s.info);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState<'username' | 'password' | null>(null);
  
  const setAuth = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      toast.error(isUrdu ? 'صارف نام اور پاس ورڈ ضروری ہے' : t('fill_required'));
      return;
    }
    
    setLoading(true);
    try {
      const data = await login(username, password);
      
      setAuth(data.token, data.user);
      
      toast.success(isUrdu ? 'خوش آمدید! لاگ ان کامیاب' : t('login_success'));
      navigate('/');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 
                       (isUrdu ? 'لاگ ان ناکام' : t('login_failed'));
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Get greeting based on time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return isUrdu ? 'صبح بخیر' : 'Good Morning';
    if (hour < 17) return isUrdu ? 'دوپہر بخیر' : 'Good Afternoon';
    return isUrdu ? 'شب بخیر' : 'Good Evening';
  };

  const companyName = isUrdu ? (clientInfo.nameUr || clientInfo.name) : clientInfo.name;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      {/* ✅ Header */}
      <header className="absolute top-0 right-0 z-10 flex items-center px-4 py-3 gap-2">
        <LanguageToggle size="sm" />
        <ThemeToggle size="sm" />
      </header>

      <div className="w-full max-w-sm">
        {/* ✅ Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-white">{companyName}</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{getGreeting()}</p>
        </div>

        {/* ✅ Login Card */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-5">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
            {isUrdu ? 'خوش آمدید' : 'Welcome Back'}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-5">
            {isUrdu ? 'اپنے اکاؤنٹ میں لاگ ان کریں' : 'Login to your account'}
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* ✅ Username */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('username')}</label>
              <input
                type="text"
                placeholder={isUrdu ? 'صارف نام درج کریں' : 'Enter username'}
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            {/* ✅ Password */}
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isUrdu ? 'پاس ورڈ درج کریں' : 'Enter password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full px-3 py-2.5 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* ✅ Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {isUrdu ? 'لاگ ان ہو رہا...' : t('logging_in')}
                </span>
              ) : (
                isUrdu ? 'لاگ ان کریں' : t('login')
              )}
            </button>

            {/* ✅ Footer */}
            <div className="text-center text-[11px] text-gray-400 dark:text-gray-500">
              {isUrdu ? 'سافٹ ویئر بذریعہ' : 'Software by'} {isUrdu ? (clientInfo.softwareByUr || clientInfo.softwareBy) : clientInfo.softwareBy}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;