import { CURRENCY_SYMBOL, CURRENCY_LOCALE } from './constants';

// ============================================================
// ✅ CURRENCY FORMATTING
// ============================================================

/**
 * Format a number as Pakistani Rupees with 2 decimal places.
 */
export const formatCurrency = (amount: number, showSymbol = true): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return showSymbol ? `${CURRENCY_SYMBOL}. 0.00` : '0.00';
  }
  
  const formatted = amount.toFixed(2);
  return showSymbol ? `${CURRENCY_SYMBOL}. ${formatted}` : formatted;
};

/**
 * Format a number as Pakistani Rupees with thousands separators.
 */
export const formatCurrencyWithCommas = (amount: number): string => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0';
  }
  return amount.toLocaleString(CURRENCY_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Format a number as percentage.
 */
export const formatPercentage = (value: number, decimals = 1): string => {
  if (value === undefined || value === null || isNaN(value)) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
};

// ============================================================
// ✅ STRING FORMATTING
// ============================================================

/**
 * Convert a snake_case string to Title Case (e.g., "in_stock" → "In Stock").
 */
export const snakeToTitle = (str: string): string => {
  if (!str) return '';
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Convert a camelCase string to Title Case (e.g., "inStock" → "In Stock").
 */
export const camelToTitle = (str: string): string => {
  if (!str) return '';
  const result = str.replace(/([A-Z])/g, ' $1');
  return result.charAt(0).toUpperCase() + result.slice(1);
};

/**
 * Truncate text to specified length.
 */
export const truncateText = (text: string, maxLength = 50): string => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

/**
 * Capitalize first letter of each word.
 */
export const capitalizeWords = (str: string): string => {
  if (!str) return '';
  return str
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

// ============================================================
// ✅ DATE FORMATTING
// ============================================================

/**
 * Get a localized date string (e.g., "12 Jan 2026") using the provided locale.
 */
export const formatDate = (date: string | Date, locale = 'en'): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  return d.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Get a full localized date string (e.g., "12 January 2026").
 */
export const formatDateFull = (date: string | Date, locale = 'en'): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  return d.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
};

/**
 * Format date in DD/MM/YYYY format.
 */
export const formatDateDDMMYYYY = (date: string | Date): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Format date in YYYY-MM-DD format.
 */
export const formatDateYYYYMMDD = (date: string | Date): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  return d.toISOString().split('T')[0];
};

/**
 * Format time (e.g., "14:30:00").
 */
export const formatTime = (date: string | Date): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Format time with AM/PM (e.g., "02:30 PM").
 */
export const formatTimeAMPM = (date: string | Date): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
};

/**
 * Get relative time (e.g., "2 days ago", "in 3 days").
 */
export const getRelativeTime = (date: string | Date): string => {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  const days = Math.round(diff / (1000 * 60 * 60 * 24));
  
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `In ${days} days`;
  return `${Math.abs(days)} days ago`;
};

// ============================================================
// ✅ FINE CALCULATION
// ============================================================

/**
 * Calculate fine based on due date, grace period, and daily fine rate.
 * Returns the total fine capped at 2x the installment amount.
 */
export const calculateFine = (
  dueDate: string,
  graceDays: number,
  finePerDay: number,
  installmentAmount: number,
  maxFineMultiplier = 2
): { overdueDays: number; fine: number; totalPayable: number } => {
  const now = new Date();
  const due = new Date(dueDate);
  let overdueDays = 0;
  
  if (now > due) {
    const graceEnd = new Date(due);
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    if (now > graceEnd) {
      overdueDays = Math.floor(
        (now.getTime() - graceEnd.getTime()) / (1000 * 60 * 60 * 24)
      );
    }
  }
  
  let fine = overdueDays * finePerDay;
  const maxFine = installmentAmount * maxFineMultiplier;
  fine = Math.min(fine, maxFine);
  
  return {
    overdueDays,
    fine,
    totalPayable: installmentAmount + fine,
  };
};

// ============================================================
// ✅ PHONE FORMATTING
// ============================================================

/**
 * Format phone number to standard format: 0313-6487199
 */
export const formatPhone = (phone?: string): string => {
  if (!phone) return '—';
  const cleaned = phone.replace(/[^0-9]/g, '');
  
  if (cleaned.length === 13 && cleaned.startsWith('0092')) {
    const local = '0' + cleaned.slice(4);
    return local.slice(0, 4) + '-' + local.slice(4);
  }
  if (cleaned.length === 12 && cleaned.startsWith('92')) {
    const local = '0' + cleaned.slice(2);
    return local.slice(0, 4) + '-' + local.slice(4);
  }
  if (cleaned.length === 11) {
    return cleaned.slice(0, 4) + '-' + cleaned.slice(4);
  }
  if (cleaned.length === 10) {
    return cleaned.slice(0, 3) + '-' + cleaned.slice(3);
  }
  return phone;
};

/**
 * Validate phone number.
 */
export const isValidPhone = (phone?: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  return cleaned.length === 11 && cleaned.startsWith('03');
};

// ============================================================
// ✅ CNIC FORMATTING
// ============================================================

/**
 * Format CNIC to standard format: 34101-3035778-3
 */
export const formatCNIC = (cnic?: string): string => {
  if (!cnic) return '—';
  const cleaned = cnic.replace(/[^0-9]/g, '');
  if (cleaned.length === 13) {
    return cleaned.slice(0, 5) + '-' + cleaned.slice(5, 12) + '-' + cleaned.slice(12);
  }
  return cnic;
};

/**
 * Validate CNIC.
 */
export const isValidCNIC = (cnic?: string): boolean => {
  if (!cnic) return false;
  const cleaned = cnic.replace(/[^0-9]/g, '');
  return cleaned.length === 13 && /^\d+$/.test(cleaned);
};

// ============================================================
// ✅ INSTALLMENT SCHEDULE GENERATION
// ============================================================

/**
 * Generate installment schedule (used in frontend for preview).
 */
export const generateInstallmentSchedule = (
  totalAmount: number,
  downPayment: number,
  months: number,
  startDate: string,
  perMonthInstallment?: number
): Array<{ installmentNo: number; dueDate: string; amount: number }> => {
  const remaining = totalAmount - downPayment;
  if (remaining <= 0 || months <= 0) return [];
  
  let installmentAmount: number;
  if (perMonthInstallment && perMonthInstallment > 0) {
    installmentAmount = perMonthInstallment;
  } else {
    installmentAmount = Math.round((remaining / months) * 100) / 100;
  }
  
  const totalCalculated = installmentAmount * months;
  const adjustment = Math.round((remaining - totalCalculated) * 100) / 100;
  
  const schedule = [];
  const start = new Date(startDate);
  let totalAllocated = 0;
  
  for (let i = 0; i < months; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i + 1);
    
    let amount = installmentAmount;
    if (i === months - 1) {
      amount = Math.round((remaining - totalAllocated) * 100) / 100;
    }
    totalAllocated += amount;
    
    schedule.push({
      installmentNo: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: Math.round(amount * 100) / 100,
    });
  }
  
  return schedule;
};

// ============================================================
// ✅ UTILITY HELPERS
// ============================================================

/**
 * Get initials from a name.
 */
export const getInitials = (name: string): string => {
  if (!name) return '?';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

/**
 * Check if a string is empty or null.
 */
export const isEmpty = (value: string | null | undefined): boolean => {
  return value === null || value === undefined || value.trim() === '';
};

/**
 * Get random color from a list of nice colors.
 */
export const getRandomColor = (seed?: string): string => {
  const colors = [
    '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6',
    '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4',
  ];
  
  if (seed) {
    const index = seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  }
  
  return colors[Math.floor(Math.random() * colors.length)];
};

/**
 * Delay execution (useful for testing).
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Copy text to clipboard.
 */
export const copyToClipboard = (text: string): Promise<void> => {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  
  // Fallback
  return new Promise((resolve, reject) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      resolve();
    } catch (error) {
      reject(error);
    }
  });
};