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
  serialNumber?: string;
  imei?: string;
  engineNo?: string;
  chassisNo?: string;
  model?: string;
  color?: string;
  company?: string;
}

export interface InstallmentDetail {
  installmentNo: number;
  dueDate: string;
  amount: number;
  paid: boolean;
  partialPaid?: number;
  remaining?: number;
  fine?: number;
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
  method: string;
  transactionDate: string;
  collectedBy?: string;
  collectedById?: string;
  remarks?: string;
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
}
