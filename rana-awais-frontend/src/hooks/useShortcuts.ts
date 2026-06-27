import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

interface ShortcutConfig {
  key: string;
  path: string;
  label: string;
  labelUrdu: string;
  icon?: string;
}

const SHORTCUTS: ShortcutConfig[] = [
  { key: 'd', path: '/', label: 'Dashboard', labelUrdu: 'ڈیش بورڈ', icon: '📊' },
  { key: 'c', path: '/customers', label: 'Customers', labelUrdu: 'گاہک', icon: '👤' },
  { key: 'p', path: '/products', label: 'Products', labelUrdu: 'پروڈکٹس', icon: '📦' },
  { key: 'i', path: '/installments', label: 'Installments', labelUrdu: 'اقساط', icon: '📋' },
  { key: 'n', path: '/installments/new', label: 'New Installment', labelUrdu: 'نیا قسط', icon: '➕' },
  { key: 'g', path: '/guarantors', label: 'Guarantors', labelUrdu: 'ضامن', icon: '🤝' },
  { key: 'v', path: '/inventory', label: 'Inventory', labelUrdu: 'انوینٹری', icon: '📦' },
  { key: 'r', path: '/reports/profit-loss', label: 'Profit & Loss', labelUrdu: 'منافع و نقصان', icon: '📈' },
  { key: 'm', path: '/reminders', label: 'Reminders', labelUrdu: 'یاد دہانیاں', icon: '🔔' },
  { key: 'l', path: '/audit-logs', label: 'Audit Logs', labelUrdu: 'آڈٹ لاگز', icon: '📜' },
  { key: 's', path: '/settings', label: 'Settings', labelUrdu: 'ترتیبات', icon: '⚙️' },
];

export const useShortcuts = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Get current path name for display
  const getCurrentPageLabel = useCallback(() => {
    const current = SHORTCUTS.find(s => s.path === location.pathname);
    return current?.label || 'Unknown';
  }, [location.pathname]);

  // ✅ Show shortcuts help
  const showShortcutsHelp = useCallback(() => {
    const shortcutsList = SHORTCUTS
      .map(s => `Alt+${s.key.toUpperCase()} → ${s.label}`)
      .join('\n');
    toast.success(
      `Keyboard Shortcuts:\n${shortcutsList}\n\nAlt+H → Show this help`,
      { duration: 5000 }
    );
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      const active = document.activeElement;
      if (active && (
        active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        (active as HTMLInputElement)?.type === 'search' ||
        (active as HTMLInputElement)?.type === 'text'
      )) {
        return;
      }

      // ✅ Show help on Alt+H
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        showShortcutsHelp();
        return;
      }

      if (!e.altKey) return;

      e.preventDefault();
      const key = e.key.toLowerCase();

      // ✅ Check if key matches any shortcut
      const shortcut = SHORTCUTS.find(s => s.key === key);
      if (shortcut) {
        // ✅ Prevent navigation to current page
        if (shortcut.path === location.pathname) {
          toast(`Already on ${shortcut.label}`);
          return;
        }
        navigate(shortcut.path);
        return;
      }

      // ✅ Unknown key - don't prevent default
      // (allows normal browser shortcuts like Alt+Tab)
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, location.pathname, showShortcutsHelp]);

  // ✅ Return helper functions
  return {
    shortcuts: SHORTCUTS,
    getCurrentPageLabel,
    showShortcutsHelp,
  };
};

export default useShortcuts;