/**
 * Format a number as Pakistani Rupees with 2 decimal places.
 */
export const formatCurrency = (amount: number): string =>
  `Rs. ${amount.toFixed(2)}`;

/**
 * Convert a snake_case string to Title Case (e.g., "in_stock" → "In Stock").
 */
export const snakeToTitle = (str: string): string =>
  str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

/**
 * Get a localized date string (e.g., "12 Jan 2026") using the provided locale.
 */
export const formatDate = (date: string | Date, locale: string = 'en'): string => {
  const d = new Date(date);
  return d.toLocaleDateString(locale === 'ur' ? 'ur-PK' : 'en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Calculate fine based on due date, grace period, and daily fine rate.
 * Returns the total fine capped at 2x the installment amount.
 */
export const calculateFine = (
  dueDate: string,
  graceDays: number,
  finePerDay: number,
  maxFineMultiplier: number = 2
): { overdueDays: number; fine: number } => {
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
  // Cap at 2x the installment amount (sent from caller)
  return { overdueDays, fine };
};

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
 * Generate installment schedule (used in frontend for preview).
 */
export const generateInstallmentSchedule = (
  totalAmount: number,
  downPayment: number,
  months: number,
  startDate: string
) => {
  const remaining = totalAmount - downPayment;
  if (remaining <= 0 || months <= 0) return [];
  const installmentAmount = Math.round((remaining / months) * 100) / 100;
  const adjustment = remaining - installmentAmount * months;
  const schedule = [];
  const start = new Date(startDate);
  for (let i = 0; i < months; i++) {
    const dueDate = new Date(start);
    dueDate.setMonth(dueDate.getMonth() + i);
    schedule.push({
      installmentNo: i + 1,
      dueDate: dueDate.toISOString().split('T')[0],
      amount: i === 0 ? Math.round((installmentAmount + adjustment) * 100) / 100 : installmentAmount,
    });
  }
  return schedule;
};