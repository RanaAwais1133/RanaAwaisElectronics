export interface User {
  id: string;
  username: string;
  role: 'admin' | 'manager' | 'staff';
  displayName?: string;
  displayNameUr?: string;
  phone?: string;
}

export interface Customer {
  id: string;
  name: string;
  nameUrdu: string;
  fatherName?: string;
  father_name?: string;
  fatherNameUrdu?: string;
  father_name_urdu?: string;
  phone: string;
  cnic: string;
  address: string;
  addressUrdu: string;
  residential?: string;
  occupant?: string;
  residentialAddress?: string;
  officeAddress?: string;
  accountNo?: string;
  costNo?: string;
  processNo?: string;
  reprAsCost?: string;
  reprAsGar?: string;
  prepAC?: string;
  guarantorIds?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Guarantor {
  id: string;
  name: string;
  nameUrdu: string;
  fatherName?: string;
  father_name?: string;
  fatherNameUrdu?: string;
  father_name_urdu?: string;
  phone: string;
  officePhone?: string;
  cnic: string;
  address?: string;
  officeAddress?: string;
  occupation?: string;
  relation: string;
  customerId: string;
  verificationStatus?: 'pending' | 'verified' | 'rejected';
}

export interface Product {
  id: string;
  name: string;
  nameUrdu: string;
  price: number;
  purchasePrice?: number;
  category: string;
  description?: string;
  in_stock: boolean;
  stockCount?: number;
  company?: string;
  companyUrdu?: string;
  sku?: string;
}

export interface InstallmentPlan {
  id?: string;
  customerId: string;
  productId: string;
  inventoryItemId?: string;
  totalAmount: number;
  downPayment: number;
  remainingAmount: number;
  numInstallments: number;
  installmentAmount: number;
  startDate: string;
  endDate: string;
  gracePeriodDays: number;
  finePerDay: number;
  status?: 'active' | 'completed' | 'defaulted' | 'overdue';
  createdBy?: string;
  schedule: InstallmentDetail[];
  // Product details
  serialNumber?: string;
  imei?: string;
  engineNo?: string;
  chassisNo?: string;
  model?: string;
  color?: string;
  company?: string;
  // Additional plan fields
  advanceAmount?: number;
  advanceReceived?: number;
  processFee?: number;
  discount?: number;
  salaryIncome?: number;
  defaulter?: string;
  pto?: string;
  vpnStatus?: string;
  employeeStatus?: string;
  dbmRemarks?: string;
  crcRemarks?: string;
  processAt?: string;
  doOfficer?: string;
  markOff?: string;
  debtMng?: string;
  secondMng?: string;
  inspOff?: string;
  srm?: string;
  mobilePhone?: string;
  crc?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface InstallmentDetail {
  installmentNo: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  partialPaid?: number;
  remaining?: number;
  fine?: number;
  finePerDay?: number;
  daysLate?: number;
  fineApplied?: number;
  totalPayable?: number;
  paidDate?: string;
  collectedBy?: string;
  collectedById?: string;
  remarks?: string;
}

export interface Payment {
  id: string;
  planId: string;
  installmentNo: number;
  amount: number;
  amountWithoutFine?: number;
  finePaid?: number;
  method: string;
  receiptNumber?: string;
  transactionDate: string;
  paymentDate?: string;
  collectedBy?: string;
  collectedById?: string;
  recoveryOfficer?: string;
  remarks?: string;
  isFullPayment?: boolean;
}

export interface InventoryItem {
  id: string;
  productId: string;
  serialNumber?: string;
  color?: string;
  model?: string;
  engineNo?: string;
  chassisNo?: string;
  imei?: string;
  company?: string;
  status: 'in_stock' | 'sold' | 'returned';
  purchaseDate: string;
  purchasePrice: number;
  sellingPrice?: number;
  soldDate?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccountingEntry {
  id: string;
  type: 'revenue' | 'expense' | 'profit' | 'fine';
  basis: 'sale' | 'payment' | 'fine' | 'expense';
  amount: number;
  description?: string;
  relatedPlanId?: string;
  relatedPaymentId?: string;
  fineAmount?: number;
  date: string;
  createdAt?: string;
}

export interface Notification {
  id: string;
  customerId: string;
  installmentPlanId?: string;
  channel: 'sms' | 'whatsapp' | 'email';
  messageEn: string;
  messageUr: string;
  sentAt?: string;
  status: 'sent' | 'failed' | 'pending';
  fineAmount?: number;
  createdAt?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId?: string;
  userId?: string;
  timestamp: string;
  details?: string;
}

export interface Receipt {
  id: string;
  paymentId: string;
  planId?: string;
  receiptNumber: string;
  headerEn: string;
  headerUr: string;
  bodyEn: string;
  bodyUr: string;
  totalAmount: number;
  fineAmount?: number;
  printedAt?: string;
  createdAt?: string;
}