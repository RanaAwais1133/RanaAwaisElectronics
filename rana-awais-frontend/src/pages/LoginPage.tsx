import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/useAuthStore';
import { login } from '../utils/api';
import toast from 'react-hot-toast';
import LanguageToggle from '../components/bilingual/LanguageToggle';
import ThemeToggle from '../components/bilingual/ThemeToggle';
import { APP_CONFIG } from '../config/app';

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
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

  const companyName = isUrdu ? APP_CONFIG.companyNameUr : APP_CONFIG.companyName;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-blue-50 via-indigo-50/30 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 relative overflow-hidden">
      
      {/* ✅ Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-200 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-[pulse_8s_ease-in-out_infinite]"></div>
        <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-200 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-[pulse_8s_ease-in-out_infinite_2s]"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200/30 dark:bg-pink-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-[pulse_8s_ease-in-out_infinite_4s]"></div>
        
        {/* Floating particles */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-blue-400/30 rounded-full animate-[float_6s_ease-in-out_infinite]"></div>
        <div className="absolute top-40 right-20 w-3 h-3 bg-purple-400/30 rounded-full animate-[float_8s_ease-in-out_infinite_1s]"></div>
        <div className="absolute bottom-20 left-1/4 w-2 h-2 bg-pink-400/30 rounded-full animate-[float_7s_ease-in-out_infinite_2s]"></div>
        <div className="absolute bottom-40 right-1/3 w-2.5 h-2.5 bg-indigo-400/30 rounded-full animate-[float_9s_ease-in-out_infinite_1.5s]"></div>
      </div>

      {/* ✅ Header */}
      <header className="relative z-10 flex justify-end items-center px-4 py-3 sm:px-6 gap-2">
        <div className="flex items-center gap-2">
          <LanguageToggle size="sm" />
          <ThemeToggle size="sm" />
        </div>
      </header>

      {/* ✅ Login Form */}
      <div className="flex-1 flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          
          {/* ✅ Brand Section */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-600 shadow-2xl shadow-blue-500/30 mb-5 transform transition-all hover:scale-105 duration-300">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white tracking-tight">
              {companyName}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
              {getGreeting()}
            </p>
          </div>

          {/* ✅ Login Card */}
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 dark:border-gray-700/50 p-6 sm:p-8 transition-all duration-300 hover:shadow-2xl">
            
            <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">
              {isUrdu ? 'خوش آمدید' : 'Welcome Back'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              {isUrdu ? 'اپنے اکاؤنٹ میں لاگ ان کریں' : 'Login to your account'}
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* ✅ Username Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('username')}
                </label>
                <div className={`relative transition-all duration-200 ${
                  isFocused === 'username' ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800 rounded-xl' : ''
                }`}>
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 dark:text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    placeholder={isUrdu ? 'صارف نام درج کریں' : 'Enter username'}
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    onFocus={() => setIsFocused('username')}
                    onBlur={() => setIsFocused(null)}
                    autoComplete="username"
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-700/90 text-sm focus:border-transparent focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                </div>
              </div>

              {/* ✅ Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('password')}
                </label>
                <div className={`relative transition-all duration-200 ${
                  isFocused === 'password' ? 'ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800 rounded-xl' : ''
                }`}>
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400 dark:text-gray-500">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isUrdu ? 'پاس ورڈ درج کریں' : 'Enter password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onFocus={() => setIsFocused('password')}
                    onBlur={() => setIsFocused(null)}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-12 py-3 border-2 border-gray-200 dark:border-gray-600 rounded-xl bg-white/90 dark:bg-gray-700/90 text-sm focus:border-transparent focus:outline-none transition-all placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3.5 rounded-xl text-base font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 disabled:opacity-50 disabled:cursor-not-allowed active:scale-98 relative overflow-hidden group"
              >
                <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></span>
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {isUrdu ? 'لاگ ان ہو رہا...' : t('logging_in')}
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    {isUrdu ? 'لاگ ان کریں' : t('login')}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                )}
              </button>

              {/* ✅ Footer */}
              <div className="text-center text-xs text-gray-400 dark:text-gray-500 mt-4">
                {isUrdu ? 'سافٹ ویئر بذریعہ' : 'Software by'} {isUrdu ? APP_CONFIG.softwareByUr : APP_CONFIG.softwareBy}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;