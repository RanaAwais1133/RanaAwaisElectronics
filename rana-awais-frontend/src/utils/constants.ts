// ============================================================
// ✅ APP CONFIGURATION (Dynamic from .env)
// ============================================================

export const APP_NAME = process.env.REACT_APP_APP_NAME || 'MY_ERP';
export const APP_VERSION = process.env.REACT_APP_APP_VERSION || '1.0.0';
export const COMPANY_NAME = process.env.REACT_APP_COMPANY_NAME || 'MY ELECTRONICS';
export const COMPANY_NAME_UR = process.env.REACT_APP_COMPANY_NAME_UR || 'مائی الیکٹرانکس';
export const COMPANY_ADDRESS = process.env.REACT_APP_ADDRESS || 'Behari Colony, Disposal Chowk, Bismillah Service Station, Opposite Noor Super Store, Kacha Aiemanabad Road, Gujranwala';
export const COMPANY_ADDRESS_UR = process.env.REACT_APP_ADDRESS_UR || 'بہاری کالونی، ڈسپوزل چوک، بسم اللہ سروس اسٹیشن، نور سپر اسٹور کے سامنے، کچّہ ایمن آباد روڈ، گوجرانوالہ';
export const COMPANY_PHONES = [
  process.env.REACT_APP_PHONE_1 || '0324-9959800',
  process.env.REACT_APP_PHONE_2 || '0319-6429407',
  process.env.REACT_APP_PHONE_3 || '0318-7311277',
];
export const SOFTWARE_BY = process.env.REACT_APP_SOFTWARE_BY || 'Huzaifa (0313-6487199)';
export const SOFTWARE_BY_UR = process.env.REACT_APP_SOFTWARE_BY_UR || 'حذیفہ (0313-6487199)';
export const DATE_FORMAT = process.env.REACT_APP_DATE_FORMAT || 'DD-MM-YYYY';
export const DATE_FORMAT_DISPLAY = process.env.REACT_APP_DATE_FORMAT_DISPLAY || 'DD/MM/YYYY';
export const TIME_FORMAT = process.env.REACT_APP_TIME_FORMAT || 'HH:mm:ss';
export const DEFAULT_PAGE_SIZE = parseInt(process.env.REACT_APP_DEFAULT_PAGE_SIZE || '20', 10);
export const MAX_PAGE_SIZE = parseInt(process.env.REACT_APP_MAX_PAGE_SIZE || '1000', 10);

// ============================================================
// ✅ API CONFIGURATION (Dynamic from .env)
// ============================================================

export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api';
export const API_TIMEOUT = parseInt(process.env.REACT_APP_API_TIMEOUT || '30000', 10);

// ============================================================
// ✅ INSTALLMENT DEFAULTS (Dynamic from .env)
// ============================================================

export const DEFAULT_GRACE_PERIOD_DAYS = parseInt(process.env.REACT_APP_DEFAULT_GRACE_PERIOD || '2', 10);
export const DEFAULT_FINE_PER_DAY = parseFloat(process.env.REACT_APP_DEFAULT_FINE_PER_DAY || '10');
export const MAX_FINE_MULTIPLIER = parseFloat(process.env.REACT_APP_MAX_FINE_MULTIPLIER || '2');
export const DEFAULT_INSTALLMENT_MONTHS = parseInt(process.env.REACT_APP_DEFAULT_INSTALLMENT_MONTHS || '12', 10);
export const MAX_INSTALLMENT_MONTHS = parseInt(process.env.REACT_APP_MAX_INSTALLMENT_MONTHS || '60', 10);
export const MIN_INSTALLMENT_MONTHS = parseInt(process.env.REACT_APP_MIN_INSTALLMENT_MONTHS || '1', 10);

// ============================================================
// ✅ STATUSES
// ============================================================

export const STATUSES = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  DEFAULTED: 'defaulted',
  OVERDUE: 'overdue',
  PENDING: 'pending',
  CANCELLED: 'cancelled',
} as const;

export type Status = typeof STATUSES[keyof typeof STATUSES];

export const STATUS_LABELS: Record<Status, { en: string; ur: string }> = {
  [STATUSES.ACTIVE]: { en: 'Active', ur: 'فعال' },
  [STATUSES.COMPLETED]: { en: 'Completed', ur: 'مکمل' },
  [STATUSES.DEFAULTED]: { en: 'Defaulted', ur: 'ڈیفالٹ' },
  [STATUSES.OVERDUE]: { en: 'Overdue', ur: 'تاخیر شدہ' },
  [STATUSES.PENDING]: { en: 'Pending', ur: 'زیر التواء' },
  [STATUSES.CANCELLED]: { en: 'Cancelled', ur: 'منسوخ' },
};

export const STATUS_COLORS: Record<Status, string> = {
  [STATUSES.ACTIVE]: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  [STATUSES.COMPLETED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  [STATUSES.DEFAULTED]: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  [STATUSES.OVERDUE]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  [STATUSES.PENDING]: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  [STATUSES.CANCELLED]: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

// ============================================================
// ✅ PAYMENT METHODS
// ============================================================

export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash', labelUr: 'نقد' },
  { value: 'bank_transfer', label: 'Bank Transfer', labelUr: 'بینک ٹرانسفر' },
  { value: 'jazzcash', label: 'JazzCash', labelUr: 'جاز کیش' },
  { value: 'easypaisa', label: 'Easypaisa', labelUr: 'ایزی پیسا' },
] as const;

export type PaymentMethod = typeof PAYMENT_METHODS[number]['value'];

// ============================================================
// ✅ ROLES
// ============================================================

export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  STAFF: 'staff',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<Role, { en: string; ur: string }> = {
  [ROLES.ADMIN]: { en: 'Admin', ur: 'ایڈمن' },
  [ROLES.MANAGER]: { en: 'Manager', ur: 'مینیجر' },
  [ROLES.STAFF]: { en: 'Staff', ur: 'اسٹاف' },
};

export const ROLE_COLORS: Record<Role, string> = {
  [ROLES.ADMIN]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  [ROLES.MANAGER]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  [ROLES.STAFF]: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
};

export const ALLOWED_ROLES = Object.values(ROLES);

// ============================================================
// ✅ INVENTORY STATUSES
// ============================================================

export const INVENTORY_STATUSES = {
  IN_STOCK: 'in_stock',
  SOLD: 'sold',
  RETURNED: 'returned',
} as const;

export type InventoryStatus = typeof INVENTORY_STATUSES[keyof typeof INVENTORY_STATUSES];

export const INVENTORY_STATUS_LABELS: Record<InventoryStatus, { en: string; ur: string }> = {
  [INVENTORY_STATUSES.IN_STOCK]: { en: 'In Stock', ur: 'اسٹاک میں' },
  [INVENTORY_STATUSES.SOLD]: { en: 'Sold', ur: 'فروخت' },
  [INVENTORY_STATUSES.RETURNED]: { en: 'Returned', ur: 'واپس' },
};

export const INVENTORY_STATUS_COLORS: Record<InventoryStatus, string> = {
  [INVENTORY_STATUSES.IN_STOCK]: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  [INVENTORY_STATUSES.SOLD]: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  [INVENTORY_STATUSES.RETURNED]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
};

// ============================================================
// ✅ GUARANTOR VERIFICATION STATUS
// ============================================================

export const GUARANTOR_STATUSES = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
} as const;

export type GuarantorStatus = typeof GUARANTOR_STATUSES[keyof typeof GUARANTOR_STATUSES];

// ============================================================
// ✅ PERIODS
// ============================================================

export const PERIODS = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export type Period = typeof PERIODS[keyof typeof PERIODS];

export const PERIOD_DAYS: Record<Period, number> = {
  [PERIODS.DAILY]: 1,
  [PERIODS.WEEKLY]: 7,
  [PERIODS.MONTHLY]: 30,
};

export const PERIOD_LABELS: Record<Period, { en: string; ur: string }> = {
  [PERIODS.DAILY]: { en: 'Daily', ur: 'یومیہ' },
  [PERIODS.WEEKLY]: { en: 'Weekly', ur: 'ہفتہ وار' },
  [PERIODS.MONTHLY]: { en: 'Monthly', ur: 'ماہانہ' },
};

// ============================================================
// ✅ CURRENCY
// ============================================================

export const CURRENCY_SYMBOL = 'Rs';
export const CURRENCY_CODE = 'PKR';
export const CURRENCY_LOCALE = 'en-PK';

// ============================================================
// ✅ HELPERS
// ============================================================

export const getStatusLabel = (status: Status, isUrdu = false): string => {
  const label = STATUS_LABELS[status];
  return label ? (isUrdu ? label.ur : label.en) : status;
};

export const getStatusColor = (status: Status): string => {
  return STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};

export const getRoleLabel = (role: Role, isUrdu = false): string => {
  const label = ROLE_LABELS[role];
  return label ? (isUrdu ? label.ur : label.en) : role;
};

export const getRoleColor = (role: Role): string => {
  return ROLE_COLORS[role] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};

export const getPaymentMethodLabel = (method: PaymentMethod, isUrdu = false): string => {
  const found = PAYMENT_METHODS.find(m => m.value === method);
  return found ? (isUrdu ? found.labelUr : found.label) : method;
};

export const getInventoryStatusLabel = (status: InventoryStatus, isUrdu = false): string => {
  const label = INVENTORY_STATUS_LABELS[status];
  return label ? (isUrdu ? label.ur : label.en) : status;
};

export const getInventoryStatusColor = (status: InventoryStatus): string => {
  return INVENTORY_STATUS_COLORS[status] || 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300';
};

export const getPeriodLabel = (period: Period, isUrdu = false): string => {
  const label = PERIOD_LABELS[period];
  return label ? (isUrdu ? label.ur : label.en) : period;
};

export const getPeriodDays = (period: Period): number => {
  return PERIOD_DAYS[period] || 1;
};