import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface ShortcutConfig {
  key: string;
  path: string;
  labelKey: string;
  labelUrduKey: string;
  icon?: string;
}

// ✅ Only keys and paths — labels from translations
const SHORTCUTS_BASE: Omit<ShortcutConfig, 'labelKey' | 'labelUrduKey'>[] = [
  { key: 'd', path: '/', icon: '📊' },
  { key: 'c', path: '/customers', icon: '👤' },
  { key: 'p', path: '/products', icon: '📦' },
  { key: 'i', path: '/installments', icon: '📋' },
  { key: 'n', path: '/installments/new', icon: '➕' },
  { key: 'g', path: '/guarantors', icon: '🤝' },
  { key: 'v', path: '/inventory', icon: '📦' },
  { key: 'r', path: '/reports/profit-loss', icon: '📈' },
  { key: 'm', path: '/reminders', icon: '🔔' },
  { key: 'l', path: '/audit-logs', icon: '📜' },
  { key: 's', path: '/settings', icon: '⚙️' },
];

// ✅ Labels from translation keys
const SHORTCUT_LABELS: Record<string, { en: string; ur: string }> = {
  '/': { en: 'dashboard', ur: 'ڈیش بورڈ' },
  '/customers': { en: 'customers', ur: 'گاہک' },
  '/products': { en: 'products', ur: 'پروڈکٹس' },
  '/installments': { en: 'installments', ur: 'اقساط' },
  '/installments/new': { en: 'new_installment', ur: 'نیا قسط' },
  '/guarantors': { en: 'guarantors', ur: 'ضامن' },
  '/inventory': { en: 'inventory', ur: 'انوینٹری' },
  '/reports/profit-loss': { en: 'profit_loss', ur: 'منافع و نقصان' },
  '/reminders': { en: 'reminders', ur: 'یاد دہانیاں' },
  '/audit-logs': { en: 'audit_logs', ur: 'آڈٹ لاگز' },
  '/settings': { en: 'settings', ur: 'ترتیبات' },
};

export const useShortcuts = () => {
  const { t, i18n } = useTranslation();
  const isUrdu = i18n.language === 'ur';
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Build dynamic shortcuts with translated labels
  const SHORTCUTS: ShortcutConfig[] = SHORTCUTS_BASE.map(s => ({
    ...s,
    labelKey: SHORTCUT_LABELS[s.path]?.en || s.path,
    labelUrduKey: SHORTCUT_LABELS[s.path]?.ur || s.path,
  }));

  // ✅ Get current page label from translation
  const getCurrentPageLabel = useCallback(() => {
    const current = SHORTCUTS.find(s => s.path === location.pathname);
    if (!current) return isUrdu ? 'نامعلوم' : 'Unknown';
    return isUrdu ? current.labelUrduKey : current.labelKey;
  }, [location.pathname, isUrdu]);

  // ✅ Show shortcuts help — using translated labels
  const showShortcutsHelp = useCallback(() => {
    const shortcutsList = SHORTCUTS
      .map(s => {
        const label = isUrdu ? s.labelUrduKey : s.labelKey;
        return `Alt+${s.key.toUpperCase()} → ${label}`;
      })
      .join('\n');
    toast.success(
      `${isUrdu ? 'کی بورڈ شارٹ کٹس' : 'Keyboard Shortcuts'}:\n${shortcutsList}\n\nAlt+H → ${isUrdu ? 'یہ مدد دکھائیں' : 'Show this help'}`,
      { duration: 5000 }
    );
  }, [isUrdu]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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

      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        showShortcutsHelp();
        return;
      }

      if (!e.altKey) return;

      e.preventDefault();
      const key = e.key.toLowerCase();

      const shortcut = SHORTCUTS.find(s => s.key === key);
      if (shortcut) {
        const currentLabel = isUrdu ? shortcut.labelUrduKey : shortcut.labelKey;
        if (shortcut.path === location.pathname) {
          toast(`${isUrdu ? 'پہلے سے' : 'Already on'} ${currentLabel}`);
          return;
        }
        navigate(shortcut.path);
        return;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, location.pathname, showShortcutsHelp, isUrdu, SHORTCUTS]);

  return {
    shortcuts: SHORTCUTS,
    getCurrentPageLabel,
    showShortcutsHelp,
  };
};

export default useShortcuts;