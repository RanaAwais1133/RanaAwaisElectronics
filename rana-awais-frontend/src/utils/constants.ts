export const APP_NAME = 'Rana Awais Electronics';
export const DATE_FORMAT = 'DD-MM-YYYY';
export const DEFAULT_PAGE_SIZE = 20;
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
export const API_URL = 'http://localhost:8080/api';

// Installment defaults
export const DEFAULT_GRACE_PERIOD_DAYS = 2;
export const DEFAULT_FINE_PER_DAY = 10;
export const MAX_FINE_MULTIPLIER = 2;

// Statuses
export const STATUS_ACTIVE = 'active';
export const STATUS_COMPLETED = 'completed';
export const STATUS_DEFAULTED = 'defaulted';

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'easypaisa', label: 'Easypaisa' },
];