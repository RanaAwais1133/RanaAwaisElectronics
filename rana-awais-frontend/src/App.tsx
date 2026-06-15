import React, { useEffect, Suspense, useRef } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import i18n from './i18n/i18n';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { useLanguageStore } from './store/useLanguageStore';
import { useThemeStore } from './store/useThemeStore';
import { Toaster } from 'react-hot-toast';

const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
    <div className="spinner"></div>
  </div>
);

const AppContent: React.FC = () => {
  const { i18n } = useTranslation();
  const lang = useLanguageStore((s) => s.language);
  const theme = useThemeStore((s) => s.theme);
  const isRTL = lang === 'ur';
  const initialized = useRef(false);

  useEffect(() => {
    // Only run once on mount to avoid duplicate re-renders
    if (!initialized.current) {
      initialized.current = true;
      i18n.changeLanguage(lang);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
      document.documentElement.className = theme;
      localStorage.setItem('theme', theme);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Separate effects for lang and theme changes
  useEffect(() => {
    if (initialized.current) {
      i18n.changeLanguage(lang);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = lang;
    }
  }, [lang, isRTL, i18n]);

  useEffect(() => {
    if (initialized.current) {
      document.documentElement.className = theme;
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  return (
    <>
      <Toaster
        position={isRTL ? "top-left" : "top-right"}
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: { background: '#363636', color: '#fff', fontSize: '14px' },
          success: { style: { background: '#065f46' } },
          error: { style: { background: '#991b1b' } },
        }}
      />
      <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/*" element={<MainLayout />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

const App: React.FC = () => (
  <ErrorBoundary>
    <I18nextProvider i18n={i18n}>
      <AppContent />
    </I18nextProvider>
  </ErrorBoundary>
);

export default App;
