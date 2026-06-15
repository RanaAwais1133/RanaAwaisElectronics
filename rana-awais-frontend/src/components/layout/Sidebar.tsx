import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../store/useAuthStore';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const baseLinks = [
  { to: '/', labelKey: 'dashboard', shortcut: 'Alt+D', roles: ['admin', 'manager', 'staff'] },
  { to: '/customers', labelKey: 'customers', shortcut: 'Alt+C', roles: ['admin', 'manager'] },
  { to: '/products', labelKey: 'products', shortcut: 'Alt+P', roles: ['admin', 'manager'] },
  { to: '/installments', labelKey: 'installments', shortcut: 'Alt+I', roles: ['admin', 'manager', 'staff'] },
  { to: '/installments/new', labelKey: 'new_installment', shortcut: 'Alt+N', roles: ['admin', 'manager'] },
  { to: '/guarantors', labelKey: 'guarantors', shortcut: 'Alt+G', roles: ['admin', 'manager'] },
  // { to: '/inventory', labelKey: 'inventory', shortcut: 'Alt+V', roles: ['admin', 'manager'] },
  { to: '/reports/profit-loss', labelKey: 'profit_loss', shortcut: 'Alt+R', roles: ['admin', 'manager'] },
  { to: '/reminders', labelKey: 'reminders', shortcut: 'Alt+M', roles: ['admin', 'manager'] },
  { to: '/audit-logs', labelKey: 'audit_logs', shortcut: 'Alt+L', roles: ['admin', 'manager'] },
  { to: '/settings', labelKey: 'settings', shortcut: 'Alt+S', roles: ['admin'] },
];

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const location = useLocation();
  const user = useAuthStore((s) => s.user);

  const isActiveLink = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const filteredLinks = baseLinks.filter(
    link => !link.roles || (user && link.roles.includes(user.role))
  );

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={onClose}></div>
      )}

      <aside
        className={`
          fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          transform transition-transform duration-300 ease-in-out shadow-xl
          md:sticky md:top-16 md:translate-x-0 md:z-auto md:h-[calc(100vh-4rem)] md:shadow-sm
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Rana Awais Electronics
          </span>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto h-full md:h-[calc(100vh-4rem)]">
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
                <span>{t(link.labelKey)}</span>
                <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-xs font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
                  {link.shortcut}
                </kbd>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;