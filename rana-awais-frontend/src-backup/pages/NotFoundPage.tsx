import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { APP_CONFIG } from '../config/app';

const NotFoundPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // ✅ Page title
  useEffect(() => {
    document.title = `${isUrdu ? 'صفحہ نہیں ملا' : 'Page Not Found'} | ${APP_CONFIG.companyName}`;
  }, [isUrdu]);

  // ✅ Mouse move effect for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePosition({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // ✅ Floating particles
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    size: Math.random() * 4 + 2,
    x: Math.random() * 100,
    y: Math.random() * 100,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
    opacity: Math.random() * 0.5 + 0.1,
  }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/20 to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 relative overflow-hidden">
      
      {/* ✅ Animated Background Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-full bg-blue-400/20 dark:bg-blue-400/10"
            style={{
              width: p.size,
              height: p.size,
              left: `${p.x}%`,
              top: `${p.y}%`,
              animation: `float ${p.duration}s ease-in-out ${p.delay}s infinite`,
              opacity: p.opacity,
            }}
          />
        ))}
        
        {/* Decorative blobs */}
        <div 
          className="absolute -top-40 -left-40 w-80 h-80 bg-blue-200/30 dark:bg-blue-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-[pulse_8s_ease-in-out_infinite]"
          style={{ transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)` }}
        ></div>
        <div 
          className="absolute -bottom-40 -right-40 w-80 h-80 bg-purple-200/30 dark:bg-purple-900/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-50 animate-[pulse_8s_ease-in-out_infinite_2s]"
          style={{ transform: `translate(${-mousePosition.x * 0.1}px, ${-mousePosition.y * 0.1}px)` }}
        ></div>
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-pink-200/20 dark:bg-pink-900/10 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 animate-[pulse_8s_ease-in-out_infinite_4s]"
        ></div>
      </div>

      {/* ✅ Content */}
      <div 
        className="text-center max-w-lg relative z-10"
        style={{ transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)` }}
      >
        {/* ✅ 404 Illustration with animation */}
        <div className="relative inline-flex items-center justify-center mb-6">
          <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/30 rounded-full blur-3xl opacity-70 animate-pulse"></div>
          
          {/* Floating 404 numbers */}
          <div className="relative flex items-center gap-2 sm:gap-4">
            <span 
              className="text-8xl sm:text-[8rem] md:text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 animate-bounce"
              style={{ animationDelay: '0s' }}
            >
              4
            </span>
            <span 
              className="text-8xl sm:text-[8rem] md:text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-purple-300 animate-bounce"
              style={{ animationDelay: '0.2s' }}
            >
              0
            </span>
            <span 
              className="text-8xl sm:text-[8rem] md:text-[10rem] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400 dark:from-blue-400 dark:to-blue-300 animate-bounce"
              style={{ animationDelay: '0.4s' }}
            >
              4
            </span>
          </div>
        </div>

        {/* ✅ Message */}
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-3">
          {isUrdu ? 'اوہ! صفحہ نہیں ملا' : t('page_not_found')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-md mx-auto">
          {isUrdu 
            ? 'آپ جس صفحہ کو تلاش کر رہے ہیں وہ موجود نہیں ہے یا اسے منتقل کر دیا گیا ہے۔' 
            : t('page_not_found_desc')}
        </p>

        {/* ✅ Suggestions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl text-sm font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 active:scale-95"
          >
            <svg className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            {isUrdu ? 'ڈیش بورڈ پر جائیں' : t('go_to_dashboard')}
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-6 py-3 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-2xl text-sm font-semibold transition-all active:scale-95"
          >
            <svg className="w-5 h-5 mr-2 rtl:ml-2 rtl:mr-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {isUrdu ? 'واپس جائیں' : 'Go Back'}
          </button>
        </div>

        {/* ✅ Additional Help */}
        <div className="text-sm text-gray-400 dark:text-gray-500 space-y-1">
          <p>
            {isUrdu 
              ? 'اگر آپ کو مدد کی ضرورت ہے تو ہم سے رابطہ کریں' 
              : 'Need help? Contact our support team'}
          </p>
          <p className="text-xs">
            {isUrdu ? 'سافٹ ویئر بذریعہ' : 'Software by'} {isUrdu ? APP_CONFIG.softwareByUr : APP_CONFIG.softwareBy}
          </p>
        </div>
      </div>

      {/* ✅ Custom Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes pulse_2s {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .animate-bounce {
          animation: bounce 2s ease-in-out infinite;
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
};

export default NotFoundPage;