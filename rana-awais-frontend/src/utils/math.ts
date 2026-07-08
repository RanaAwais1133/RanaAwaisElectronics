/**
 * Math utility functions for consistent rounding across the application
 */

/**
 * Round to 2 decimal places (paise/cents precision)
 */
export const roundTo2 = (val: number): number => {
  return Math.round(val * 100) / 100;
};

/**
 * Round to 0 decimal places (integer)
 */
export const roundTo0 = (val: number): number => {
  return Math.round(val);
};

/**
 * Round to N decimal places
 */
export const roundToN = (val: number, n: number): number => {
  const pow = Math.pow(10, n);
  return Math.round(val * pow) / pow;
};

/**
 * Round money value to 2 decimal places
 */
export const roundMoney = (val: number): number => {
  return roundTo2(val);
};

/**
 * Format a number as currency (Rs. X,XXX.XX)
 */
export const formatCurrency = (val: number | undefined | null): string => {
  if (val == null || isNaN(val)) return 'Rs. 0';
  return `Rs. ${roundMoney(val).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

/**
 * Format a number with commas
 */
export const formatNumber = (val: number | undefined | null): string => {
  if (val == null || isNaN(val)) return '0';
  return roundTo0(val).toLocaleString();
};

/**
 * Safe parse float - returns 0 for invalid values
 */
export const safeParseFloat = (val: any): number => {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
};

/**
 * Calculate percentage
 */
export const calcPercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return roundTo2((value / total) * 100);
};

/**
 * Sum an array of numbers
 */
export const sum = (values: number[]): number => {
  return roundMoney(values.reduce((acc, v) => acc + (v || 0), 0));
};

/**
 * Calculate installment amount per month
 */
export const calcInstallmentAmount = (remaining: number, numInstallments: number): number => {
  if (numInstallments <= 0) return 0;
  return roundMoney(remaining / numInstallments);
};

/**
 * Calculate fine amount
 */
export const calcFine = (
  amount: number,
  finePerDay: number,
  daysOverdue: number,
  gracePeriodDays = 0,
  fineType = 'per_day',
  fixedFineAmount = 0
): number => {
  if (daysOverdue <= gracePeriodDays) return 0;

  const overdueDays = daysOverdue - gracePeriodDays;

  switch (fineType) {
    case 'none':
      return 0;
    case 'fixed':
      return roundMoney(Math.min(fixedFineAmount, amount * 2));
    case 'both':
      return roundMoney(Math.min(fixedFineAmount + (overdueDays * finePerDay), amount * 2));
    default: // per_day
      return roundMoney(Math.min(overdueDays * finePerDay, amount * 2));
  }
};
