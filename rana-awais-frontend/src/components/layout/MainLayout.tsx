import React, { useState, useEffect, Suspense, lazy, ReactNode, ComponentType } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import RequireRole from '../auth/RequireRole';
import { useShortcuts } from '../../hooks/useShortcuts';
import { APP_CONFIG } from '../../config/app';
import { useAuthStore } from '../../store/useAuthStore';
import { SyncStatus } from '../common/SyncStatus';

// ═══════════════════════════════════════════════════════════════
// ✅ PERFORMANCE: Preload all page chunks immediately after mount
// ✅ No loading spinner on navigation - pages are already loaded
// ═══════════════════════════════════════════════════════════════

// Store preloaded components
const pageCache = new Map<string, ComponentType<any>>();
const preloadFns: (() => void)[] = [];

// Register a page for preloading
function preloadPage(name: string, importFn: () => Promise<{ default: ComponentType<any> }>) {
  preloadFns.push(() => {
    importFn().then(mod => {
      pageCache.set(name, mod.default);
    }).catch(() => {});
  });
}

// Start preloading all pages (called once)
let preloaded = false;
function startPreloading() {
  if (preloaded) return;
  preloaded = true;
  // Use setTimeout to avoid blocking initial render
  setTimeout(() => {
    preloadFns.forEach(fn => fn());
  }, 500);
}

// ✅ Lazy load + auto-preload
function lazyWithPreload(name: string, importFn: () => Promise<{ default: ComponentType<any> }>) {
  preloadPage(name, importFn);
  return lazy(importFn);
}

// Register all pages for preloading
const DashboardPage = lazyWithPreload('dashboard', () => import('../../features/dashboard/DashboardPage'));
const CustomerList = lazyWithPreload('customers', () => import('../../features/customers/CustomerList'));
const ProductList = lazyWithPreload('products', () => import('../../features/products/ProductList'));
const InstallmentList = lazyWithPreload('installments', () => import('../../features/installments/InstallmentList'));
const InstallmentCreate = lazyWithPreload('installments-new', () => import('../../features/installments/InstallmentCreate'));
const GuarantorList = lazyWithPreload('guarantors', () => import('../../features/guarantors/GuarantorList'));
const ReportsPage = lazyWithPreload('reports', () => import('../../features/reports/ReportsPage'));
const NotificationPage = lazyWithPreload('notifications', () => import('../../features/notifications/NotificationPage'));
const ReminderPage = lazyWithPreload('reminders', () => import('../../features/reminders/ReminderPage'));
const SettingsPage = lazyWithPreload('settings', () => import('../../features/settings/SettingPage'));
const BackupPage = lazyWithPreload('backup', () => import('../../features/settings/BackupPage'));
const AuditLogsPage = lazyWithPreload('audit-logs', () => import('../../features/audit/AuditLogsPage'));
const NotFoundPage = lazyWithPreload('not-found', () => import('../../pages/NotFoundPage'));

// ✅ Keep-Alive wrapper: shows previous page while new one loads
interface KeepAliveProps {
  current: ReactNode;
  fallback?: ReactNode;
}

const KeepAliveSurface: React.FC<KeepAliveProps> = ({ current, fallback }) => {
  const [alive, setAlive] = useState<ReactNode>(current);
  const prevPath = useLocation().pathname;
  
  useEffect(() => {
    // Show new page immediately when it changes
    setAlive(current);
  }, [current]);

  return <>{alive || fallback}</>;
};

const MainLayout: React.FC = () => {
  useShortcuts();
  const location = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // ✅ Auth guard - redirect to login if not authenticated
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const isAuthenticated = !!token && !!user;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ✅ Close sidebar on route change (mobile)
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [location.pathname, isMobile]);

  // ✅ Start preloading all pages after first render
  useEffect(() => {
    startPreloading();
  }, []);

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // ✅ Dynamic page title — using translation keys
  useEffect(() => {
    const path = location.pathname;
    
    const pageNames: Record<string, string> = {
      '/': t('dashboard'),
      '/customers': t('customers'),
      '/products': t('products'),
      '/installments': t('installments'),
      '/installments/new': t('new_installment'),
      '/guarantors': t('guarantors'),
      '/reports': t('reports'),
      '/reminders': t('reminders'),
      '/notifications': t('notifications'),
      '/audit-logs': t('audit_logs'),
      '/settings': t('settings'),
    };
    
    let pageTitle = APP_CONFIG.companyName;
    
    for (const [key, value] of Object.entries(pageNames)) {
      if (path === key || path.startsWith(key + '/')) {
        pageTitle = `${value} | ${APP_CONFIG.companyName}`;
        break;
      }
    }
    
    document.title = pageTitle;
  }, [location.pathname, t]);

  // ✅ Minimal fallback - just a subtle loader at top, not full page spinner
  const PageFallback = () => (
    <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div className="h-full bg-blue-500 rounded-full animate-pulse" style={{ width: '30%' }}></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex flex-col">
      <SyncStatus />
      <Navbar onMenuToggle={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full overflow-x-hidden">
          <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            
            <Route path="/customers" element={
              <RequireRole roles={['admin', 'manager', 'staff']}>
                <CustomerList />
              </RequireRole>
            } />
            
            <Route path="/products" element={
              <RequireRole roles={['admin', 'manager']}>
                <ProductList />
              </RequireRole>
            } />
            
            <Route path="/installments" element={<InstallmentList />} />
            
            <Route path="/installments/new" element={
              <RequireRole roles={['admin', 'manager', 'staff']}>
                <InstallmentCreate />
              </RequireRole>
            } />
            
            <Route path="/guarantors" element={
              <RequireRole roles={['admin', 'manager']}>
                <GuarantorList />
              </RequireRole>
            } />
            
            <Route path="/reports" element={
              <RequireRole roles={['admin', 'manager']}>
                <ReportsPage />
              </RequireRole>
            } />
            
            <Route path="/reminders" element={
              <RequireRole roles={['admin', 'manager']}>
                <ReminderPage />
              </RequireRole>
            } />
            
            <Route path="/notifications" element={
              <RequireRole roles={['admin', 'manager']}>
                <NotificationPage />
              </RequireRole>
            } />
            
            <Route path="/audit-logs" element={
              <RequireRole roles={['admin', 'manager']}>
                <AuditLogsPage />
              </RequireRole>
            } />
            
            <Route path="/settings" element={
              <RequireRole roles={['admin']}>
                <SettingsPage />
              </RequireRole>
            } />
            
            <Route path="/backup" element={
              <RequireRole roles={['admin']}>
                <BackupPage />
              </RequireRole>
            } />
            
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;