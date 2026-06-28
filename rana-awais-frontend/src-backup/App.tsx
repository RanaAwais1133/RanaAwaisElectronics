import React, { useEffect, Suspense, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import i18n from './i18n/i18n';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { APP_CONFIG } from './config/app';

// ✅ Loading Spinner Component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
        Loading...
      </p>
    </div>
  </div>
);

// ✅ App Content Component
const AppContent: React.FC = () => {
  const { i18n: i18nInstance } = useTranslation();
  const [isReady, setIsReady] = useState(false);

  // ✅ Initialize once on mount
  useEffect(() => {
    const lang = i18nInstance.language || 'ur';
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.title = `${APP_CONFIG.companyName} - ERP System`;
    setIsReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isReady) {
    return <PageLoader />;
  }

  return (
    <>
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
            fontSize: '14px',
            borderRadius: '12px',
            padding: '12px 16px',
          },
          success: {
            style: {
              background: 'linear-gradient(135deg, #065f46, #047857)',
              color: '#fff',
            },
            icon: '✅',
          },
          error: {
            style: {
              background: 'linear-gradient(135deg, #991b1b, #dc2626)',
              color: '#fff',
            },
            icon: '❌',
          },
        }}
      />

      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/404" element={<NotFoundPage />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

// ✅ Main App Component with Error Boundary
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <I18nextProvider i18n={i18n}>
        <AppContent />
      </I18nextProvider>
    </ErrorBoundary>
  );
};

export default App;