import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const useShortcuts = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Prevent shortcuts when typing in input fields
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT')) {
        return;
      }

      if (!e.altKey) return;  // 🔄 Ctrl → Alt

      e.preventDefault();
      switch (e.key.toLowerCase()) {
        case 'd': navigate('/'); break;                    // Dashboard
        case 'c': navigate('/customers'); break;            // Customers
        case 'p': navigate('/products'); break;             // Products
        case 'i': navigate('/installments'); break;         // Installments
        case 'n': navigate('/installments/new'); break;     // New Installment
        case 'g': navigate('/guarantors'); break;           // Guarantors
        case 'r': navigate('/reports/profit-loss'); break;  // Profit/Loss
        case 'm': navigate('/reminders'); break;            // Send Reminders
        case 'l': navigate('/audit-logs'); break;           // Audit Logs
        case 's': navigate('/settings'); break;             // Settings
        default: return; // don't preventDefault for unhandled keys
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate]);
};