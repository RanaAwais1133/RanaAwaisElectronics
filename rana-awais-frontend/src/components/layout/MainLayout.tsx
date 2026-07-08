import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import RequireRole from '../auth/RequireRole';
import { useShortcuts } from '../../hooks/useShortcuts';
import { APP_CONFIG } from '../../config/app';
import { useAuthStore } from '../../store/useAuthStore';
import { SyncStatus } from '../common/SyncStatus';

// ✅ Lazy load all page components for code splitting
const DashboardPage = lazy(() => import('../../features/dashboard/DashboardPage'));
const CustomerList = lazy(() => import('../../features/customers/CustomerList'));
const ProductList = lazy(() => import('../../features/products/ProductList'));
const InstallmentList = lazy(() => import('../../features/installments/InstallmentList'));
const InstallmentCreate = lazy(() => import('../../features/installments/InstallmentCreate'));
const GuarantorList = lazy(() => import('../../features/guarantors/GuarantorList'));
const ReportsPage = lazy(() => import('../../features/reports/ReportsPage'));
const NotificationPage = lazy(() => import('../../features/notifications/NotificationPage'));
const ReminderPage = lazy(() => import('../../features/reminders/ReminderPage'));
const SettingsPage = lazy(() => import('../../features/settings/SettingPage'));
const BackupPage = lazy(() => import('../../features/settings/BackupPage'));
const AuditLogsPage = lazy(() => import('../../features/audit/AuditLogsPage'));
const NotFoundPage = lazy(() => import('../../pages/NotFoundPage'));

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

  const toggleSidebar = () => setSidebarOpen(prev => !prev);
  const closeSidebar = () => setSidebarOpen(false);

  // ✅ Dynamic page title — using translation keys
  useEffect(() => {
    const path = location.pathname;
    
    // Build page title using dynamic translation keys
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

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-900 flex flex-col">
      <SyncStatus />
      <Navbar onMenuToggle={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full overflow-x-hidden">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          }>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            
            {/* ✅ Customers - Staff can VIEW only, Manager/Admin can manage */}
            <Route path="/customers" element={
              <RequireRole roles={['admin', 'manager', 'staff']}>
                <CustomerList />
              </RequireRole>
            } />
            
            {/* ✅ Products - Manager/Admin only */}
            <Route path="/products" element={
              <RequireRole roles={['admin', 'manager']}>
                <ProductList />
              </RequireRole>
            } />
            
            {/* ✅ Installments - All roles can view */}
            <Route path="/installments" element={<InstallmentList />} />
            
            {/* ✅ New Installment - All roles can create (Staff included) */}
            <Route path="/installments/new" element={
              <RequireRole roles={['admin', 'manager', 'staff']}>
                <InstallmentCreate />
              </RequireRole>
            } />
            
            {/* ✅ Guarantors - Manager/Admin only */}
            <Route path="/guarantors" element={
              <RequireRole roles={['admin', 'manager']}>
                <GuarantorList />
              </RequireRole>
            } />
            
            {/* ✅ Reports - Manager/Admin only */}
            <Route path="/reports" element={
              <RequireRole roles={['admin', 'manager']}>
                <ReportsPage />
              </RequireRole>
            } />
            
            {/* ✅ Reminders - Manager/Admin only */}
            <Route path="/reminders" element={
              <RequireRole roles={['admin', 'manager']}>
                <ReminderPage />
              </RequireRole>
            } />
            
            {/* ✅ Notifications - Manager/Admin only */}
            <Route path="/notifications" element={
              <RequireRole roles={['admin', 'manager']}>
                <NotificationPage />
              </RequireRole>
            } />
            
            {/* ✅ Audit Logs - Manager/Admin only */}
            <Route path="/audit-logs" element={
              <RequireRole roles={['admin', 'manager']}>
                <AuditLogsPage />
              </RequireRole>
            } />
            
            {/* ✅ Settings - Admin only */}
            <Route path="/settings" element={
              <RequireRole roles={['admin']}>
                <SettingsPage />
              </RequireRole>
            } />
            
            {/* ✅ Backup - Admin only */}
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