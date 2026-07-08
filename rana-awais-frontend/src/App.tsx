import React, { useEffect, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { Toaster } from 'react-hot-toast';
import i18n from './i18n/i18n';
import MainLayout from './components/layout/MainLayout';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import ErrorBoundary from './components/common/ErrorBoundary';
import { APP_CONFIG } from './config/app';
import { syncEngine } from './utils/sync';

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

// ✅ PWA Install Prompt Component
const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = React.useState<any>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setTimeout(() => setShowPrompt(true), 3000);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = React.useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    if (result.outcome === 'accepted') {
      console.log('✅ User installed PWA');
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  }, [deferredPrompt]);

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;

  if (!showPrompt || !deferredPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80 animate-slide-up">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📱</div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800 dark:text-white text-sm">
              Install App
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Install this app on your phone for faster access
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={() => setShowPrompt(false)}
            className="flex-1 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Later
          </button>
          <button
            onClick={handleInstall}
            className="flex-1 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
};

// ✅ App Content Component
const AppContent: React.FC = () => {
  const { i18n: i18nInstance } = useTranslation();
  const [isReady, setIsReady] = React.useState(false);

  // ✅ Initialize once on mount
  useEffect(() => {
    const lang = i18nInstance.language || 'ur';
    document.documentElement.dir = lang === 'ur' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    document.title = `${APP_CONFIG.companyName} - ERP System`;
    
    // ✅ Start sync engine
    syncEngine.start();
    
    // ✅ Register service worker for PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('✅ Service Worker registered:', registration.scope);
          
          // ✅ Register Background Sync for offline queue
          const swReg = registration as any;
          if ('sync' in swReg) {
            // Register sync when app starts
            swReg.sync.register('sync-data').catch((err: any) => {
              console.log('⚠️ Background Sync registration failed:', err);
            });
            
            // Also register periodic sync if available
            if ('periodicSync' in swReg) {
              try {
                swReg.periodicSync.register('periodic-sync', {
                  minInterval: 30 * 60 * 1000, // 30 minutes
                }).catch((err: any) => {
                  console.log('⚠️ Periodic Sync not available:', err);
                });
              } catch (e) {
                // Periodic sync not supported
              }
            }
          }

          
          // Check for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  if (confirm('A new version is available. Refresh to update?')) {
                    newWorker.postMessage({ type: 'SKIP_WAITING' });
                    window.location.reload();
                  }
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('❌ Service Worker registration failed:', error);
        });
    }

    
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

      <PWAInstallPrompt />

      <BrowserRouter
        future={{
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
