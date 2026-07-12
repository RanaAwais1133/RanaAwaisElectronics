import React, { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';
import { useClientStore } from '../../store/useClientStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

// ✅ Define links with icons - Updated for 3 roles
const baseLinks = [
  { to: '/', labelKey: 'dashboard', shortcut: 'Alt+D', icon: '📊', roles: ['admin', 'manager'] },
  { to: '/customers', labelKey: 'customers', shortcut: 'Alt+C', icon: '👤', roles: ['admin', 'manager', 'staff'] },
  { to: '/products', labelKey: 'products', shortcut: 'Alt+P', icon: '📦', roles: ['admin', 'manager'] },
  { to: '/installments', labelKey: 'installments', shortcut: 'Alt+I', icon: '📋', roles: ['admin', 'manager', 'staff'] },
  { to: '/installments/new', labelKey: 'new_installment', shortcut: 'Alt+N', icon: '➕', roles: ['admin', 'manager', 'staff'] },
  { to: '/guarantors', labelKey: 'guarantors', shortcut: 'Alt+G', icon: '🤝', roles: ['admin', 'manager'] },
  { to: '/reports', labelKey: 'reports', shortcut: 'Alt+R', icon: '📄', roles: ['admin', 'manager'] },
  { to: '/reminders', labelKey: 'reminders', shortcut: 'Alt+M', icon: '🔔', roles: ['admin', 'manager'] },
  { to: '/audit-logs', labelKey: 'audit_logs', shortcut: 'Alt+L', icon: '📜', roles: ['admin', 'manager'] },
  { to: '/backup', labelKey: 'backup', shortcut: 'Alt+B', icon: '💾', roles: ['admin'] },
  { to: '/settings', labelKey: 'settings', shortcut: 'Alt+S', icon: '⚙️', roles: ['admin'] },
];


const Sidebar = React.memo<SidebarProps>(({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);
  // ✅ Global store se company name - settings change karte hi update ho jayega
  const companyName = useClientStore((s) => s.info.name);

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // ✅ Filter links based on user role
  const filteredLinks = useMemo(() => {
    return baseLinks.filter(
      link => !link.roles || (user && link.roles.includes(user.role))
    );
  }, [user]);

  return (
    <>
      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 md:hidden animate-in fade-in" 
          onClick={onClose}
        ></div>
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 md:w-72 
          bg-white dark:bg-gray-800 
          border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 ease-in-out shadow-xl
          md:sticky md:top-16 md:translate-x-0 md:z-auto md:h-[calc(100vh-4rem)] md:shadow-sm
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            {companyName}
          </span>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 sm:px-3 py-3 sm:py-4 space-y-0.5 overflow-y-auto h-full md:h-[calc(100vh-4rem)]">
          {filteredLinks.map((link) => {
            const active = isActiveLink(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={`
                  group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                  ${active
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 shadow-sm'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }
                `}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <span className="text-base">{link.icon}</span>
                  <span className="truncate">{t(link.labelKey)}</span>
                </span>
                <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  {link.shortcut}
                </kbd>
              </Link>
            );
          })}
          
          {/* ✅ Footer with company name */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
              {companyName} v1.0.0
            </p>
          </div>
        </nav>
      </aside>
    </>
  );
});

export default Sidebar;
