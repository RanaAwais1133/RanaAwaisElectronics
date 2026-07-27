import { create } from 'zustand';
import api from '../utils/api';

export interface Supplier {
  id: string;
  name: string;
  nameUrdu?: string;
  phone?: string;
  officePhone?: string;
  cnic?: string;
  address?: string;
  company?: string;
  remarks?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Purchase {
  id: string;
  supplierId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentMode: string;
  dueDate?: string;
  status: string;
  remarks?: string;
  createdBy?: string;
  items?: PurchaseItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseItem {
  id?: string;
  productName: string;
  serialNumber?: string;
  imei?: string;
  chassisNo?: string;
  engineNo?: string;
  model?: string;
  color?: string;
  price: number;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  purchaseId?: string;
  amount: number;
  method: string;
  paymentDate: string;
  remarks?: string;
  createdBy?: string;
}

export interface SupplierPromise {
  id: string;
  supplierId: string;
  purchaseId?: string;
  amount: number;
  dueDate: string;
  paidAmount: number;
  status: string;
  remarks?: string;
}

interface SupplierState {
  suppliers: Supplier[];
  purchases: Purchase[];
  payments: SupplierPayment[];
  promises: SupplierPromise[];
  loading: boolean;

  fetchSuppliers: () => Promise<void>;
  createSupplier: (data: Partial<Supplier>) => Promise<Supplier | null>;
  updateSupplier: (id: string, data: Partial<Supplier>) => Promise<boolean>;
  deleteSupplier: (id: string) => Promise<boolean>;

  fetchPurchases: (supplierId?: string) => Promise<void>;
  createPurchase: (data: any) => Promise<Purchase | null>;

  fetchPayments: (supplierId?: string) => Promise<void>;
  createPayment: (data: any) => Promise<void>;

  fetchPromises: (status?: string) => Promise<void>;
  createPromise: (data: any) => Promise<void>;
  updatePromise: (id: string, data: any) => Promise<void>;
  fetchLedger: (supplierId: string) => Promise<any>;
}

export const useSupplierStore = create<SupplierState>()((set, get) => ({
  suppliers: [],
  purchases: [],
  payments: [],
  promises: [],
  loading: false,

  fetchSuppliers: async () => {
    try {
      const res = await api.get('/suppliers');
      const data = res.data?.data || res.data || [];
      set({ suppliers: Array.isArray(data) ? data : [] });
    } catch {}
  },

  createSupplier: async (data) => {
    try {
      const res = await api.post('/suppliers', data);
      get().fetchSuppliers();
      return res.data;
    } catch { return null; }
  },

  updateSupplier: async (id, data) => {
    try {
      await api.put(`/suppliers/${id}`, data);
      get().fetchSuppliers();
      return true;
    } catch { return false; }
  },

  deleteSupplier: async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      get().fetchSuppliers();
      return true;
    } catch { return false; }
  },

  fetchPurchases: async (supplierId) => {
    try {
      const params = supplierId ? `?supplierId=${supplierId}` : '';
      const res = await api.get(`/purchases${params}`);
      const data = res.data?.data || res.data || [];
      set({ purchases: Array.isArray(data) ? data : [] });
    } catch {}
  },

  createPurchase: async (data) => {
    try {
      const res = await api.post('/purchases', data);
      get().fetchPurchases();
      // ✅ Refresh products so new items appear in inventory
      try { 
        const { useProductStore } = await import('./useProductStore');
        useProductStore.getState().fetchProducts(true);
      } catch {}
      return res.data;
    } catch { return null; }
  },

  fetchPayments: async (supplierId) => {
    try {
      const params = supplierId ? `?supplierId=${supplierId}` : '';
      const res = await api.get(`/supplier-payments${params}`);
      const data = res.data?.data || res.data || [];
      set({ payments: Array.isArray(data) ? data : [] });
    } catch {}
  },

  createPayment: async (data) => {
    try {
      await api.post('/supplier-payments', data);
      get().fetchPayments();
    } catch {}
  },

  fetchPromises: async (status) => {
    try {
      const params = status ? `?status=${status}` : '';
      const res = await api.get(`/supplier-promises${params}`);
      const data = res.data?.data || res.data || [];
      set({ promises: Array.isArray(data) ? data : [] });
    } catch {}
  },

  createPromise: async (data) => {
    try {
      await api.post('/supplier-promises', data);
    } catch {}
  },

  updatePromise: async (id, data) => {
    try {
      await api.put(`/supplier-promises/${id}`, data);
      get().fetchPromises();
    } catch {}
  },

  fetchLedger: async (supplierId: string) => {
    try {
      const res = await api.get(`/suppliers/${supplierId}/ledger`);
      return res.data;
    } catch { return null; }
  },
}));
