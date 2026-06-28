import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import DashboardPage from '../../features/dashboard/DashboardPage';
import CustomerList from '../../features/customers/CustomerList';
import ProductList from '../../features/products/ProductList';
import InstallmentList from '../../features/installments/InstallmentList';
import InstallmentCreate from '../../features/installments/InstallmentCreate';
import GuarantorList from '../../features/guarantors/GuarantorList';
import CustomerReport from '../../features/reports/CustomerReport';
import ProfitLossReport from '../../features/reports/ProfitLossReport';
import NotificationPage from '../../features/notifications/NotificationPage';
import ReminderPage from '../../features/reminders/ReminderPage';
import SettingsPage from '../../features/settings/SettingPage';
import AuditLogsPage from '../../features/audit/AuditLogsPage';
import NotFoundPage from '../../pages/NotFoundPage';
import RequireRole from '../auth/RequireRole';
import { useShortcuts } from '../../hooks/useShortcuts';
import { APP_CONFIG } from '../../config/app';

const MainLayout: React.FC = () => {
  useShortcuts();
  const location = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
      '/reports/profit-loss': t('profit_loss'),
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
      <Navbar onMenuToggle={toggleSidebar} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-screen-2xl mx-auto w-full overflow-x-hidden">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={
              <RequireRole roles={['admin', 'manager']}>
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
              <RequireRole roles={['admin', 'manager']}>
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
                <CustomerReport />
              </RequireRole>
            } />
            <Route path="/reports/profit-loss" element={
              <RequireRole roles={['admin', 'manager']}>
                <ProfitLossReport />
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
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;